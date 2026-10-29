// Production phase of a project from episodes received vs. total episodes.
// Single source for the management dashboard's Production Phases chart and the AI assistant.

export const PRODUCTION_PHASES = ["Pre Cast", "Pre Production", "Production Start"] as const;
export type ProductionPhase = (typeof PRODUCTION_PHASES)[number];

const THRESHOLDS: Record<number, { preCast: number; preProduction: number; productionStart: number }> = {
  30: { preCast: 3, preProduction: 10, productionStart: 15 },
  50: { preCast: 8, preProduction: 18, productionStart: 25 },
};

export function getProductionPhase(totalEps: number | null, epsReceived: number): ProductionPhase | null {
  if (!totalEps || epsReceived === 0) return null;
  const t = THRESHOLDS[totalEps];
  if (!t) return null;
  if (epsReceived >= t.productionStart) return "Production Start";
  if (epsReceived >= t.preProduction) return "Pre Production";
  if (epsReceived >= t.preCast) return "Pre Cast";
  return null;
}
