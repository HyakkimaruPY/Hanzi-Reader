/* Motor compartilhado incremental das atividades de Prática.
 * Mantém as atividades existentes e adiciona um contrato comum para novas atividades.
 */
'use strict';

import { practiceAudioService } from './practice-audio-service.mjs';
import { practiceQuestionIcon, showPracticeHelp, showPracticeSummary } from './practice-ui.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const language = () => {
  const value = String(window.hzLang?.() || document.documentElement.lang || 'pt').toLowerCase();
  return value.startsWith('en') ? 'en' : value.startsWith('es') ? 'es' : 'pt';
};

const COPY = {
  pt: {
    title: 'Pares mínimos tonais', subtitle: 'Compare pronúncias muito próximas', category: 'Tons e escuta',
    back: 'Sair', help: 'Como jogar', finish: 'Concluir', listen: 'Ouvir o par', replay: 'Ouvir novamente', next: 'Próximo', result: 'Ver resultado',
    samePrompt: 'Os dois sons são iguais ou diferentes?', pairPrompt: 'Qual sequência de tons foi reproduzida?', hanziPrompt: 'Qual par de Hanzi corresponde ao áudio?',
    same: 'Iguais', different: 'Diferentes', correct: 'Correto. Compare a direção e a altura dos tons.', wrong: 'Não foi dessa vez. Ouça novamente e compare o par correto.',
    progress: 'desafios', hits: 'acertos', streak: 'sequência', accuracy: 'Precisão', done: 'Sessão concluída',
    summary: n => `Você concluiu ${n} desafio(s) de pares mínimos tonais.`, again: 'Nova sessão', backPractice: 'Voltar para Prática',
    statChallenges: 'Desafios', statHits: 'Acertos', statErrors: 'Erros', statBest: 'Maior sequência', statReplays: 'Repetições', statTime: 'Tempo',
    helpSummary: 'Ouça duas pronúncias próximas e identifique a diferença tonal sem depender do Pinyin visível.',
    helpTopics: [
      ['Objetivo', 'Treinar contrastes entre tons usando a mesma sílaba ou palavras muito próximas.'],
      ['Como responder', 'Use Iguais/Diferentes, escolha a sequência tonal ou selecione o par de Hanzi correspondente.'],
      ['Repetição', 'Você pode ouvir novamente antes de responder. A repetição é registrada apenas como métrica de apoio.'],
      ['Pontuação', 'A precisão é o fator principal; sequência de acertos e poucas repetições aumentam o score.'],
      ['Encerramento', 'Conclua a qualquer momento. O botão Voltar e a tecla Escape também abrem o resumo da sessão.']
    ]
  },
  en: {
    title: 'Tone minimal pairs', subtitle: 'Compare very similar pronunciations', category: 'Tones and listening',
    back: 'Exit', help: 'How to play', finish: 'Finish', listen: 'Play pair', replay: 'Play again', next: 'Next', result: 'View result',
    samePrompt: 'Are the two sounds the same or different?', pairPrompt: 'Which tone sequence was played?', hanziPrompt: 'Which Hanzi pair matches the audio?',
    same: 'Same', different: 'Different', correct: 'Correct. Compare the direction and pitch of the tones.', wrong: 'Not this time. Listen again and compare with the correct pair.',
    progress: 'challenges', hits: 'correct', streak: 'streak', accuracy: 'Accuracy', done: 'Session complete',
    summary: n => `You completed ${n} tone minimal-pair challenge(s).`, again: 'New session', backPractice: 'Back to Practice',
    statChallenges: 'Challenges', statHits: 'Correct', statErrors: 'Mistakes', statBest: 'Best streak', statReplays: 'Replays', statTime: 'Time',
    helpSummary: 'Listen to two close pronunciations and identify the tonal contrast without relying on visible Pinyin.',
    helpTopics: [
      ['Goal', 'Train contrasts between tones using the same syllable or very similar words.'],
      ['How to answer', 'Use Same/Different, choose the tone sequence, or select the matching Hanzi pair.'],
      ['Replay', 'You may replay before answering. Replays are recorded only as a supporting metric.'],
      ['Scoring', 'Accuracy is the main factor; streaks and fewer replays improve the score.'],
      ['Finish', 'Finish at any time. Back and Escape also open the session summary.']
    ]
  },
  es: {
    title: 'Pares mínimos tonales', subtitle: 'Compara pronunciaciones muy próximas', category: 'Tonos y escucha',
    back: 'Salir', help: 'Cómo jugar', finish: 'Concluir', listen: 'Escuchar el par', replay: 'Escuchar de nuevo', next: 'Siguiente', result: 'Ver resultado',
    samePrompt: '¿Los dos sonidos son iguales o diferentes?', pairPrompt: '¿Qué secuencia de tonos se reprodujo?', hanziPrompt: '¿Qué par de Hanzi corresponde al audio?',
    same: 'Iguales', different: 'Diferentes', correct: 'Correcto. Compara la dirección y la altura de los tonos.', wrong: 'Esta vez no. Escucha de nuevo y compara el par correcto.',
    progress: 'desafíos', hits: 'aciertos', streak: 'racha', accuracy: 'Precisión', done: 'Sesión concluida',
    summary: n => `Completaste ${n} desafío(s) de pares mínimos tonales.`, again: 'Nueva sesión', backPractice: 'Volver a Práctica',
    statChallenges: 'Desafíos', statHits: 'Aciertos', statErrors: 'Errores', statBest: 'Mayor racha', statReplays: 'Repeticiones', statTime: 'Tiempo',
    helpSummary: 'Escucha dos pronunciaciones próximas e identifica el contraste tonal sin depender del Pinyin visible.',
    helpTopics: [
      ['Objetivo', 'Entrenar contrastes entre tonos usando la misma sílaba o palabras muy próximas.'],
      ['Cómo responder', 'Usa Iguales/Diferentes, elige la secuencia tonal o selecciona el par de Hanzi.'],
      ['Repetición', 'Puedes escuchar de nuevo antes de responder. Las repeticiones se registran solo como métrica.'],
      ['Puntuación', 'La precisión es el factor principal; las rachas y menos repeticiones aumentan la puntuación.'],
      ['Finalizar', 'Concluye cuando quieras. Volver y Escape también abren el resumen.']
    ]
  }
};
const copy = () => COPY[language()] || COPY.pt;

export class PracticeActivityRegistry {
  constructor() { this.activities = new Map(); }
  register(definition) {
    if (!definition?.id || typeof definition.mount !== 'function') throw new TypeError('Atividade inválida');
    this.activities.set(definition.id, Object.freeze({ ...definition }));
    return () => this.activities.delete(definition.id);
  }
  get(id) { return this.activities.get(id) || null; }
  list() { return [...this.activities.values()]; }
  mount(id, root, context = {}) {
    const activity = this.get(id);
    if (!activity) throw new Error(`Atividade não registrada: ${id}`);
    return activity.mount(root, context);
  }
}

export class PracticeScoreCalculator {
  static calculate({ correct = 0, total = 0, bestStreak = 0, replays = 0 } = {}) {
    const accuracy = total ? correct / total : 0;
    const streakBonus = total ? Math.min(12, (bestStreak / total) * 12) : 0;
    const replayPenalty = total ? Math.min(8, (replays / total) * 3) : 0;
    return Math.max(0, Math.min(100, Math.round(accuracy * 88 + streakBonus - replayPenalty)));
  }
}

export class PracticeSessionController {
  constructor(activityId, { target = 8 } = {}) {
    this.activityId = activityId;
    this.target = target;
    this.startedAt = Date.now();
    this.correct = 0;
    this.total = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.replays = 0;
    this.answers = [];
    this.finished = false;
  }
  replay() { this.replays++; }
  answer(challenge, selected, correct) {
    if (this.finished) return this.snapshot();
    this.total++;
    if (correct) { this.correct++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
    else this.streak = 0;
    this.answers.push({ id: challenge.id, mode: challenge.mode, selected, expected: challenge.correctKey, correct, at: Date.now() });
    if (this.answers.length > 80) this.answers.splice(0, this.answers.length - 80);
    return this.snapshot();
  }
  get complete() { return this.total >= this.target; }
  snapshot() {
    const durationMs = Math.max(0, Date.now() - this.startedAt);
    const percent = this.total ? Math.round(this.correct / this.total * 100) : 0;
    return {
      activityId: this.activityId, target: this.target, total: this.total, correct: this.correct,
      errors: this.total - this.correct, streak: this.streak, bestStreak: this.bestStreak,
      replays: this.replays, percent, durationMs,
      score: PracticeScoreCalculator.calculate({ correct: this.correct, total: this.total, bestStreak: this.bestStreak, replays: this.replays }),
      answers: this.answers.slice(-24)
    };
  }
  async persist(reason = 'finish') {
    if (this.finished) return this.snapshot();
    this.finished = true;
    const snapshot = { ...this.snapshot(), endedBy: reason, at: Date.now() };
    try {
      const repository = window.hzStore?.repositories?.PracticeRepository;
      if (repository?.saveSession) await repository.saveSession(this.activityId, snapshot);
      else await window.hzStore?.saveSession?.(this.activityId, snapshot);
    } catch {}
    return snapshot;
  }
}

export class PracticeChallengeProvider {
  constructor(factory, { historyLimit = 12 } = {}) {
    if (typeof factory !== 'function') throw new TypeError('Factory de desafio obrigatória');
    this.factory = factory;
    this.historyLimit = historyLimit;
    this.history = [];
  }
  next(index = 0) {
    let challenge = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      challenge = this.factory(index, this.history);
      if (!this.history.includes(challenge.id)) break;
    }
    this.history.push(challenge.id);
    this.history = this.history.slice(-this.historyLimit);
    return challenge;
  }
}

const TONE_GROUPS = [
  [
    { id: 'ma1', hanzi: '妈', pinyin: 'mā', tone: 1 }, { id: 'ma2', hanzi: '麻', pinyin: 'má', tone: 2 },
    { id: 'ma3', hanzi: '马', pinyin: 'mǎ', tone: 3 }, { id: 'ma4', hanzi: '骂', pinyin: 'mà', tone: 4 }, { id: 'ma5', hanzi: '吗', pinyin: 'ma', tone: 5 }
  ],
  [
    { id: 'shi1', hanzi: '诗', pinyin: 'shī', tone: 1 }, { id: 'shi2', hanzi: '十', pinyin: 'shí', tone: 2 },
    { id: 'shi3', hanzi: '史', pinyin: 'shǐ', tone: 3 }, { id: 'shi4', hanzi: '是', pinyin: 'shì', tone: 4 }
  ],
  [
    { id: 'yi1', hanzi: '一', pinyin: 'yī', tone: 1 }, { id: 'yi2', hanzi: '姨', pinyin: 'yí', tone: 2 },
    { id: 'yi3', hanzi: '椅', pinyin: 'yǐ', tone: 3 }, { id: 'yi4', hanzi: '意', pinyin: 'yì', tone: 4 }
  ],
  [
    { id: 'tang1', hanzi: '汤', pinyin: 'tāng', tone: 1 }, { id: 'tang2', hanzi: '糖', pinyin: 'táng', tone: 2 },
    { id: 'tang3', hanzi: '躺', pinyin: 'tǎng', tone: 3 }, { id: 'tang4', hanzi: '烫', pinyin: 'tàng', tone: 4 }
  ]
];
const randomFrom = list => list[Math.floor(Math.random() * list.length)];
const shuffle = list => list.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(row => row.value);
const pairKey = (left, right) => `${left.tone}-${right.tone}`;
const pairLabel = (left, right, revealPinyin = false) => revealPinyin ? `${left.hanzi} ${left.pinyin} · ${right.hanzi} ${right.pinyin}` : `${left.hanzi} · ${right.hanzi}`;

function distinctPair(group, forceSame = false) {
  const left = randomFrom(group);
  const right = forceSame ? left : randomFrom(group.filter(item => item.id !== left.id));
  return { left, right };
}
function tonePairOptions(group, correct) {
  const keys = new Set([pairKey(correct.left, correct.right)]);
  const options = [{ key: pairKey(correct.left, correct.right), label: `${correct.left.tone}º + ${correct.right.tone}º` }];
  while (options.length < 4) {
    const candidate = distinctPair(group, Math.random() < .15);
    const key = pairKey(candidate.left, candidate.right);
    if (keys.has(key)) continue;
    keys.add(key); options.push({ key, label: `${candidate.left.tone}º + ${candidate.right.tone}º` });
  }
  return shuffle(options);
}
function hanziPairOptions(group, correct) {
  const keys = new Set([`${correct.left.id}|${correct.right.id}`]);
  const options = [{ key: `${correct.left.id}|${correct.right.id}`, label: pairLabel(correct.left, correct.right) }];
  while (options.length < 4) {
    const candidate = distinctPair(group, Math.random() < .2);
    const key = `${candidate.left.id}|${candidate.right.id}`;
    if (keys.has(key)) continue;
    keys.add(key); options.push({ key, label: pairLabel(candidate.left, candidate.right) });
  }
  return shuffle(options);
}
function createMinimalPairChallenge(index) {
  const group = randomFrom(TONE_GROUPS);
  const mode = ['same-different', 'tone-pair', 'hanzi-pair'][index % 3];
  const pair = distinctPair(group, mode === 'same-different' && Math.random() < .38);
  let options, correctKey;
  if (mode === 'same-different') {
    correctKey = pair.left.id === pair.right.id ? 'same' : 'different';
    options = [{ key: 'same', label: copy().same }, { key: 'different', label: copy().different }];
  } else if (mode === 'tone-pair') {
    correctKey = pairKey(pair.left, pair.right); options = tonePairOptions(group, pair);
  } else {
    correctKey = `${pair.left.id}|${pair.right.id}`; options = hanziPairOptions(group, pair);
  }
  return { id: `${mode}:${pair.left.id}:${pair.right.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, mode, ...pair, options, correctKey };
}

function minimalPairIcon() {
  return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 32h8l8-9v18l-8-9H8z"/><path d="M40 32h8l8-9v18l-8-9h-8z"/><path d="M28 17c4 3 4 9 0 12M36 35c-4 3-4 9 0 12" opacity=".82"/><path d="M27 50h10M27 14h10" opacity=".4"/></svg>';
}
function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

class MinimalPairsActivity {
  constructor(root) {
    this.root = root;
    this.abort = new AbortController();
    this.session = new PracticeSessionController('tone-minimal-pairs', { target: 8 });
    this.provider = new PracticeChallengeProvider(index => createMinimalPairChallenge(index));
    this.challenge = null;
    this.answerLocked = false;
    this.playing = false;
    this.playToken = 0;
    this.ended = false;
  }
  mount() {
    const c = copy();
    this.root.innerHTML = `<section class="hzmp-game" aria-labelledby="hzmp-title">
      <header class="hzmp-head">
        <button type="button" class="hzmp-icon-button" data-action="exit" aria-label="${esc(c.back)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div><p>${esc(c.category)}</p><h1 id="hzmp-title">${esc(c.title)}</h1></div>
        <button type="button" class="hzmp-icon-button" data-action="help" aria-label="${esc(c.help)}">${practiceQuestionIcon()}</button>
      </header>
      <div class="hzmp-session" aria-live="polite">
        <span><b data-stat="done">0</b> ${esc(c.progress)}</span><span><b data-stat="hits">0</b> ${esc(c.hits)}</span><span><b data-stat="streak">0</b> ${esc(c.streak)}</span>
      </div>
      <main class="hzmp-card">
        <p class="hzmp-step" data-role="step"></p>
        <h2 data-role="prompt"></h2>
        <div class="hzmp-sound-mark" aria-hidden="true">${minimalPairIcon()}</div>
        <button type="button" class="hzmp-listen" data-action="listen"><span>${esc(c.listen)}</span></button>
        <div class="hzmp-options" data-role="options"></div>
        <div class="hzmp-feedback" data-role="feedback" aria-live="polite"></div>
        <button type="button" class="hzmp-next" data-action="next" hidden>${esc(c.next)}</button>
      </main>
      <footer class="hzmp-footer"><button type="button" data-action="finish">${esc(c.finish)}</button></footer>
    </section>`;
    this.root.addEventListener('click', event => this.onClick(event), { signal: this.abort.signal });
    this.nextChallenge();
    window.__hzPracticeFinish = reason => this.finish(reason || 'external');
    const seenKey = 'hzIntroSeen.toneMinimalPairs.v1';
    let seen = false; try { seen = localStorage.getItem(seenKey) === '1'; } catch {}
    if (!seen) {
      showPracticeHelp({
        firstRun: true, title: c.title, summary: c.helpSummary, iconHtml: minimalPairIcon(),
        topics: c.helpTopics.map(([title, detail]) => ({ title, detail })),
        onStart: () => { try { localStorage.setItem(seenKey, '1'); } catch {} void this.playCurrent(false); },
        onClose: reason => { if (reason !== 'start') window.hzBackToHub?.(); }
      });
    } else requestAnimationFrame(() => { void this.playCurrent(false); });
    return () => this.cleanup();
  }
  promptFor(mode) {
    const c = copy();
    return mode === 'same-different' ? c.samePrompt : mode === 'tone-pair' ? c.pairPrompt : c.hanziPrompt;
  }
  nextChallenge() {
    this.answerLocked = false;
    this.challenge = this.provider.next(this.session.total);
    const c = copy();
    $('[data-role="step"]', this.root).textContent = `${this.session.total + 1} / ${this.session.target}`;
    $('[data-role="prompt"]', this.root).textContent = this.promptFor(this.challenge.mode);
    const options = $('[data-role="options"]', this.root);
    options.replaceChildren(...this.challenge.options.map(option => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.answer = option.key; button.textContent = option.label;
      return button;
    }));
    $('[data-role="feedback"]', this.root).replaceChildren();
    const next = $('[data-action="next"]', this.root); next.hidden = true; next.textContent = c.next;
    const listen = $('[data-action="listen"]', this.root); listen.disabled = false; listen.querySelector('span').textContent = c.listen;
    this.syncStats();
  }
  syncStats() {
    const state = this.session.snapshot();
    $('[data-stat="done"]', this.root).textContent = state.total;
    $('[data-stat="hits"]', this.root).textContent = state.correct;
    $('[data-stat="streak"]', this.root).textContent = state.streak;
  }
  async playCurrent(countReplay = true) {
    if (!this.challenge || this.playing || this.ended) return;
    const token = ++this.playToken;
    if (countReplay) this.session.replay();
    this.playing = true;
    const button = $('[data-action="listen"]', this.root);
    button.disabled = true; button.classList.add('is-playing');
    try {
      practiceAudioService.cancelScope('tone-minimal-pairs');
      await practiceAudioService.speak(this.challenge.left.hanzi, { scope: 'tone-minimal-pairs', rate: .9, interrupt: true });
      if (token !== this.playToken || this.ended) return;
      await wait(260);
      await practiceAudioService.speak(this.challenge.right.hanzi, { scope: 'tone-minimal-pairs', rate: .9, interrupt: true });
    } catch (error) {
      if (error?.name !== 'AbortError') $('[data-role="feedback"]', this.root).textContent = language() === 'en' ? 'Audio unavailable. Try again.' : language() === 'es' ? 'Audio no disponible. Inténtalo de nuevo.' : 'Áudio indisponível. Tente novamente.';
    } finally {
      if (token === this.playToken && !this.ended) {
        this.playing = false; button.disabled = false; button.classList.remove('is-playing');
        button.querySelector('span').textContent = copy().replay;
      }
    }
  }
  answer(key) {
    if (this.answerLocked || !this.challenge || this.ended) return;
    this.answerLocked = true;
    const correct = key === this.challenge.correctKey;
    const state = this.session.answer(this.challenge, key, correct);
    const buttons = [...this.root.querySelectorAll('[data-answer]')];
    for (const button of buttons) {
      button.disabled = true;
      if (button.dataset.answer === this.challenge.correctKey) button.classList.add('is-correct');
      else if (button.dataset.answer === key) button.classList.add('is-wrong');
    }
    const feedback = $('[data-role="feedback"]', this.root);
    feedback.className = `hzmp-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
    feedback.innerHTML = `<strong>${esc(correct ? copy().correct : copy().wrong)}</strong><span>${esc(pairLabel(this.challenge.left, this.challenge.right, true))}</span>`;
    const next = $('[data-action="next"]', this.root);
    next.hidden = false; next.textContent = state.total >= state.target ? copy().result : copy().next;
    this.syncStats(); next.focus({ preventScroll: true });
  }
  showHelp() {
    const c = copy();
    showPracticeHelp({ title: c.title, summary: c.helpSummary, iconHtml: minimalPairIcon(), topics: c.helpTopics.map(([title, detail]) => ({ title, detail })) });
  }
  async finish(reason = 'finish') {
    if (this.ended) return;
    this.ended = true;
    this.playToken++;
    practiceAudioService.cancelScope('tone-minimal-pairs');
    const state = await this.session.persist(reason);
    const c = copy();
    showPracticeSummary({
      kicker: c.category, title: c.done, score: state.score, scoreLabel: String(state.score), percent: state.percent,
      accuracyLabel: c.accuracy, subtitle: c.summary(state.total),
      stats: [
        { label: c.statChallenges, value: state.total }, { label: c.statHits, value: state.correct },
        { label: c.statErrors, value: state.errors }, { label: c.statBest, value: state.bestStreak },
        { label: c.statReplays, value: state.replays }, { label: c.statTime, value: formatDuration(state.durationMs) }
      ],
      againLabel: c.again, backLabel: c.backPractice,
      onAgain: () => openMinimalPairs(), onBack: () => window.hzBackToHub?.(), onClose: () => window.hzBackToHub?.()
    });
  }
  onClick(event) {
    const answer = event.target.closest('[data-answer]');
    if (answer && this.root.contains(answer)) { this.answer(answer.dataset.answer); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'listen') void this.playCurrent(true);
    else if (action === 'help') this.showHelp();
    else if (action === 'exit' || action === 'finish') void this.finish(action);
    else if (action === 'next') {
      if (this.session.complete) void this.finish('complete');
      else { this.nextChallenge(); void this.playCurrent(false); }
    }
  }
  cleanup() {
    this.abort.abort(); this.playToken++; this.ended = true;
    practiceAudioService.cancelScope('tone-minimal-pairs');
    if (window.__hzPracticeFinish) window.__hzPracticeFinish = null;
  }
}

export const PracticeHelpDialog = Object.freeze({ show: showPracticeHelp });
export const PracticeSummaryDialog = Object.freeze({ show: showPracticeSummary });
export const PracticeAudioService = practiceAudioService;
export const PracticeProgressRepository = Object.freeze({
  saveSession: (type, payload) => window.hzStore?.repositories?.PracticeRepository?.saveSession?.(type, payload) || window.hzStore?.saveSession?.(type, payload),
  listSessions: (type, limit) => window.hzStore?.repositories?.PracticeRepository?.listSessions?.(type, limit) || window.hzStore?.listSessions?.(type, limit)
});
export const practiceActivityRegistry = new PracticeActivityRegistry();
practiceActivityRegistry.register({ id: 'tone-minimal-pairs', category: 'listening', mount: root => new MinimalPairsActivity(root).mount() });

function openMinimalPairs() {
  if (typeof window.hzMountPracticeActivity !== 'function') return;
  window.hzMountPracticeActivity('tone-minimal-pairs', root => practiceActivityRegistry.mount('tone-minimal-pairs', root));
}
function updateCardCopy(card) {
  const c = copy(), label = $('.hzp-lbl', card);
  if (label) label.innerHTML = `${esc(c.title)}<br><span class="hzp-sub">${esc(c.subtitle)}</span>`;
  card.setAttribute('aria-label', `${c.title}: ${c.subtitle}`);
}
function installCard() {
  if ($('#hzp-minimal-pairs')) { updateCardCopy($('#hzp-minimal-pairs')); return true; }
  const list = $('[data-hzle-skill="listening"] .hzle-practice-list');
  if (!list) return false;
  const card = document.createElement('button');
  card.type = 'button'; card.id = 'hzp-minimal-pairs'; card.className = 'hzp-card hzle-card';
  card.innerHTML = `<div class="hzp-ico">${minimalPairIcon()}</div><div class="hzp-lbl"></div><div class="hzp-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  updateCardCopy(card); card.addEventListener('click', openMinimalPairs);
  const sequence = $('#hzp-tone-sequence', list); sequence?.after(card) || list.appendChild(card);
  return true;
}

let installObserver = null;
function boot() {
  if (!installCard() && 'MutationObserver' in window) {
    installObserver = new MutationObserver(() => { if (installCard()) { installObserver.disconnect(); installObserver = null; } });
    installObserver.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('hz:lang-change', () => installCard(), { passive: true });
  window.addEventListener('pagehide', () => { installObserver?.disconnect(); installObserver = null; }, { once: true });
  document.documentElement.classList.add('hz-practice-engine-ready');
}

window.hzPracticeEngine = {
  registry: practiceActivityRegistry,
  open: openMinimalPairs,
  classes: { PracticeSessionController, PracticeActivityRegistry, PracticeScoreCalculator, PracticeChallengeProvider },
  services: { audio: PracticeAudioService, progress: PracticeProgressRepository, help: PracticeHelpDialog, summary: PracticeSummaryDialog }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
