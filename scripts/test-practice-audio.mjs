import assert from 'node:assert/strict';
import { analyzePcmBuffer, safeGainFor } from '../js/practice-audio-service.mjs';

function mockBuffer(amplitude, { clipped = false, seconds = .5 } = {}) {
  const sampleRate = 48000, length = Math.round(sampleRate * seconds);
  const data = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const envelope = index < 2400 || index > length - 1200 ? .08 : 1;
    data[index] = clipped && index % 19 === 0 ? 1 : Math.sin(index * .071) * amplitude * envelope;
  }
  return { numberOfChannels: 1, length, sampleRate, duration: seconds, getChannelData: () => data };
}

const quiet = analyzePcmBuffer(mockBuffer(.018));
const clear = analyzePcmBuffer(mockBuffer(.18));
const clipped = analyzePcmBuffer(mockBuffer(.95, { clipped: true }));
const quietGain = safeGainFor(quiet);
const clearGain = safeGainFor(clear);
const clippedGain = safeGainFor(clipped);

assert.ok(clear.gatedRms > quiet.gatedRms, 'RMS must distinguish a clear source from a quiet source');
assert.ok(clear.score > quiet.score, 'ranking must prefer useful loudness');
assert.ok(clipped.clipRatio > clear.clipRatio, 'clipping must be detected independently from peak');
assert.ok(quietGain > clearGain, 'quiet audio should receive more gain');
assert.ok(quietGain <= 3.2 && clippedGain <= 1, 'gain must remain bounded and protect clipped audio');

console.log(JSON.stringify({ quiet: { ...quiet, gain: quietGain }, clear: { ...clear, gain: clearGain }, clipped: { ...clipped, gain: clippedGain } }, null, 2));
