/* Áudio compartilhado das práticas: análise de loudness, ganho seguro e TTS sem corte. */
'use strict';

const META_KEY = 'hzPracticeAudioMeta.v1';
const MAX_META = 48;
const MAX_BUFFERS = 8;
const NETWORK_TIMEOUT_MS = 12000;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function analyzePcmBuffer(buffer) {
  if (!buffer?.numberOfChannels || !buffer.length) return { rms: 0, peak: 0, gatedRms: 0, noiseFloor: 0, snrDb: 0, usefulRatio: 0, clipRatio: 0, score: -1 };
  const sampleRate = buffer.sampleRate || 44100;
  const windowSize = Math.max(64, Math.round(sampleRate * .02));
  const windows = [];
  let peak = 0, sum = 0, count = 0, clipped = 0;
  for (let offset = 0; offset < buffer.length; offset += windowSize) {
    let windowSum = 0, windowCount = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = offset; i < Math.min(data.length, offset + windowSize); i += 2) {
        const value = Math.abs(data[i]);
        peak = Math.max(peak, value);
        sum += value * value;
        windowSum += value * value;
        if (value >= .985) clipped++;
        count++; windowCount++;
      }
    }
    if (windowCount) windows.push(Math.sqrt(windowSum / windowCount));
  }
  windows.sort((a, b) => a - b);
  const rms = count ? Math.sqrt(sum / count) : 0;
  const noiseFloor = windows.length ? windows[Math.floor((windows.length - 1) * .15)] : 0;
  const gate = Math.max(.003, noiseFloor * 2.8);
  const useful = windows.filter(value => value >= gate);
  const gatedRms = useful.length ? Math.sqrt(useful.reduce((total, value) => total + value * value, 0) / useful.length) : rms;
  const usefulRatio = windows.length ? useful.length / windows.length : 0;
  const snrDb = noiseFloor > 0 ? 20 * Math.log10(Math.max(gatedRms, 1e-6) / Math.max(noiseFloor, 1e-6)) : 48;
  const clipRatio = count ? clipped / count : 0;
  const score = gatedRms * (0.72 + Math.min(.28, usefulRatio * .35)) * clamp(snrDb / 24, .42, 1.12) * (clipRatio > .003 ? .55 : 1);
  return { rms, peak, gatedRms, noiseFloor, snrDb, usefulRatio, clipRatio, score };
}

export function safeGainFor(metrics, targetRms = .105) {
  if (!metrics || metrics.gatedRms <= 0 || metrics.peak <= 0) return 1;
  const byLoudness = targetRms / metrics.gatedRms;
  const byPeak = .94 / metrics.peak;
  return Number(clamp(Math.min(byLoudness, byPeak), .72, 3.2).toFixed(3));
}

class PracticeAudioService {
  constructor() {
    this.context = null;
    this.compressor = null;
    this.source = null;
    this.media = null;
    this.mediaUrl = '';
    this.generation = 0;
    this.controllers = new Map();
    this.meta = this.loadMeta();
    this.buffers = new Map();
    this.blobs = new Map();
    this.queue = Promise.resolve();
    this.pausedAt = 0;
    this.lastMetrics = null;
    this.pendingReject = null;
    this.activeScope = '';
    this.disposed = false;
  }
  loadMeta() {
    try {
      const rows = JSON.parse(sessionStorage.getItem(META_KEY) || '[]');
      return new Map(Array.isArray(rows) ? rows.filter(row => Array.isArray(row) && row.length === 2) : []);
    } catch { return new Map(); }
  }
  saveMeta() {
    const rows = [...this.meta.entries()].sort((a, b) => (b[1].used || 0) - (a[1].used || 0)).slice(0, MAX_META);
    this.meta = new Map(rows);
    try { sessionStorage.setItem(META_KEY, JSON.stringify(rows)); } catch {}
  }
  notifyActive(active, scope = this.activeScope || 'practice') {
    this.activeScope = active ? scope : '';
    try { window.dispatchEvent(new CustomEvent('hz:practice-audio-state', { detail: { active: Boolean(active), scope } })); } catch {}
  }
  audioContext() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      this.context = new Context({ latencyHint: 'interactive' });
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = .002;
      this.compressor.release.value = .16;
      this.compressor.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
  touchBuffer(key, buffer) {
    this.buffers.delete(key);
    this.buffers.set(key, buffer);
    while (this.buffers.size > MAX_BUFFERS) this.buffers.delete(this.buffers.keys().next().value);
  }
  async decode(data) {
    const context = this.audioContext();
    if (!context) throw new Error('Web Audio indisponível');
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
    return context.decodeAudioData(arrayBuffer.slice(0));
  }
  async analyzeUrl(url, { scope = 'practice' } = {}) {
    const cachedMeta = this.meta.get(url);
    const cachedBuffer = this.buffers.get(url);
    if (cachedMeta && cachedBuffer) { cachedMeta.used = Date.now(); return { url, buffer: cachedBuffer, metrics: cachedMeta }; }
    const controller = new AbortController();
    const set = this.controllers.get(scope) || new Set();
    set.add(controller); this.controllers.set(scope, set);
    const started = performance.now();
    const timeout = setTimeout(() => controller.abort(new DOMException('timeout de rede', 'TimeoutError')), NETWORK_TIMEOUT_MS);
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await this.decode(await response.arrayBuffer());
      const metrics = { ...analyzePcmBuffer(buffer), gain: 1, duration: buffer.duration, loadMs: Math.round(performance.now() - started), used: Date.now() };
      metrics.gain = safeGainFor(metrics);
      this.meta.set(url, metrics); this.saveMeta(); this.touchBuffer(url, buffer);
      return { url, buffer, metrics };
    } finally {
      clearTimeout(timeout);
      set.delete(controller);
      if (!set.size) this.controllers.delete(scope);
    }
  }
  async analyzeCandidates(urls, options = {}) {
    const unique = [...new Set((urls || []).filter(Boolean))].slice(0, 5);
    const results = await Promise.all(unique.map(url => this.analyzeUrl(url, options).catch(error => ({ url, error }))));
    return results.filter(item => item.buffer && item.metrics).sort((a, b) => b.metrics.score - a.metrics.score || b.metrics.gatedRms - a.metrics.gatedRms);
  }
  stopCurrent(reason = 'cancelled') {
    this.generation++;
    const reject = this.pendingReject; this.pendingReject = null;
    try { this.source?.stop(); } catch {}
    this.source = null;
    try { this.media?.pause(); } catch {}
    if (this.mediaUrl) { try { URL.revokeObjectURL(this.mediaUrl); } catch {} this.mediaUrl = ''; }
    this.media = null;
    if (reject) { try { reject(new DOMException(reason, 'AbortError')); } catch {} }
    this.notifyActive(false);
    this.lastMetrics = { ...(this.lastMetrics || {}), stopped: reason };
  }
  cancelScope(scope = 'practice') {
    for (const controller of this.controllers.get(scope) || []) { try { controller.abort(); } catch {} }
    this.controllers.delete(scope);
    this.stopCurrent('scope-cancelled');
  }
  cancel() {
    for (const scope of [...this.controllers.keys()]) this.cancelScope(scope);
    this.stopCurrent();
    try { speechSynthesis.cancel(); } catch {}
  }
  pause() {
    try { this.context?.suspend(); } catch {}
    try { this.media?.pause(); } catch {}
  }
  async resume() {
    if (this.media && this.media.paused) return this.media.play();
    return this.context?.resume();
  }
  playBuffer(buffer, { gain = 1, scope = 'practice', preRollMs = 0, metrics = null } = {}) {
    this.stopCurrent('replaced');
    const context = this.audioContext();
    if (!context) return Promise.reject(new Error('Web Audio indisponível'));
    const token = ++this.generation;
    return new Promise((resolve, reject) => {
      try {
        this.pendingReject = reject;
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        source.buffer = buffer;
        gainNode.gain.setValueAtTime(clamp(Number(gain) || 1, .5, 3.2), context.currentTime);
        source.connect(gainNode); gainNode.connect(this.compressor);
        this.source = source;
        this.notifyActive(true, scope);
        const started = performance.now();
        source.onended = () => {
          if (token !== this.generation) return;
          this.source = null;
          this.pendingReject = null;
          this.notifyActive(false, scope);
          this.lastMetrics = { ...(metrics || {}), gain: gainNode.gain.value, startLatencyMs: Math.round(performance.now() - started - buffer.duration * 1000), scope };
          resolve(true);
        };
        source.start(context.currentTime + Math.max(0, preRollMs) / 1000, 0);
      } catch (error) { reject(error); }
    });
  }
  async playBestNative(urls, { scope = 'tone-recognition' } = {}) {
    const ranked = await this.analyzeCandidates(urls, { scope });
    for (const candidate of ranked) {
      if (candidate.metrics.gatedRms < .0025 || candidate.metrics.peak < .012) continue;
      try { return await this.playBuffer(candidate.buffer, { gain: candidate.metrics.gain, scope, metrics: candidate.metrics }); } catch {}
    }
    for (const url of urls || []) {
      try { return await this.playMediaUrl(url, { scope }); } catch {}
    }
    throw new Error('Nenhuma source de áudio utilizável');
  }
  playMediaUrl(url, { scope = 'practice' } = {}) {
    this.stopCurrent('replaced');
    const token = ++this.generation;
    const audio = new Audio();
    this.media = audio; audio.preload = 'auto'; audio.src = url; audio.volume = 1;
    this.notifyActive(true, scope);
    try { window.curAudio = audio; } catch {}
    return new Promise((resolve, reject) => {
      this.pendingReject = reject;
      let settled = false;
      const cleanup = error => {
        if (settled || token !== this.generation) return;
        settled = true; clearTimeout(timer);
        this.pendingReject = null;
        audio.onended = audio.onerror = null;
        audio.removeEventListener('canplay', start);
        this.notifyActive(false, scope);
        error ? reject(error) : resolve(true);
      };
      const timer = setTimeout(() => cleanup(new Error('timeout de áudio')), 20000);
      audio.onended = () => cleanup();
      audio.onerror = () => cleanup(new Error('falha no áudio'));
      const start = () => { try { audio.currentTime = 0; } catch {} audio.play().catch(cleanup); };
      if (audio.readyState >= 3) start();
      else audio.addEventListener('canplay', start, { once: true });
      audio.load();
    });
  }
  key(text, options = {}) {
    let voice = '';
    try { const settings = window.v36GetSettings?.() || {}; voice = [settings.voice, settings.speed, settings.pitch, settings.style, options.rate].join('|'); } catch {}
    return `${voice}::${String(text || '').trim()}`;
  }
  trimBlobs() {
    if (this.blobs.size <= 20) return;
    [...this.blobs.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, this.blobs.size - 20).forEach(([key]) => this.blobs.delete(key));
  }
  async getBlob(text, options = {}) {
    const clean = String(text || '').trim();
    if (!clean) throw new Error('Texto de áudio vazio');
    const key = this.key(clean, options), cached = this.blobs.get(key);
    if (cached) { cached.used = Date.now(); return cached.blob; }
    const build = window.hzEmotionBuildSsml || window.v36BuildSsmlAuto || window.h42BuildSsml || window.H46_buildSsml;
    const generate = window.hzEmotionAudioFromSsml || window.h42AudioFromSsml || window.H46_audioFromSsml;
    if (typeof build !== 'function' || typeof generate !== 'function') throw new Error('Motor de voz natural indisponível');
    const settings = window.v36GetSettings?.() || {};
    const blob = await generate(build(clean, settings), settings);
    if (!(blob instanceof Blob) || blob.size < 1) throw new Error('Resposta de áudio vazia');
    this.blobs.set(key, { blob, used: Date.now() }); this.trimBlobs();
    return blob;
  }
  prefetch(text, options = {}) { return this.getBlob(text, options).catch(() => null); }
  async playBlob(blob, { interrupt = true, scope = 'microsoft-tts' } = {}) {
    if (interrupt) this.stopCurrent('interrupted');
    try {
      const buffer = await this.decode(blob);
      const metrics = analyzePcmBuffer(buffer);
      const gain = safeGainFor(metrics, .095);
      // O pequeno agendamento técnico garante que o grafo esteja pronto. Nenhum
      // frame do arquivo é descartado e não existe fade-in sobre a primeira sílaba.
      return await this.playBuffer(buffer, { gain, scope, preRollMs: 18, metrics: { ...metrics, gain } });
    } catch {
      const url = URL.createObjectURL(blob);
      try { return await this.playMediaUrl(url, { scope }); }
      finally { try { URL.revokeObjectURL(url); } catch {} }
    }
  }
  speak(text, options = {}) {
    const run = async () => {
      try { return await this.playBlob(await this.getBlob(text, options), { interrupt: options.interrupt !== false, scope: options.scope || 'microsoft-tts' }); }
      catch (error) {
        if (error?.name === 'AbortError') throw error;
        return this.browserSpeak(text, options);
      }
    };
    this.queue = this.queue.catch(() => {}).then(run);
    return this.queue;
  }
  browserSpeak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) return reject(new Error('Síntese do navegador indisponível'));
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text || ''));
      utterance.lang = 'zh-CN'; utterance.rate = Number(options.rate) || .92;
      const scope = options.scope || 'browser-tts';
      this.notifyActive(true, scope);
      utterance.onend = () => { this.notifyActive(false, scope); resolve(true); };
      utterance.onerror = event => { this.notifyActive(false, scope); reject(event.error || new Error('Falha na síntese')); };
      speechSynthesis.speak(utterance);
    });
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
    this.controllers.clear();
    this.buffers.clear();
    this.blobs.clear();
    try { this.compressor?.disconnect(); } catch {}
    try { await this.context?.close?.(); } catch {}
    this.context = null; this.compressor = null; this.source = null; this.media = null;
    this.queue = Promise.resolve();
  }
  prepareToneGameDocument(html) {
    if (!html || html.includes('hzPracticeAudio.playBestNative')) return html;
    return html
      .replace(/function preloadChallenge\(ch\)\{[^\n]*\}/, `function preloadChallenge(ch){ch.syllables.forEach(syl=>{const urls=audioUrls(syl);try{parent.hzPracticeAudio?.analyzeCandidates(urls,{scope:'tone-recognition'}).catch(()=>{});}catch(e){urls.forEach(preloadUrl);}});}`)
      .replace(/async function playSyllable\(syl\)\{[\s\S]*?\n\s*return false;\n\s*\}/, `async function playSyllable(syl){\n    const urls=audioUrls(syl);\n    try{if(parent.hzPracticeAudio?.playBestNative)return await parent.hzPracticeAudio.playBestNative(urls,{scope:'tone-recognition'}); }catch(e){}\n    for(const url of hzRankSources(urls)){try{await playUrl(url);return true;}catch(e){}}\n    return false;\n  }`)
      .replace('</body>', `<script>addEventListener('pagehide',()=>{try{parent.hzPracticeAudio?.cancelScope('tone-recognition')}catch(e){}})<\/script></body>`);
  }
}

export const practiceAudioService = new PracticeAudioService();
if (typeof window !== 'undefined') {
  window.hzPracticeAudio = practiceAudioService;
  window.hzPrepareToneGameDoc = html => practiceAudioService.prepareToneGameDocument(html);
  window.addEventListener('pagehide', () => { void practiceAudioService.dispose(); }, { once: true });
}
