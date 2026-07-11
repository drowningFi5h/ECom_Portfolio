'use client';

import { useState, useMemo } from 'react';
import { calcTotalGsm } from '@/lib/amazon-costs';

export interface SkuRow {
  seller_sku:  string;
  pack_qty:    number;
  ply:         3 | 5 | 7;
  size:        { h: number; b: number; l: number };
  size_key:    string;
  rate_per_kg: number;
}

const inr  = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const wFmt = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(3)} kg` : `${g.toFixed(1)} g`;

function sheetArea(h: number, b: number, l: number) {
  return ((h + b + 1) * (b + l + 1)) * 2;
}

export default function PricingTable({ rows, allSizes }: { rows: SkuRow[]; allSizes: string[] }) {
  const [selSize, setSelSize] = useState('');
  const [selPly,  setSelPly]  = useState<'' | '3' | '5' | '7'>('');
  const [selGsm,  setSelGsm]  = useState<'' | '140' | '180'>('');

  const allReady = selSize !== '' && selPly !== '' && selGsm !== '';

  const matched = useMemo(() => {
    if (!allReady) return [];
    return rows.filter(r => r.size_key === selSize && String(r.ply) === selPly);
  }, [rows, selSize, selPly, allReady]);

  // Computed once for all matched rows (size + ply + gsm are the same)
  const size = matched[0]?.size ?? null;
  const area      = size ? sheetArea(size.h, size.b, size.l) : null;
  const totalGsm  = allReady ? calcTotalGsm(parseInt(selGsm), parseInt(selPly)) : null;
  const weightG   = area != null && totalGsm != null ? (area * totalGsm) / 1550 : null;
  const weightKg  = weightG != null ? weightG / 1000 : null;

  const selectStyle = (filled: boolean) => ({
    borderColor: filled ? 'var(--amz-teal)' : 'var(--amz-beige-border)',
    background:  filled ? 'var(--amz-teal-light)' : 'var(--amz-beige)',
    color:       filled ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal)',
  });

  return (
    <div className="space-y-6">

      {/* Three filter selects */}
      <div className="flex items-end gap-4 flex-wrap">

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>Size (inches)</label>
          <select value={selSize} onChange={e => setSelSize(e.target.value)}
            className="text-sm rounded-xl border px-3 py-2.5 w-44 focus:outline-none focus:ring-2"
            style={selectStyle(!!selSize)}>
            <option value="">— select size —</option>
            {allSizes.map(s => <option key={s} value={s}>{s}&Prime;</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>Ply</label>
          <select value={selPly} onChange={e => setSelPly(e.target.value as typeof selPly)}
            className="text-sm rounded-xl border px-3 py-2.5 w-32 focus:outline-none"
            style={selectStyle(!!selPly)}>
            <option value="">— ply —</option>
            <option value="3">3 PLY</option>
            <option value="5">5 PLY</option>
            <option value="7">7 PLY</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--amz-charcoal-soft)' }}>GSM</label>
          <select value={selGsm} onChange={e => setSelGsm(e.target.value as typeof selGsm)}
            className="text-sm rounded-xl border px-3 py-2.5 w-32 focus:outline-none"
            style={selectStyle(!!selGsm)}>
            <option value="">— GSM —</option>
            <option value="140">140</option>
            <option value="180">180</option>
          </select>
        </div>

        {allReady && (
          <div className="pb-0.5 text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--amz-charcoal)' }}>{matched.length}</span> SKU{matched.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Prompt when filters not complete */}
      {!allReady && (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center"
          style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Select {!selSize ? 'a size' : !selPly ? 'a ply' : 'a GSM'} to see matching SKUs
          </p>
        </div>
      )}

      {/* Results table */}
      {allReady && (
        matched.length === 0 ? (
          <div className="rounded-2xl border py-12 text-center"
            style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
            <p className="text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>
              No SKUs found for {selSize}&Prime; · {selPly} PLY
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>

            {/* Computed header summary */}
            <div className="px-5 py-3 border-b flex items-center gap-6 flex-wrap"
              style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
              <Info label="Sheet area" value={area != null ? `${area.toFixed(1)} sq in` : '—'} />
              <Info label="Total GSM"  value={totalGsm != null ? `${Math.round(totalGsm)}` : '—'} />
              <Info label="Weight / box" value={weightG != null ? wFmt(weightG) : '—'} />
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">SKU</th>
                  <th className="text-center px-3 py-3.5">Pack qty</th>
                  <th className="text-right px-3 py-3.5">Sheet (sq in)</th>
                  <th className="text-right px-3 py-3.5">Weight</th>
                  <th className="text-right px-5 py-3.5">Landing cost</th>
                </tr>
              </thead>
              <tbody>
                {matched.map((row, i) => {
                  const landingCost = weightKg != null
                    ? weightKg * row.rate_per_kg * 1.3 * row.pack_qty
                    : null;

                  return (
                    <tr key={row.seller_sku}
                      className="border-b last:border-0"
                      style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>

                      <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--amz-charcoal)' }}>
                        {row.seller_sku.split('#')[0]}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                          ×{row.pack_qty}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums text-xs"
                        style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {area != null ? area.toFixed(1) : '—'}
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums text-xs"
                        style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {weightG != null ? wFmt(weightG * row.pack_qty) : '—'}
                      </td>

                      <td className="px-5 py-3 text-right tabular-nums text-sm font-semibold"
                        style={{ color: 'var(--amz-charcoal)' }}>
                        {landingCost != null ? inr(landingCost) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--amz-charcoal-soft)' }}>{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--amz-charcoal)' }}>{value}</p>
    </div>
  );
}
