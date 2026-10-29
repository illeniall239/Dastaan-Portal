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

/** Plain-language meaning of each phase, for the AI assistant's answers. */
export const PHASE_MEANING =
  "Phases come from how many episode scripts have been received (same rule as the management dashboard's Production Phases chart). " +
  "Pre Cast: enough episodes to start casting (3 of a 30-episode project, 8 of a 50-episode one). " +
  "Pre Production: enough to start preparing the shoot (10 of 30, 18 of 50). " +
  "Production Start: enough to start shooting, i.e. ready for production (15 of 30, 25 of 50). " +
  "No phase: fewer episodes than that yet, or an episode total other than 30 or 50.";
