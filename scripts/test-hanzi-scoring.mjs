import assert from 'node:assert/strict';
import { evaluateDrawing } from '../js/hanzi-writing.mjs';

const line = (start, end, points = 14) => Array.from({ length: points }, (_, index) => ({
  x: start[0] + (end[0] - start[0]) * index / (points - 1),
  y: start[1] + (end[1] - start[1]) * index / (points - 1)
}));
const options = { refSeqs: ['HS'], refCount: 2, canvasW: 300, canvasH: 300 };
const cases = {
  veryClose: [line([70, 90], [230, 90]), line([150, 70], [150, 230])],
  partial: [line([85, 105], [215, 105])],
  wrongOrder: [line([150, 70], [150, 230]), line([70, 90], [230, 90])],
  wrongCount: [line([70, 90], [230, 90]), line([150, 70], [150, 230]), line([60, 210], [240, 210])],
  veryFar: [line([250, 250], [280, 280])]
};
const results = Object.fromEntries(Object.entries(cases).map(([name, strokes]) => [name, evaluateDrawing(strokes, options)]));

for (const result of Object.values(results)) assert.ok(result.percent >= 0 && result.percent <= 100, 'score must remain in the 0–100 range');
assert.ok(results.veryClose.percent >= 90, 'very close writing should score highly');
assert.ok(results.partial.percent >= 25 && results.partial.percent <= 65, 'partial writing should remain in the middle range');
assert.ok(results.wrongOrder.parts.order < results.veryClose.parts.order && results.wrongOrder.percent < results.veryClose.percent, 'wrong order must reduce order and total score');
assert.ok(results.wrongCount.parts.count < 100 && results.wrongCount.percent < results.veryClose.percent, 'wrong stroke count must reduce the result');
assert.ok(results.veryFar.percent <= 35 && !results.veryFar.recognized, 'very distant writing must remain low and unrecognised');

console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([name, result]) => [name, { score: result.percent, parts: result.parts, recognized: result.recognized }])), null, 2));
