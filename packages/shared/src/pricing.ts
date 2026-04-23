// ---------------------------------------------------------------------------
// Model pricing definitions and cost calculation
// ---------------------------------------------------------------------------

export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-6": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cacheReadPerMillion: 1.5,
  },
  "claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
  },
  "claude-haiku-4-5": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
  },
};

/**
 * Calculate the estimated cost in USD for a given model and token counts.
 *
 * Falls back to the most expensive model (claude-opus-4-6) pricing when the
 * model is not found in the pricing table, so costs are never underestimated.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["claude-opus-4-6"];

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const cacheCost = (cacheTokens / 1_000_000) * pricing.cacheReadPerMillion;

  return inputCost + outputCost + cacheCost;
}
