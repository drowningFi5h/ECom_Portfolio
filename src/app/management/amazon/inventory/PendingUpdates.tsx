'use client';

import { useState, useTransition } from 'react';
import { Check, X, ChevronDown, ChevronUp, Loader2, AlertCircle, Package } from 'lucide-react';
import { approveBatch, rejectBatch } from './actions';
import type { ManufacturerBatch } from './actions';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function BatchCard({ batch }: { batch: ManufacturerBatch }) {
  const [expanded,   setExpanded]  = useState(false);
  const [status,     setStatus]    = useState<'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected' | 'error'>('idle');
  const [errMsg,     setErrMsg]    = useState('');
  const [isPending,  start]        = useTransition();

  const delta        = batch.our_estimate != null ? batch.billed_amount - batch.our_estimate : null;
  const deltaSign    = delta != null ? (delta > 0 ? '+' : '') : '';
  const deltaPct     = delta != null && batch.our_estimate ? (delta / batch.our_estimate) * 100 : null;
  const deltaColor   = delta == null ? 'var(--amz-charcoal-muted)' : delta > 0 ? '#dc2626' : 'var(--amz-teal-dark)';

  const weightDelta  = batch.formula_weight != null
    ? batch.weight_per_unit - batch.formula_weight
    : null;
  const weightDeltaPct = weightDelta != null && batch.formula_weight
    ? (weightDelta / batch.formula_weight) * 100
    : null;

  function handleApprove() {
    start(async () => {
      setStatus('approving');
      setErrMsg('');
      const res = await approveBatch(batch.id);
      if (res.success) setStatus('approved');
      else { setStatus('error'); setErrMsg(res.error ?? 'Failed'); }
    });
  }

  function handleReject() {
    start(async () => {
      setStatus('rejecting');
      setErrMsg('');
      const res = await rejectBatch(batch.id);
      if (res.success) setStatus('rejected');
      else { setStatus('error'); setErrMsg(res.error ?? 'Failed'); }
    });
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-xl border"
        style={{ background: 'var(--amz-teal-light)', borderColor: 'var(--amz-teal)' }}>
        <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--amz-teal-dark)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--amz-teal-dark)' }}>
          Approved — rate pushed to matching SKUs
        </span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-xl border"
        style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
        <X className="h-4 w-4 shrink-0" style={{ color: 'var(--amz-charcoal-muted)' }} />
        <span className="text-sm" style={{ color: 'var(--amz-charcoal-muted)' }}>Batch rejected</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--amz-beige-border)' }}>

      {/* Card header */}
      <div className="flex items-center gap-4 px-5 py-4 flex-wrap"
        style={{ background: 'var(--amz-beige)' }}>

        {/* Box spec pill */}
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 shrink-0" style={{ color: 'var(--amz-teal)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--amz-charcoal)' }}>
            {batch.size_h}&Prime;×{batch.size_b}&Prime;×{batch.size_l}&Prime;
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            {batch.ply} PLY
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)' }}>
            {batch.gsm} GSM
          </span>
        </div>

        {/* Quantity + date */}
        <div className="text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
          <span className="font-semibold">{batch.quantity.toLocaleString('en-IN')} boxes</span>
          {' · '}
          {new Date(batch.batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* Cost summary */}
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--amz-charcoal-muted)' }}>Billed</p>
            <p className="text-sm font-bold" style={{ color: 'var(--amz-charcoal)' }}>{inr(batch.billed_amount)}</p>
          </div>
          {batch.our_estimate != null && (
            <>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--amz-charcoal-muted)' }}>Our estimate</p>
                <p className="text-sm font-bold" style={{ color: 'var(--amz-charcoal-soft)' }}>{inr(batch.our_estimate)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--amz-charcoal-muted)' }}>Delta</p>
                <p className="text-sm font-bold" style={{ color: deltaColor }}>
                  {deltaSign}{inr(delta!)}
                  {deltaPct != null && (
                    <span className="text-[10px] font-medium ml-1">({deltaSign}{deltaPct.toFixed(1)}%)</span>
                  )}
                </p>
              </div>
            </>
          )}

          {/* Expand toggle */}
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: expanded ? 'var(--amz-teal-light)' : 'transparent', color: 'var(--amz-charcoal-soft)' }}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 py-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{ borderColor: 'var(--amz-beige-border)', background: '#fff' }}>
          <Detail label="Weight / box"
            value={`${batch.weight_per_unit} kg`}
            sub={batch.formula_weight != null
              ? `Formula: ${batch.formula_weight} kg ${weightDeltaPct != null ? `(${weightDeltaPct > 0 ? '+' : ''}${weightDeltaPct.toFixed(1)}%)` : ''}`
              : undefined}
            subColor={weightDelta != null && Math.abs(weightDelta) > 0.01
              ? weightDelta > 0 ? '#b45309' : 'var(--amz-teal-dark)'
              : 'var(--amz-charcoal-muted)'}
          />
          <Detail label="Rate"
            value={`${inr(batch.rate_value)} / ${batch.rate_unit === 'per_kg' ? 'kg' : 'piece'}`}
          />
          <Detail label="Total weight"
            value={`${(batch.weight_per_unit * batch.quantity).toFixed(3)} kg`}
          />
          <Detail label="Submitted"
            value={new Date(batch.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          />
          {batch.notes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--amz-charcoal-muted)' }}>Notes</p>
              <p className="text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>{batch.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-t"
        style={{ borderColor: 'var(--amz-beige-border)', background: '#fff' }}>

        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {errMsg}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={handleReject}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-colors disabled:opacity-40"
            style={{ borderColor: '#fecaca', background: '#fff', color: '#dc2626' }}>
            {status === 'rejecting'
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Rejecting…</>
              : <><X className="h-3 w-3" /> Reject</>}
          </button>

          <button onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'var(--amz-teal-dark)', color: '#fff' }}>
            {status === 'approving'
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Approving…</>
              : <><Check className="h-3 w-3" /> Approve & push rate</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--amz-charcoal)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: subColor ?? 'var(--amz-charcoal-muted)' }}>{sub}</p>}
    </div>
  );
}

export default function PendingUpdates({ batches, tablesMissing }: { batches: ManufacturerBatch[]; tablesMissing: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  if (tablesMissing) {
    return (
      <div className="rounded-2xl border p-5" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
        <p className="text-sm font-semibold text-amber-700 mb-1">Manufacturer batches table not set up</p>
        <p className="text-xs text-amber-600 mb-3">Run this SQL in your Supabase editor:</p>
        <pre className="text-xs rounded-lg p-3 overflow-x-auto" style={{ background: '#1e293b', color: '#e2e8f0' }}>{`CREATE TABLE IF NOT EXISTS manufacturer_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at     TIMESTAMPTZ DEFAULT now(),
  batch_date       DATE NOT NULL,
  size_h           NUMERIC NOT NULL,
  size_b           NUMERIC NOT NULL,
  size_l           NUMERIC NOT NULL,
  ply              SMALLINT NOT NULL CHECK (ply IN (3, 5, 7)),
  gsm              SMALLINT NOT NULL CHECK (gsm IN (140, 180)),
  quantity         INTEGER NOT NULL,
  weight_per_unit  NUMERIC NOT NULL,
  formula_weight   NUMERIC,
  rate_value       NUMERIC NOT NULL,
  rate_unit        TEXT NOT NULL CHECK (rate_unit IN ('per_kg', 'per_piece')),
  billed_amount    NUMERIC NOT NULL,
  our_estimate     NUMERIC,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at      TIMESTAMPTZ,
  notes            TEXT
);`}</pre>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--amz-beige-border)' }}>

      {/* Section header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-opacity-80"
        style={{ background: batches.length > 0 ? '#fffbeb' : 'var(--amz-beige)', borderBottom: collapsed ? 'none' : '1px solid var(--amz-beige-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: batches.length > 0 ? '#b45309' : 'var(--amz-charcoal)' }}>
            Pending inventory updates
          </span>
          {batches.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#fde68a', color: '#b45309' }}>
              {batches.length}
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--amz-charcoal-muted)' }} />
          : <ChevronUp   className="h-4 w-4" style={{ color: 'var(--amz-charcoal-muted)' }} />}
      </button>

      {!collapsed && (
        <div className="p-5 space-y-3" style={{ background: '#fff' }}>
          {batches.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--amz-charcoal-muted)' }}>
              No pending batches — all up to date
            </p>
          ) : (
            batches.map(b => <BatchCard key={b.id} batch={b} />)
          )}
        </div>
      )}
    </div>
  );
}
