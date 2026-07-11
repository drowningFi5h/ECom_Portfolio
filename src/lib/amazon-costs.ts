/**
 * Shared box-cost calculation helpers for the Amazon Costs and Finance pages.
 *
 * Box cost formula:
 *   Area (in²) = [(H + B + 1) × (B + L + 1)] × 2
 *   Weight (g) = (Area × totalGsm) / 1550
 *   COGS       = (Weight_kg × ratePerKg) × 1.3   ← 30% overhead
 */

// Liner GSM options — ply count is parsed from SKU; total GSM is computed via calcTotalGsm()
export const GSM_LINER_OPTIONS = [140, 180] as const;
export type LinerGsm = typeof GSM_LINER_OPTIONS[number];

export const GSM_CONFIGS: Record<string, { label: string; linerGsm?: number; totalGsm?: number }> = {
  '140': { label: '140 GSM', linerGsm: 140 },
  '180': { label: '180 GSM', linerGsm: 180 },
  // Legacy keys — kept so saved Finance/Costs data doesn't break
  '150_3ply': { label: '150 GSM · 3-ply', totalGsm: 510  },
  '150_5ply': { label: '150 GSM · 5-ply', totalGsm: 870  },
  '150_7ply': { label: '150 GSM · 7-ply', totalGsm: 1230 },
  '180_3ply': { label: '180 GSM · 3-ply', totalGsm: 612  },
  '180_5ply': { label: '180 GSM · 5-ply', totalGsm: 1044 },
  '180_7ply': { label: '180 GSM · 7-ply', totalGsm: 1476 },
};

/**
 * Total board GSM from liner GSM × ply count.
 * 3-ply = 2 liners + 1 fluted medium (factor 1.4)  → multiplier 3.4
 * 5-ply = 3 liners + 2 flutes                      → multiplier 5.8
 * 7-ply = 4 liners + 3 flutes                      → multiplier 8.2
 * Verified: 180 × 3.4 = 612, × 5.8 = 1044, × 8.2 = 1476 (match legacy entries)
 */
export function calcTotalGsm(linerGsm: number, ply: number): number {
  const flutes = (ply - 1) / 2;
  const liners = (ply + 1) / 2;
  return linerGsm * (liners + flutes * 1.4);
}

/** Extract PLY count (3/5/7) from SKU — e.g. "3PL" → 3. Defaults to 3. */
export function parsePly(sku: string): number {
  const m = sku.match(/(\d)PL/i);
  const p = m ? parseInt(m[1]) : 3;
  return [3, 5, 7].includes(p) ? p : 3;
}

/**
 * Parse box dimensions (inches) from either SKU format:
 *   Old: AAA-3PLBrown01-T2-0400X0400X0400-PO010  → 4-digit ÷ 100 → 4×4×4
 *   New: IN-3PL-BR-06X05X03-PO035#...            → direct → 6×5×3
 */
export function parseSize(sku: string): { h: number; b: number; l: number } | null {
  const oldM = sku.match(/(\d{4})X(\d{4})X(\d{4})/i);
  if (oldM) {
    return { h: parseInt(oldM[1]) / 100, b: parseInt(oldM[2]) / 100, l: parseInt(oldM[3]) / 100 };
  }
  const newM = sku.split('#')[0].match(/(\d+)X(\d+)X(\d+)/i);
  if (newM) {
    return { h: parseInt(newM[1]), b: parseInt(newM[2]), l: parseInt(newM[3]) };
  }
  return null;
}

/**
 * Extract pack quantity from a product title.
 * Matches: "Pack of 5", "Set of 3", "Combo of 2", "Bundle of 10", "10 pcs ..."
 * Returns 1 if no pack phrase is found.
 */
export function parsePackQty(title: string | null | undefined): number {
  if (!title) return 1;
  const phrase = title.match(/(?:pack|set|combo|bundle|lot)\s+of\s+(\d+)/i);
  if (phrase) return Math.max(1, parseInt(phrase[1], 10));
  const leading = title.match(/^(\d+)\s+(?:pcs?|pieces?|boxes?|units?|nos?)/i);
  if (leading) return Math.max(1, parseInt(leading[1], 10));
  return 1;
}

/** Parse H×B×L inches from an SKU name (e.g. "ABC-2200x1800x1200" → 22×18×12). */
export function parseDims(sku: string): { h: number; b: number; l: number } | null {
  const m = sku.match(/(\d+)x(\d+)x(\d+)/i);
  if (!m) return null;
  return {
    h: parseInt(m[1]) / 100,
    b: parseInt(m[2]) / 100,
    l: parseInt(m[3]) / 100,
  };
}

export interface BoxCalc {
  areaSqIn: number;
  weightKg: number;
  cogs:     number;
}

export function calcBoxCost(
  h: number, b: number, l: number,
  totalGsm: number,
  ratePerKg: number,
): BoxCalc {
  const areaSqIn = ((h + b + 1) * (b + l + 1)) * 2;
  const weightG  = (areaSqIn * totalGsm) / 1550;
  const weightKg = weightG / 1000;
  const cogs     = weightKg * ratePerKg * 1.3;
  return { areaSqIn, weightKg, cogs };
}

/** Packer fee (labor paid to packing team) based on the order's SP slab. */
export function packerFee(sp: number): number {
  if (sp < 500)  return 28;
  if (sp < 1000) return 50;
  if (sp < 2500) return 80;
  if (sp < 4000) return 100;
  return 120;
}

/**
 * Amazon India variable closing fee (MFN/FBM standard schedule).
 * Fixed per-order charge based on SP slab.
 */
export function variableClosingFee(sp: number): number {
  if (sp <= 250)  return 5;
  if (sp <= 500)  return 10;
  if (sp <= 1000) return 20;
  return 25;
}

/**
 * Resolve effective dimensions for a SKU:
 * - Prefer saved overrides (box_h/b/l from amazon_product_costs)
 * - Fall back to auto-parsed from SKU name
 */
export function resolveDims(
  sku: string,
  overrideH: number | null,
  overrideB: number | null,
  overrideL: number | null,
): { h: number; b: number; l: number } | null {
  if (overrideH != null && overrideB != null && overrideL != null) {
    return { h: overrideH, b: overrideB, l: overrideL };
  }
  return parseDims(sku);
}

/**
 * Calculate the minimum selling price needed to achieve a target net margin.
 *
 * Solves iteratively because packer fee and closing fee are both step functions
 * of SP — so SP appears on both sides of the equation:
 *   SP = (COGS + shipping + packer(SP) + closing(SP)) / (1 - referral% - margin%)
 *
 * Converges in 4–6 iterations for typical Indian price ranges.
 * Returns null if the margin is geometrically impossible (referral% + margin% ≥ 100%).
 */
export function calcTargetSP(
  cogs:            number,
  shippingCost:    number,
  referralPct:     number,
  targetMarginPct: number,
): number | null {
  const varRate = (referralPct + targetMarginPct) / 100;
  if (varRate >= 1) return null;

  let sp = (cogs + shippingCost) / (1 - varRate);

  for (let i = 0; i < 10; i++) {
    const pf    = packerFee(sp);
    const cf    = variableClosingFee(sp);
    const newSp = (cogs + shippingCost + pf + cf) / (1 - varRate);
    if (Math.abs(newSp - sp) < 0.5) { sp = newSp; break; }
    sp = newSp;
  }

  return Math.ceil(sp); // round up — never sell below target
}

/** Full cost breakdown for a SKU given its cost config and the actual SP. */
export interface CostBreakdown {
  // Manufacturing
  weightKg:        number;
  cogs:            number;
  packerFee:       number;
  manufacturingTotal: number;
  // E-commerce fees
  referralFee:     number;
  closingFee:      number;
  shippingCost:    number;
  feesTotal:       number;
  // Summary
  totalCost:       number;
  netProfit:       number;
  marginPct:       number;
}

export function costBreakdown(
  sku:          string,
  gsmConfig:    string | null,
  ratePerKg:    number,
  boxH:         number | null,
  boxB:         number | null,
  boxL:         number | null,
  sp:           number,
  referralPct:  number = 5,
  shippingCost: number = 0,
): CostBreakdown | null {
  if (!gsmConfig || !(gsmConfig in GSM_CONFIGS)) return null;
  const dims = resolveDims(sku, boxH, boxB, boxL);
  if (!dims) return null;

  const cfg = GSM_CONFIGS[gsmConfig];
  const totalGsm = cfg.totalGsm ?? calcTotalGsm(cfg.linerGsm!, parsePly(sku));
  const { cogs, weightKg } = calcBoxCost(dims.h, dims.b, dims.l, totalGsm, ratePerKg);
  const pf           = packerFee(sp);
  const manufacturingTotal = cogs + pf;

  const referralFee  = (sp * referralPct) / 100;
  const closingFee   = variableClosingFee(sp);
  const feesTotal    = referralFee + closingFee + shippingCost;

  const totalCost    = manufacturingTotal + feesTotal;
  const netProfit    = sp - totalCost;
  const marginPct    = sp > 0 ? (netProfit / sp) * 100 : 0;

  return {
    weightKg, cogs, packerFee: pf, manufacturingTotal,
    referralFee, closingFee, shippingCost, feesTotal,
    totalCost, netProfit, marginPct,
  };
}
