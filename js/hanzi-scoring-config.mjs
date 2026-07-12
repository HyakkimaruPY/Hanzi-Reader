/* Configuração única da similaridade estimada da Escrita de Hanzi. */
'use strict';

export const HANZI_SCORING_CONFIG = Object.freeze({
  version: 2,
  weights: Object.freeze({
    order: 0.22,
    count: 0.16,
    direction: 0.17,
    position: 0.16,
    proportion: 0.13,
    shape: 0.16
  }),
  recognitionThreshold: 60,
  minimumStrokeLength: 4,
  penalties: Object.freeze({ severeOrder: 0.82, wrongCount: 0.9 }),
  naturalVariation: Object.freeze({
    centerTolerance: 0.36,
    fillTarget: 0.46,
    fillTolerance: 0.5,
    aspectTolerance: 1.45
  })
});

export function clampScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

export function weightedHanziScore(parts, config = HANZI_SCORING_CONFIG) {
  const total = Object.entries(config.weights).reduce((sum, [key, weight]) => {
    const part = Math.max(0, Math.min(100, Number(parts?.[key]) || 0));
    return sum + part * weight;
  }, 0);
  let adjusted = total;
  if ((Number(parts?.order) || 0) < 25) adjusted *= config.penalties.severeOrder;
  if ((Number(parts?.count) || 0) < 80) adjusted *= config.penalties.wrongCount;
  return clampScore(adjusted);
}
