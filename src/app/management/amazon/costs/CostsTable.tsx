'use client';

import { useState, useMemo, useTransition } from 'react';
import { Check, Loader2, AlertCircle, ChevronDown, ChevronUp, Package, ShoppingBag, Send, Copy } from 'lucide-react';
import { saveCost, updateAmazonPrice } from './actions';
import { GSM_CONFIGS, parseDims, calcBoxCost, calcTotalGsm, parsePly, packerFee, variableClosingFee, calcTargetSP, parsePackQty } from '@/lib/amazon-costs';

import type { FeeEstimate } from './page';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Row {
  seller_sku:      string;
  product_name:    string | null;
  listing_price:   number | null;
  fulfillable_qty: number | null;
  gsm_config:      string | null;
  rate_per_kg:     number;
  box_h:           number | null;
  box_b:           number | null;
  box_l:           number | null;
  pack_qty:        number | null;
  referral_pct:    number;
  shipping_cost:   number;
  feeEstimate:     FeeEstimate | null;
  size_key:        string | null;
  pack_qty_parsed: number;
}

// ── Amazon India Easy Ship rate card (2024, per kg slab × zone) ───────────────
// Source: Amazon India Easy Ship fee schedule (FBM sellers using Easy Ship)
// Rates are per shipment; zone = Local / Regional / National
const EASY_SHIP_RATES: { maxKg: number; local: number; regional: number; national: number }[] = [
  { maxKg: 0.5,  local:  49, regional:  74, national:  99 },
  { maxKg: 1.0,  local:  66, regional: 100, national: 133 },
  { maxKg: 2.0,  local:  97, regional: 148, national: 198 },
  { maxKg: 3.0,  local: 129, regional: 195, national: 262 },
  { maxKg: 5.0,  local: 161, regional: 242, national: 326 },
  { maxKg: 10.0, local: 209, regional: 316, national: 422 },
  { maxKg: 12.0, local: 258, regional: 390, national: 521 },
];

function easyShipRates(weightKg: number) {
  const tier = EASY_SHIP_RATES.find(t => weightKg <= t.maxKg)
    ?? EASY_SHIP_RATES[EASY_SHIP_RATES.length - 1];
  return tier;
}

const inr = (n: number, d = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── Table shell ───────────────────────────────────────────────────────────────

export default function CostsTable({
  rows, allSizes, allPacks,
}: {
  rows:     Row[];
  allSizes: string[];
  allPacks: number[];
}) {
  const [selSize, setSelSize] = useState('');
  const [selGsm,  setSelGsm]  = useState<'' | '140' | '180'>('');
  const [selPack, setSelPack] = useState('');

  const allReady = selSize !== '' && selGsm !== '' && selPack !== '';

  const availablePacks = useMemo(() => {
    if (!selSize) return allPacks;
    const s = new Set(rows.filter(r => r.size_key === selSize).map(r => r.pack_qty_parsed));
    return [...s].sort((a, b) => a - b);
  }, [rows, selSize, allPacks]);

  const filtered = useMemo(() => {
    if (!allReady) return [];
    const pack = parseInt(selPack);
    return rows.filter(r => r.size_key === selSize && r.pack_qty_parsed === pack);
  }, [rows, selSize, selPack, allReady]);

  const sel = (filled: boolean): React.CSSProperties => ({
    borderColor: filled ? 'var(--amz-teal)' : 'var(--amz-beige-border)',
    background:  filled ? 'var(--amz-teal-light)' : 'var(--amz-beige)',
    color:       filled ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal)',
  });

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>Size (inches)</label>
          <select value={selSize} onChange={e => { setSelSize(e.target.value); setSelGsm(''); setSelPack(''); }}
            className="text-sm rounded-xl border px-3 py-2.5 w-44 focus:outline-none focus:ring-2"
            style={sel(!!selSize)}>
            <option value="">— select size —</option>
            {allSizes.map(s => <option key={s} value={s}>{s}&Prime;</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>GSM</label>
          <select value={selGsm} disabled={!selSize}
            onChange={e => { setSelGsm(e.target.value as typeof selGsm); setSelPack(''); }}
            className="text-sm rounded-xl border px-3 py-2.5 w-32 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={sel(!!selGsm)}>
            <option value="">— GSM —</option>
            <option value="140">140</option>
            <option value="180">180</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>Pack</label>
          <select value={selPack} disabled={!selGsm}
            onChange={e => setSelPack(e.target.value)}
            className="text-sm rounded-xl border px-3 py-2.5 w-36 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={sel(!!selPack)}>
            <option value="">— pack qty —</option>
            {availablePacks.map(p => <option key={p} value={String(p)}>×{p} pcs</option>)}
          </select>
        </div>

        {allReady && (
          <div className="pb-0.5 text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--amz-charcoal)' }}>{filtered.length}</span>{' '}
            SKU{filtered.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Prompt */}
      {!allReady && (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center"
          style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Select {!selSize ? 'a size' : !selGsm ? 'a GSM' : 'a pack quantity'} to see matching SKUs
          </p>
        </div>
      )}

      {/* Results */}
      {allReady && (
        filtered.length === 0 ? (
          <div className="rounded-2xl border py-12 text-center"
            style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
            <p className="text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>
              No SKUs found for {selSize}&Prime; · ×{selPack} pcs
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">SKU</th>
                  <th className="text-left px-3 py-3.5">Dimensions</th>
                  <th className="text-left px-3 py-3.5" style={{ minWidth: 210 }}>GSM Config</th>
                  <th className="text-right px-3 py-3.5">Rate/kg</th>
                  <th className="text-right px-3 py-3.5">SP</th>
                  <th className="text-right px-3 py-3.5">Mfg cost</th>
                  <th className="text-right px-3 py-3.5">Net profit</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <SkuRow key={row.seller_sku} row={row} stripe={i % 2 !== 0} defaultConfig={selGsm} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function SkuRow({ row, stripe, defaultConfig }: { row: Row; stripe: boolean; defaultConfig?: string }) {
  const autoDims    = parseDims(row.seller_sku);
  const detectedQty = parsePackQty(row.product_name);
  const [expanded, setExpanded] = useState(false);

  const [config,   setConfig]   = useState(row.gsm_config ?? defaultConfig ?? '');
  const [rate,     setRate]     = useState(row.rate_per_kg ?? 60);
  const [refPct,   setRefPct]   = useState(row.referral_pct ?? 5);
  const [shipping, setShipping] = useState(row.shipping_cost ?? 0);
  // Use title-detected qty as default; only prefer saved value when it was explicitly set (> 1)
  const [packQty,  setPackQty]  = useState(row.pack_qty != null && row.pack_qty > 1 ? row.pack_qty : detectedQty);
  const [boxH,     setBoxH]     = useState<number | ''>(row.box_h ?? autoDims?.h ?? '');
  const [boxB,     setBoxB]     = useState<number | ''>(row.box_b ?? autoDims?.b ?? '');
  const [boxL,     setBoxL]     = useState<number | ''>(row.box_l ?? autoDims?.l ?? '');
  const [status,   setStatus]   = useState<'idle' | 'saved' | 'error'>('idle');
  const [errMsg,   setErrMsg]   = useState('');
  const [isPending, start]      = useTransition();

  const h = typeof boxH === 'number' ? boxH : null;
  const b = typeof boxB === 'number' ? boxB : null;
  const l = typeof boxL === 'number' ? boxL : null;

  const hasDims   = h !== null && b !== null && l !== null;
  const hasConfig = !!config && config in GSM_CONFIGS;
  const sp        = row.listing_price ?? 0;

  // Calculations — COGS is single-box cost × pack quantity
  const boxCalc    = hasDims && hasConfig
    ? (() => {
        const cfg = GSM_CONFIGS[config];
        const tGsm = cfg.totalGsm ?? calcTotalGsm(cfg.linerGsm!, parsePly(row.seller_sku));
        return calcBoxCost(h!, b!, l!, tGsm, rate);
      })()
    : null;
  const packCogs   = boxCalc ? boxCalc.cogs * packQty : null; // total material cost for the listing

  const pf         = sp > 0 ? packerFee(sp)         : null;
  const mfgTotal   = packCogs != null && pf != null ? packCogs + pf : null;
  const refFee     = sp > 0 ? (sp * refPct) / 100   : null;
  const closingFee = sp > 0 ? variableClosingFee(sp) : null;
  const feesTotal  = refFee != null && closingFee != null
    ? refFee + closingFee + shipping
    : null;
  const totalCost  = mfgTotal != null && feesTotal != null ? mfgTotal + feesTotal : null;
  const netProfit  = totalCost != null && sp > 0 ? sp - totalCost : null;
  const margin     = netProfit != null && sp > 0 ? (netProfit / sp) * 100 : null;

  const isDirty =
    config   !== (row.gsm_config    ?? '')           ||
    rate     !== (row.rate_per_kg   ?? 60)           ||
    refPct   !== (row.referral_pct  ?? 5)            ||
    shipping !== (row.shipping_cost ?? 0)            ||
    packQty  !== (row.pack_qty      ?? detectedQty)  ||
    (h ?? null) !== (row.box_h ?? autoDims?.h ?? null) ||
    (b ?? null) !== (row.box_b ?? autoDims?.b ?? null) ||
    (l ?? null) !== (row.box_l ?? autoDims?.l ?? null);

  function handleSave() {
    start(async () => {
      setErrMsg('');
      const res = await saveCost({
        seller_sku:    row.seller_sku,
        gsm_config:    config || null,
        rate_per_kg:   rate,
        box_h:         h,
        box_b:         b,
        box_l:         l,
        pack_qty:      packQty,
        referral_pct:  refPct,
        shipping_cost: shipping,
      });
      if (res.success) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        setStatus('error');
        setErrMsg(res.error ?? 'Save failed');
      }
    });
  }

  const rowBg = stripe ? 'var(--amz-cream)' : '#fff';

  return (
    <>
      {/* Main row */}
      <tr className="border-b" style={{ borderColor: 'var(--amz-beige)', background: rowBg }}>

        {/* SKU + product name */}
        <td className="px-5 py-3 max-w-[220px]">
          {row.product_name && (
            <p className="text-xs font-medium leading-snug mb-1" style={{ color: 'var(--amz-charcoal)' }}
              title={row.product_name}>
              {row.product_name.length > 60
                ? row.product_name.slice(0, 58) + '…'
                : row.product_name}
            </p>
          )}
          <p className="font-mono text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>{row.seller_sku}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Pack qty badge — editable */}
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: packQty > 1 ? '#dbeafe' : 'var(--amz-beige)', color: packQty > 1 ? '#1d4ed8' : 'var(--amz-charcoal-muted)' }}>
              ×
              <input
                type="number"
                value={packQty}
                min={1}
                step={1}
                title="Pack quantity (units per listing)"
                onChange={e => setPackQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-7 text-center bg-transparent focus:outline-none tabular-nums"
              />
              <span>pc{packQty !== 1 ? 's' : ''}</span>
              {detectedQty > 1 && packQty === detectedQty && (
                <span className="text-[9px] opacity-60">(auto)</span>
              )}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>
              {row.fulfillable_qty ?? 0} in stock
            </span>
          </div>
        </td>

        {/* Dimensions */}
        <td className="px-3 py-3">
          {autoDims && !row.box_h ? (
            <span className="text-xs tabular-nums" style={{ color: 'var(--amz-charcoal-soft)' }}>
              {autoDims.h}&Prime;×{autoDims.b}&Prime;×{autoDims.l}&Prime;
              <span className="ml-1 text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>(auto)</span>
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {([
                [boxH, setBoxH, 'H'],
                [boxB, setBoxB, 'B'],
                [boxL, setBoxL, 'L'],
              ] as [number | '', React.Dispatch<React.SetStateAction<number | ''>>, string][]).map(([val, set, label]) => (
                <input key={label} type="number" value={val} min={0} step={0.5} placeholder={label}
                  onChange={e => set(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-12 text-xs text-center rounded-lg border px-1 py-1 focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)', color: 'var(--amz-charcoal)' }} />
              ))}
              <span className="text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>in</span>
            </div>
          )}
        </td>

        {/* GSM config */}
        <td className="px-3 py-3">
          <select value={config} onChange={e => { setConfig(e.target.value); setStatus('idle'); }}
            className="text-xs rounded-lg border px-2 py-1.5 w-full focus:outline-none"
            style={{ borderColor: 'var(--amz-beige-border)', background: config ? '#fff' : 'var(--amz-beige)', color: config ? 'var(--amz-charcoal)' : 'var(--amz-charcoal-soft)' }}>
            <option value="">— select GSM —</option>
            <option value="140">140 GSM</option>
            <option value="180">180 GSM</option>
          </select>
        </td>

        {/* Rate/kg */}
        <td className="px-3 py-3 text-right">
          <input type="number" value={rate} min={1} step={1}
            onChange={e => setRate(parseFloat(e.target.value) || 60)}
            className="w-16 text-xs text-right rounded-lg border px-2 py-1.5 tabular-nums focus:outline-none"
            style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)', color: 'var(--amz-charcoal)' }} />
        </td>

        {/* SP */}
        <td className="px-3 py-3 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
          {sp > 0 ? `₹${sp.toLocaleString('en-IN')}` : '—'}
        </td>

        {/* Mfg cost */}
        <td className="px-3 py-3 text-right tabular-nums">
          {mfgTotal != null ? (
            <div>
              <span className="text-xs font-semibold" style={{ color: 'var(--amz-charcoal)' }}>{inr(mfgTotal)}</span>
              {boxCalc && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                  {(boxCalc.weightKg * packQty).toFixed(3)} kg
                  {packQty > 1 && <span className="ml-1 font-semibold" style={{ color: '#1d4ed8' }}>×{packQty}</span>}
                </p>
              )}
            </div>
          ) : <span style={{ color: 'var(--amz-charcoal-muted)' }}>—</span>}
        </td>

        {/* Net profit */}
        <td className="px-3 py-3 text-right tabular-nums">
          {netProfit != null ? (
            <div>
              <span className="text-xs font-bold"
                style={{ color: netProfit >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                {inr(netProfit, 0)}
              </span>
              {margin != null && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                  {margin.toFixed(1)}%
                </p>
              )}
            </div>
          ) : <span style={{ color: 'var(--amz-charcoal-muted)' }}>—</span>}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Breakdown toggle */}
            {hasConfig && hasDims && sp > 0 && (
              <button onClick={() => setExpanded(v => !v)}
                title={expanded ? 'Hide breakdown' : 'Show full breakdown'}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: expanded ? 'var(--amz-teal-light)' : 'var(--amz-beige)', color: expanded ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal-soft)' }}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            {/* Save */}
            {status === 'error' ? (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="text-[10px] text-red-500 max-w-[70px] truncate" title={errMsg}>{errMsg}</span>
              </div>
            ) : status === 'saved' ? (
              <span className="flex items-center gap-1 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--amz-teal-dark)' }}>
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            ) : (
              <button onClick={handleSave} disabled={isPending || (!isDirty && !!row.gsm_config)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                style={{
                  background: isDirty || !row.gsm_config ? 'var(--amz-teal-dark)' : 'var(--amz-beige)',
                  color:      isDirty || !row.gsm_config ? '#fff' : 'var(--amz-charcoal-soft)',
                }}>
                {isPending ? <><Loader2 className="h-3 w-3 animate-spin" />Saving</> : (row.gsm_config && !isDirty ? 'Saved' : 'Save')}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded breakdown row */}
      {expanded && (
        <tr style={{ background: rowBg }}>
          <td colSpan={8} className="px-5 pb-5 pt-0">
            <BreakdownPanel
              sku={row.seller_sku}
              gsmConfig={config}
              sp={sp}
              boxCalc={boxCalc}
              packQty={packQty}
              packCogs={packCogs}
              pf={pf}
              mfgTotal={mfgTotal}
              refPct={refPct}
              refFee={refFee}
              closingFee={closingFee}
              shipping={shipping}
              setShipping={setShipping}
              feesTotal={feesTotal}
              totalCost={totalCost}
              netProfit={netProfit}
              margin={margin}
              setRefPct={setRefPct}
              setStatus={setStatus}
              feeEstimate={row.feeEstimate}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Breakdown panel ───────────────────────────────────────────────────────────

function SuggestionPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors hover:opacity-80"
      style={{ background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)', borderColor: 'var(--amz-teal)' }}>
      ↑ {label}
    </button>
  );
}

function BreakdownPanel({
  sku, gsmConfig, sp, boxCalc, packQty, packCogs, pf, mfgTotal,
  refPct, refFee, closingFee, shipping, setShipping,
  feesTotal, totalCost, netProfit, margin,
  setRefPct, setStatus, feeEstimate,
}: {
  sku: string; gsmConfig: string; sp: number;
  boxCalc: ReturnType<typeof calcBoxCost> | null;
  packQty: number; packCogs: number | null;
  pf: number | null; mfgTotal: number | null;
  refPct: number; refFee: number | null; closingFee: number | null;
  shipping: number; setShipping: (v: number) => void;
  feesTotal: number | null; totalCost: number | null;
  netProfit: number | null; margin: number | null;
  setRefPct: (v: number) => void;
  setStatus: (s: 'idle' | 'saved' | 'error') => void;
  feeEstimate: FeeEstimate | null;
}) {
  const cfg = GSM_CONFIGS[gsmConfig];
  const easyShip = boxCalc ? easyShipRates(boxCalc.weightKg) : null;

  return (
    <div className="rounded-xl border mt-2 overflow-hidden" style={{ borderColor: 'var(--amz-beige-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--amz-charcoal-soft)' }}>
          Full price breakdown — {sku}
        </span>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
          <span>{cfg?.label}</span>
          <span className="font-bold text-base" style={{ color: 'var(--amz-charcoal)' }}>
            SP: ₹{sp.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--amz-beige-border)]">

        {/* ── Manufacturing ── */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4" style={{ color: 'var(--amz-teal)' }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--amz-charcoal)' }}>
              Manufacturing
            </span>
            {packQty > 1 && (
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                Pack of {packQty}
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {/* Single-box cost */}
            <BdLine
              label={`Box material (${cfg?.totalGsm} GSM · ${boxCalc ? boxCalc.weightKg.toFixed(3) + ' kg/box' : '—'})`}
              value={boxCalc ? inr(boxCalc.cogs) : '—'}
              sub={boxCalc ? `Area ${boxCalc.areaSqIn.toFixed(1)} in² × rate/kg × 1.3 overhead` : undefined}
            />
            {/* Pack multiplier line — only shown when qty > 1 */}
            {packQty > 1 && boxCalc && (
              <BdLine
                label={`× ${packQty} boxes per listing`}
                value={packCogs != null ? inr(packCogs) : '—'}
                sub={`${(boxCalc.weightKg * packQty).toFixed(3)} kg total`}
              />
            )}
            <BdLine label="Packer fee (SP-based slab)" value={pf != null ? `₹${pf}` : '—'} />
            <div className="border-t pt-2.5" style={{ borderColor: 'var(--amz-beige-border)' }}>
              <BdLine label="Manufacturing total" value={mfgTotal != null ? inr(mfgTotal) : '—'} bold />
            </div>
          </div>
        </div>

        {/* ── E-Commerce fees ── */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-4 w-4" style={{ color: 'var(--amz-teal)' }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--amz-charcoal)' }}>
              E-Commerce Fees
            </span>
          </div>
          <div className="space-y-3">
            {/* Referral fee input + SP-API suggestion */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>Amazon referral fee</span>
                  {feeEstimate && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                      SP-API actual: <strong>{feeEstimate.referral_pct.toFixed(1)}%</strong> (₹{feeEstimate.referral_fee.toFixed(0)}) at ₹{feeEstimate.listing_price.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {feeEstimate && Math.abs(feeEstimate.referral_pct - refPct) > 0.1 && (
                    <SuggestionPill
                      label={`${feeEstimate.referral_pct.toFixed(1)}%`}
                      onClick={() => { setRefPct(feeEstimate.referral_pct); setStatus('idle'); }}
                    />
                  )}
                  <input type="number" value={refPct} min={0} max={30} step={0.5}
                    onChange={e => { setRefPct(parseFloat(e.target.value) || 0); setStatus('idle'); }}
                    className="w-14 text-xs text-right rounded-lg border px-2 py-1 tabular-nums focus:outline-none"
                    style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)', color: 'var(--amz-charcoal)' }} />
                  <span className="text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>%</span>
                  <span className="text-xs font-semibold tabular-nums w-16 text-right" style={{ color: 'var(--amz-charcoal)' }}>
                    {refFee != null ? inr(refFee) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <BdLine
              label="Variable closing fee (slab)"
              value={closingFee != null ? `₹${closingFee}` : '—'}
              sub={feeEstimate
                ? `SP-API confirmed: ₹${feeEstimate.variable_closing.toFixed(0)} · standard Amazon India rate`
                : `SP ₹${sp.toLocaleString('en-IN')} → standard Amazon India rate`}
            />

            {/* Shipping input + Easy Ship suggestion */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                    Shipping cost (courier / Easy Ship)
                  </span>
                  {easyShip && boxCalc && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                      Easy Ship est. ({boxCalc.weightKg.toFixed(3)} kg):
                      {' '}Local ₹{easyShip.local} · Regional ₹{easyShip.regional} · National ₹{easyShip.national}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {easyShip && shipping === 0 && (
                    <SuggestionPill
                      label={`₹${easyShip.regional}`}
                      onClick={() => { setShipping(easyShip.regional); setStatus('idle'); }}
                    />
                  )}
                  <span className="text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>₹</span>
                  <input type="number" value={shipping} min={0} step={1}
                    onChange={e => { setShipping(parseFloat(e.target.value) || 0); setStatus('idle'); }}
                    className="w-20 text-xs text-right rounded-lg border px-2 py-1 tabular-nums focus:outline-none"
                    style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)', color: 'var(--amz-charcoal)' }} />
                </div>
              </div>
              {/* Easy Ship zone selector */}
              {easyShip && shipping === 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>Use Easy Ship rate:</span>
                  {[
                    { label: 'Local', value: easyShip.local },
                    { label: 'Regional', value: easyShip.regional },
                    { label: 'National', value: easyShip.national },
                  ].map(z => (
                    <button key={z.label} onClick={() => { setShipping(z.value); setStatus('idle'); }}
                      className="text-[10px] px-2 py-0.5 rounded border transition-colors hover:opacity-80"
                      style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)', color: 'var(--amz-charcoal-soft)' }}>
                      {z.label} ₹{z.value}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-2.5" style={{ borderColor: 'var(--amz-beige-border)' }}>
              <BdLine label="Fees + shipping total" value={feesTotal != null ? inr(feesTotal) : '—'} bold />
            </div>
          </div>
        </div>
      </div>

      {/* Summary footer — current P&L */}
      <div className="px-5 py-4 border-t" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>Total cost</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: '#dc2626' }}>
                {totalCost != null ? inr(totalCost) : '—'}
              </p>
            </div>
            <div className="text-xl font-light" style={{ color: 'var(--amz-beige-border)' }}>→</div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>Net profit @ current SP</p>
              <p className="text-lg font-bold tabular-nums"
                style={{ color: netProfit != null && netProfit >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                {netProfit != null ? inr(netProfit) : '—'}
                {margin != null && (
                  <span className="text-sm font-medium ml-2" style={{ color: 'var(--amz-charcoal-soft)' }}>
                    ({margin.toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* Cost waterfall mini-bar */}
          {totalCost != null && sp > 0 && (
            <div className="flex-1 min-w-[200px] max-w-xs">
              <div className="flex rounded-full overflow-hidden h-3" style={{ background: 'var(--amz-beige-border)' }}>
                {boxCalc && <div title={`Box: ${inr(boxCalc.cogs)}`}   style={{ width: `${(boxCalc.cogs / sp) * 100}%`, background: '#6366f1' }} />}
                {pf != null && <div title={`Packer: ₹${pf}`}          style={{ width: `${(pf / sp) * 100}%`, background: '#8b5cf6' }} />}
                {refFee != null && <div title={`Referral: ${inr(refFee)}`} style={{ width: `${(refFee / sp) * 100}%`, background: '#f59e0b' }} />}
                {closingFee != null && <div title={`Closing: ₹${closingFee}`} style={{ width: `${(closingFee / sp) * 100}%`, background: '#f97316' }} />}
                {shipping > 0 && <div title={`Shipping: ₹${shipping}`} style={{ width: `${(shipping / sp) * 100}%`, background: '#ef4444' }} />}
                {netProfit != null && netProfit > 0 && <div title={`Profit: ${inr(netProfit)}`} style={{ width: `${(netProfit / sp) * 100}%`, background: 'var(--amz-teal)' }} />}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {[
                  { label: 'Box', color: '#6366f1' }, { label: 'Packer', color: '#8b5cf6' },
                  { label: 'Referral', color: '#f59e0b' }, { label: 'Closing', color: '#f97316' },
                  { label: 'Shipping', color: '#ef4444' }, { label: 'Profit', color: 'var(--amz-teal)' },
                ].map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--amz-charcoal-muted)' }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price calculator — set SP from target margin */}
      {packCogs != null && (
        <PriceCalculator
          sku={sku}
          currentSP={sp}
          cogs={packCogs}
          shipping={shipping}
          referralPct={refPct}
        />
      )}
    </div>
  );
}

// ── Price calculator ──────────────────────────────────────────────────────────

function PriceCalculator({
  sku, currentSP, cogs, shipping, referralPct,
}: {
  sku: string; currentSP: number; cogs: number; shipping: number; referralPct: number;
}) {
  const [targetMargin, setTargetMargin] = useState(30);
  const [pushStatus,   setPushStatus]   = useState<'idle' | 'pushing' | 'ok' | 'error'>('idle');
  const [pushError,    setPushError]    = useState('');
  const [copied,       setCopied]       = useState(false);
  const [isPending,    start]           = useTransition();

  const suggestedSP = calcTargetSP(cogs, shipping, referralPct, targetMargin);

  // Re-calculate the full breakdown at the suggested price to verify
  const verifyPf      = suggestedSP ? packerFee(suggestedSP)          : null;
  const verifyCf      = suggestedSP ? variableClosingFee(suggestedSP) : null;
  const verifyRef     = suggestedSP ? (suggestedSP * referralPct) / 100 : null;
  const verifyTotal   = suggestedSP && verifyPf != null && verifyCf != null && verifyRef != null
    ? cogs + shipping + verifyPf + verifyCf + verifyRef
    : null;
  const verifyProfit  = suggestedSP && verifyTotal != null ? suggestedSP - verifyTotal : null;
  const verifyMargin  = verifyProfit != null && suggestedSP ? (verifyProfit / suggestedSP) * 100 : null;

  function handleCopy() {
    if (!suggestedSP) return;
    navigator.clipboard.writeText(suggestedSP.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePush() {
    if (!suggestedSP) return;
    start(async () => {
      setPushStatus('pushing');
      setPushError('');
      const res = await updateAmazonPrice(sku, suggestedSP);
      if (res.success) {
        setPushStatus('ok');
        setTimeout(() => setPushStatus('idle'), 4000);
      } else {
        setPushStatus('error');
        setPushError(res.error ?? 'Unknown error');
      }
    });
  }

  const changed = suggestedSP != null && Math.abs(suggestedSP - currentSP) > 0.5;

  return (
    <div className="border-t" style={{ borderColor: 'var(--amz-beige-border)' }}>
      {/* Calculator header */}
      <div className="px-5 py-3 flex items-center justify-between border-b"
        style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#15803d' }}>
          SP Calculator — set price from target margin
        </span>
        {currentSP > 0 && (
          <span className="text-xs" style={{ color: '#15803d' }}>
            Current SP: <strong>₹{currentSP.toLocaleString('en-IN')}</strong>
          </span>
        )}
      </div>

      <div className="px-5 py-4" style={{ background: '#f0fdf4' }}>
        <div className="flex flex-wrap items-center gap-6">

          {/* Target margin input */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: '#15803d' }}>
              Target net margin
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={targetMargin}
                min={1}
                max={80}
                step={1}
                onChange={e => setTargetMargin(parseFloat(e.target.value) || 30)}
                className="w-16 text-sm font-bold text-right rounded-lg border px-2 py-1.5 tabular-nums focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#86efac',
                  background:  '#fff',
                  color:       '#15803d',
                }}
              />
              <span className="text-sm font-bold" style={{ color: '#15803d' }}>%</span>
            </div>
          </div>

          {/* Arrow */}
          <span className="text-lg" style={{ color: '#86efac' }}>→</span>

          {/* Suggested SP */}
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: '#15803d' }}>
              Suggested SP
            </p>
            {suggestedSP != null ? (
              <p className="text-2xl font-black tabular-nums" style={{ color: '#15803d' }}>
                ₹{suggestedSP.toLocaleString('en-IN')}
              </p>
            ) : (
              <p className="text-sm" style={{ color: '#dc2626' }}>Impossible — lower the target</p>
            )}
          </div>

          {/* Verified margin breakdown */}
          {verifyMargin != null && suggestedSP != null && (
            <div className="text-xs space-y-0.5" style={{ color: '#166534' }}>
              <p>Profit: <strong>{inr(verifyProfit!)}</strong></p>
              <p>Actual margin: <strong>{verifyMargin.toFixed(1)}%</strong></p>
              <p className="text-[10px]" style={{ color: '#16a34a' }}>
                (rounded up from exact — margin is ≥ target)
              </p>
            </div>
          )}

          {/* Change indicator */}
          {changed && suggestedSP != null && currentSP > 0 && (
            <div className="text-xs" style={{ color: '#15803d' }}>
              <span className="font-semibold">
                {suggestedSP > currentSP ? '▲' : '▼'}{' '}
                {suggestedSP > currentSP ? '+' : ''}
                ₹{Math.abs(suggestedSP - currentSP).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] mt-0.5" style={{ color: '#16a34a' }}>vs current SP</p>
            </div>
          )}

          {/* Action buttons */}
          {suggestedSP != null && (
            <div className="flex items-center gap-2 ml-auto">
              {/* Copy */}
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: '#86efac', background: '#fff', color: '#15803d' }}>
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy price'}
              </button>

              {/* Push to Amazon */}
              {pushStatus === 'ok' ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: '#15803d', color: '#fff' }}>
                  <Check className="h-3 w-3" /> Updated on Amazon
                </span>
              ) : pushStatus === 'error' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 max-w-[200px]" title={pushError}>
                    {pushError.length > 60 ? pushError.slice(0, 60) + '…' : pushError}
                  </span>
                  <button onClick={() => setPushStatus('idle')}
                    className="text-xs underline" style={{ color: '#dc2626' }}>retry</button>
                </div>
              ) : (
                <button onClick={handlePush} disabled={isPending || pushStatus === 'pushing'}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  style={{ background: '#15803d', color: '#fff' }}>
                  {isPending || pushStatus === 'pushing'
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Updating…</>
                    : <><Send className="h-3 w-3" /> Update on Amazon</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BdLine({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className={`text-xs ${bold ? 'font-bold' : ''}`} style={{ color: bold ? 'var(--amz-charcoal)' : 'var(--amz-charcoal-soft)' }}>
          {label}
        </span>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>{sub}</p>}
      </div>
      <span className={`tabular-nums shrink-0 ${bold ? 'text-sm font-bold' : 'text-xs font-medium'}`}
        style={{ color: bold ? 'var(--amz-charcoal)' : 'var(--amz-charcoal)' }}>
        {value}
      </span>
    </div>
  );
}
