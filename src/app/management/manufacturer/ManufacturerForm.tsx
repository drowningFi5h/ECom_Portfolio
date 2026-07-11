'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { CheckCircle2, Loader2, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getPreviousBatches, submitBatch, saveWarehouseAddress } from './actions';
import { calcTotalGsm } from '@/lib/amazon-costs';
import type { SizeOption, WarehouseAddress } from './actions';
import type { ManufacturerBatch } from '../amazon/inventory/actions';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr  = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt3 = (n: number) => n.toFixed(3);

function today() {
  return new Date().toISOString().split('T')[0];
}

function formulaWeightKg(h: number, b: number, l: number, ply: number, gsm: number): number {
  const area     = ((h + b + 1) * (b + l + 1)) * 2;
  const gsmTotal = calcTotalGsm(gsm, ply);
  return (area * gsmTotal) / 1550 / 1000;
}

// ── Native select styled to match Input ──────────────────────────────────────

function Select({ className, children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{ colorScheme: 'light', color: '#1c1917', padding: '0 2rem 0 0.75rem', ...style }}
      className={cn(
        'flex h-9 w-full rounded-lg border border-stone-200 bg-white text-[13px] shadow-none transition-colors appearance-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0b3b46]/40 focus-visible:border-[#0b3b46]/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function SelectWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, children, hint, className,
}: {
  label: string; children: React.ReactNode; hint?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {hint && <span className="text-[10px] font-medium text-emerald-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Rate unit toggle ──────────────────────────────────────────────────────────

function RateToggle({ value, onChange }: { value: 'per_kg' | 'per_piece'; onChange: (v: 'per_kg' | 'per_piece') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden text-[13px] font-medium">
      {(['per_kg', 'per_piece'] as const).map(u => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            'px-3 h-9 transition-colors',
            value === u
              ? 'bg-[#0b3b46] text-white'
              : 'bg-white text-stone-500 hover:bg-stone-50',
          )}
        >
          {u === 'per_kg' ? '₹ / kg' : '₹ / piece'}
        </button>
      ))}
    </div>
  );
}

// ── Shipping section ──────────────────────────────────────────────────────────

function ShippingSection({
  savedAddresses,
  selectedId,
  onSelect,
  shipmentFee,
  onShipmentFee,
}: {
  savedAddresses: WarehouseAddress[];
  selectedId: string;
  onSelect: (id: string) => void;
  shipmentFee: number | '';
  onShipmentFee: (v: number | '') => void;
}) {
  const [showNew, setShowNew]         = useState(false);
  const [saving,  startSave]          = useTransition();
  const [saveErr, setSaveErr]         = useState('');
  const [localAddresses, setLocal]    = useState(savedAddresses);
  const [newLabel,   setNewLabel]     = useState('');
  const [newAddr,    setNewAddr]      = useState('');
  const [newCity,    setNewCity]      = useState('');
  const [newState,   setNewState]     = useState('');
  const [newPin,     setNewPin]       = useState('');

  function handleAddressChange(val: string) {
    if (val === '__new__') { setShowNew(true); onSelect(''); }
    else { setShowNew(false); onSelect(val); }
  }

  function handleSave() {
    setSaveErr('');
    startSave(async () => {
      const fd = new FormData();
      fd.set('label',        newLabel.trim());
      fd.set('address_line', newAddr.trim());
      fd.set('city',         newCity.trim());
      fd.set('state',        newState.trim());
      fd.set('pincode',      newPin.trim());
      const res = await saveWarehouseAddress(fd);
      if (res.error) { setSaveErr(res.error); return; }
      const a = res.address!;
      setLocal(prev => [a, ...prev]);
      onSelect(a.id);
      setShowNew(false);
      setNewLabel(''); setNewAddr(''); setNewCity(''); setNewState(''); setNewPin('');
    });
  }

  const currentAddr = localAddresses.find(a => a.id === selectedId);

  return (
    <Card>
      <CardHeader className="pb-4 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Shipping
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 pb-6 space-y-4">

        {/* Address picker */}
        <Field label="Ship to warehouse">
          <SelectWrapper>
            <Select
              value={showNew ? '__new__' : selectedId}
              onChange={e => handleAddressChange(e.target.value)}
            >
              <option value="">— select address —</option>
              {localAddresses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.city}, {a.state}
                </option>
              ))}
              <option value="__new__">+ Add new address…</option>
            </Select>
          </SelectWrapper>
          {/* Hidden field for form submission */}
          <input type="hidden" name="warehouse_address_id" value={selectedId} />
          {/* Show selected address detail */}
          {currentAddr && !showNew && (
            <p className="text-[12px] text-stone-400 mt-1 leading-relaxed">
              {currentAddr.address_line}, {currentAddr.city}, {currentAddr.state} – {currentAddr.pincode}
            </p>
          )}
        </Field>

        {/* New address form */}
        {showNew && (
          <div className="rounded-lg border border-stone-200 p-4 space-y-3 bg-stone-50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">New warehouse address</p>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Label / name">
                <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Delhi Warehouse" />
              </Field>
              <Field label="Address line">
                <Input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="Street, Building, Area" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="City" />
                </Field>
                <Field label="State">
                  <Input value={newState} onChange={e => setNewState(e.target.value)} placeholder="State" />
                </Field>
                <Field label="Pincode">
                  <Input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="000000" />
                </Field>
              </div>
            </div>
            {saveErr && (
              <p className="text-[12px] text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />{saveErr}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button type="button" size="sm" disabled={saving} onClick={handleSave}
                className="bg-[#0b3b46] hover:bg-[#0b3b46]/90 text-white">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save address'}
              </Button>
              <button type="button" onClick={() => { setShowNew(false); onSelect(''); }}
                className="text-[13px] text-stone-400 hover:text-stone-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shipment fee */}
        <Field label="Shipment fee (₹)">
          <Input
            type="number"
            name="shipment_fee"
            min={0}
            step={0.01}
            value={shipmentFee}
            onChange={e => onShipmentFee(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="0.00"
          />
        </Field>

      </CardContent>
    </Card>
  );
}

// ── Cost summary card ─────────────────────────────────────────────────────────

interface CostSummaryProps {
  formulaWt:    number | null;
  measuredWt:   number | null;
  quantity:     number | null;
  rateValue:    number | null;
  rateUnit:     'per_kg' | 'per_piece';
  shipmentFee:  number | null;
}

function CostSummary({ formulaWt, measuredWt, quantity, rateValue, rateUnit, shipmentFee }: CostSummaryProps) {
  const ready = formulaWt != null && measuredWt != null && measuredWt > 0
             && quantity  != null && quantity > 0
             && rateValue != null && rateValue > 0;
  if (!ready) return null;

  const fw  = formulaWt!;
  const mw  = measuredWt!;
  const qty = quantity!;
  const rv  = rateValue!;

  const effRateKg  = rateUnit === 'per_kg' ? rv : rv / mw;
  const cpuKg      = effRateKg * mw;
  const cpuPiece   = rateUnit === 'per_piece' ? rv : cpuKg;
  const totalWt    = mw * qty;
  const billed     = rateUnit === 'per_kg' ? rv * totalWt : rv * qty;
  const estimate   = fw * effRateKg * qty;
  const delta      = billed - estimate;
  const deltaPct   = estimate > 0 ? (delta / estimate) * 100 : 0;
  const wtDelta    = mw - fw;
  const wtDeltaPct = fw > 0 ? (wtDelta / fw) * 100 : 0;
  const sf         = shipmentFee ?? 0;
  const totalCost  = billed + sf;

  const rows: { label: string; value: string; muted?: boolean; bold?: boolean; color?: string; divider?: boolean }[] = [
    { label: 'Formula weight / box',   value: `${fmt3(fw)} kg`,     muted: true },
    { label: 'Measured weight / box',  value: `${fmt3(mw)} kg` },
    {
      label: 'Weight difference',
      value: `${wtDelta >= 0 ? '+' : ''}${fmt3(wtDelta)} kg  (${wtDeltaPct >= 0 ? '+' : ''}${wtDeltaPct.toFixed(1)}%)`,
      color: Math.abs(wtDelta) < 0.005 ? '#16a34a' : wtDelta > 0 ? '#b45309' : '#16a34a',
    },
    { label: 'Cost / unit (₹/kg)',     value: inr(cpuKg),    muted: rateUnit !== 'per_kg' },
    { label: 'Cost / unit (₹/piece)',  value: inr(cpuPiece), muted: rateUnit !== 'per_piece' },
    { label: 'Total weight',           value: `${fmt3(totalWt)} kg`, muted: true },
    { label: 'Production cost',        value: inr(billed),   bold: true },
    { label: 'Our estimate',           value: inr(estimate), muted: true },
    {
      label: 'Delta (production)',
      value: `${delta >= 0 ? '+' : ''}${inr(delta)}  (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`,
      color: Math.abs(delta) < 1 ? '#78716c' : delta > 0 ? '#dc2626' : '#16a34a',
    },
    ...(sf > 0 ? [
      { label: 'Shipment fee',         value: inr(sf),       muted: true, divider: true },
      { label: 'Total cost',           value: inr(totalCost), bold: true },
    ] : []),
  ];

  return (
    <Card>
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-400">Cost summary</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-0 pb-2 px-6">
        <div className="divide-y divide-stone-100">
          {rows.map(row => (
            <div key={row.label}
              className={cn('flex items-center justify-between py-2.5', row.divider && 'border-t border-stone-200 mt-1 pt-3')}>
              <span className="text-[13px] text-stone-500">{row.label}</span>
              <span
                className={cn('text-[13px] tabular-nums', row.bold ? 'font-semibold' : 'font-medium')}
                style={{ color: row.color ?? (row.muted ? '#a8a29e' : '#1c1917') }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Previous batches ──────────────────────────────────────────────────────────

function PreviousBatches({ batches, loading }: { batches: ManufacturerBatch[]; loading: boolean }) {
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-stone-400 py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading records…
      </div>
    );
  }

  if (batches.length === 0) {
    return <p className="text-[13px] text-stone-400 py-1">No previous records for this spec.</p>;
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Previous batches ({batches.length})
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-stone-300" />
          : <ChevronDown className="h-4 w-4 text-stone-300" />}
      </button>

      {open && (
        <>
          <Separator />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
                  {['Date', 'Qty', 'Wt/box', 'Rate', 'Billed', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {batches.map((b, i) => {
                  const prev     = batches[i + 1];
                  const effRate  = b.rate_unit === 'per_kg' ? b.rate_value : b.rate_value / b.weight_per_unit;
                  const prevRate = prev
                    ? (prev.rate_unit === 'per_kg' ? prev.rate_value : prev.rate_value / prev.weight_per_unit)
                    : null;
                  const rateUp = prevRate != null && effRate - prevRate > 0.5;

                  return (
                    <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-stone-500">
                        {new Date(b.batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-6 py-3 tabular-nums font-medium text-stone-700">
                        {b.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-stone-500">
                        {fmt3(b.weight_per_unit)} kg
                      </td>
                      <td className="px-6 py-3 tabular-nums">
                        <span className={rateUp ? 'font-semibold text-amber-600' : 'text-stone-700'}>
                          {inr(b.rate_value)}/{b.rate_unit === 'per_kg' ? 'kg' : 'pc'}
                        </span>
                        {rateUp && <span className="ml-1 text-[10px] text-amber-400">▲</span>}
                      </td>
                      <td className="px-6 py-3 tabular-nums font-semibold text-stone-800">
                        {inr(b.billed_amount)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                          b.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500',
                        )}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ManufacturerForm({
  sizes,
  savedAddresses,
}: {
  sizes: SizeOption[];
  savedAddresses: WarehouseAddress[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [batchDate,       setBatchDate]       = useState(today());
  const [selSize,         setSelSize]         = useState('');
  const [selPly,          setSelPly]          = useState<3 | 5 | 7 | ''>('');
  const [selGsm,          setSelGsm]          = useState<140 | 180 | ''>('');
  const [quantity,        setQuantity]        = useState<number | ''>('');
  const [measuredWt,      setMeasuredWt]      = useState<number | ''>('');
  const [wtOverridden,    setWtOverridden]    = useState(false);
  const [rateValue,       setRateValue]       = useState<number | ''>('');
  const [rateUnit,        setRateUnit]        = useState<'per_kg' | 'per_piece'>('per_kg');
  const [warehouseId,     setWarehouseId]     = useState('');
  const [shipmentFee,     setShipmentFee]     = useState<number | ''>('');
  const [notes,           setNotes]           = useState('');

  const [prevBatches, setPrevBatches] = useState<ManufacturerBatch[]>([]);
  const [loadingPrev, startPrev]      = useTransition();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg]           = useState('');
  const [isPending, startSubmit]      = useTransition();

  const parsedSize = sizes.find(s => s.key === selSize) ?? null;
  const fw = parsedSize && selPly && selGsm
    ? formulaWeightKg(parsedSize.h, parsedSize.b, parsedSize.l, selPly, selGsm)
    : null;

  useEffect(() => {
    if (fw != null && !wtOverridden) setMeasuredWt(parseFloat(fw.toFixed(4)));
  }, [fw, wtOverridden]);

  useEffect(() => {
    if (!parsedSize || !selPly || !selGsm) { setPrevBatches([]); return; }
    startPrev(async () => {
      const batches = await getPreviousBatches(parsedSize.h, parsedSize.b, parsedSize.l, selPly, selGsm);
      setPrevBatches(batches);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selSize, selPly, selGsm]);

  const mw  = typeof measuredWt  === 'number' && measuredWt > 0  ? measuredWt  : null;
  const qty = typeof quantity    === 'number' && quantity > 0    ? quantity    : null;
  const rv  = typeof rateValue   === 'number' && rateValue > 0   ? rateValue   : null;
  const sf  = typeof shipmentFee === 'number' && shipmentFee > 0 ? shipmentFee : null;

  const effRateKg = rv != null && mw != null ? (rateUnit === 'per_kg' ? rv : rv / mw) : null;
  const totalWt   = mw != null && qty != null ? mw * qty : null;
  const billed    = rv != null
    ? rateUnit === 'per_kg'
      ? (totalWt != null ? rv * totalWt : null)
      : (qty != null ? rv * qty : null)
    : null;
  const estimate = fw != null && effRateKg != null && qty != null ? fw * effRateKg * qty : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg(''); setSubmitStatus('idle');
    startSubmit(async () => {
      const fd = new FormData(e.currentTarget);
      if (billed   != null) fd.set('billed_amount',  String(billed));
      if (estimate != null) fd.set('our_estimate',   String(estimate));
      if (fw       != null) fd.set('formula_weight', String(fw));
      const res = await submitBatch(fd);
      if (res.error) { setErrMsg(res.error); setSubmitStatus('error'); return; }
      setSubmitStatus('ok');
      formRef.current?.reset();
      setBatchDate(today()); setSelSize(''); setSelPly(''); setSelGsm('');
      setQuantity(''); setMeasuredWt(''); setWtOverridden(false);
      setRateValue(''); setRateUnit('per_kg');
      setWarehouseId(''); setShipmentFee(''); setNotes('');
    });
  }

  const specComplete = !!selSize && !!selPly && !!selGsm;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

      {/* ── Spec ── */}
      <Card>
        <CardHeader className="pb-4 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Batch specification
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Date">
              <div className="relative">
                <Input
                  type="date"
                  name="batch_date"
                  value={batchDate}
                  onChange={e => setBatchDate(e.target.value)}
                  required
                  className="pr-8 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <Calendar className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              </div>
            </Field>

            <Field label="Box size">
              <SelectWrapper>
                <Select name="size_key" value={selSize}
                  onChange={e => { setSelSize(e.target.value); setWtOverridden(false); }}
                  required>
                  <option value="">— select —</option>
                  {sizes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              </SelectWrapper>
              <input type="hidden" name="size_h" value={parsedSize?.h ?? ''} />
              <input type="hidden" name="size_b" value={parsedSize?.b ?? ''} />
              <input type="hidden" name="size_l" value={parsedSize?.l ?? ''} />
            </Field>

            <Field label="PLY">
              <SelectWrapper>
                <Select name="ply" value={selPly}
                  onChange={e => { setSelPly(parseInt(e.target.value) as 3|5|7); setWtOverridden(false); }}
                  required>
                  <option value="">— PLY —</option>
                  <option value="3">3 PLY</option>
                  <option value="5">5 PLY</option>
                  <option value="7">7 PLY</option>
                </Select>
              </SelectWrapper>
            </Field>

            <Field label="GSM">
              <SelectWrapper>
                <Select name="gsm" value={selGsm}
                  onChange={e => { setSelGsm(parseInt(e.target.value) as 140|180); setWtOverridden(false); }}
                  required>
                  <option value="">— GSM —</option>
                  <option value="140">140</option>
                  <option value="180">180</option>
                </Select>
              </SelectWrapper>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Production ── */}
      <Card>
        <CardHeader className="pb-4 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Production data
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity (boxes)">
              <Input type="number" name="quantity" min={1} step={1}
                value={quantity}
                onChange={e => setQuantity(e.target.value ? parseInt(e.target.value) : '')}
                required placeholder="0" />
            </Field>

            <Field
              label="Weight per box (kg)"
              hint={fw != null && !wtOverridden ? 'auto-filled' : undefined}
            >
              <div className="flex items-center gap-1.5">
                <Input type="number" name="weight_per_unit" min={0.001} step={0.001}
                  value={measuredWt}
                  onChange={e => { setMeasuredWt(e.target.value ? parseFloat(e.target.value) : ''); setWtOverridden(true); }}
                  required placeholder="0.000" />
                {wtOverridden && fw != null && (
                  <button type="button" title="Reset to formula weight"
                    onClick={() => { setWtOverridden(false); setMeasuredWt(parseFloat(fw.toFixed(4))); }}
                    className="shrink-0 p-2 rounded-lg text-stone-400 hover:text-[#0b3b46] hover:bg-[#0b3b46]/5 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Rate ── */}
      <Card>
        <CardHeader className="pb-4 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Rate
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 pb-6">
          <div className="flex items-end gap-4 flex-wrap">
            <Field label="Rate (₹)" className="flex-1 min-w-[140px]">
              <Input type="number" name="rate_value" min={0.01} step={0.01}
                value={rateValue}
                onChange={e => setRateValue(e.target.value ? parseFloat(e.target.value) : '')}
                required placeholder="0.00" />
            </Field>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <input type="hidden" name="rate_unit" value={rateUnit} />
              <RateToggle value={rateUnit} onChange={setRateUnit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Shipping ── */}
      <ShippingSection
        savedAddresses={savedAddresses}
        selectedId={warehouseId}
        onSelect={setWarehouseId}
        shipmentFee={shipmentFee}
        onShipmentFee={setShipmentFee}
      />

      {/* ── Live summary ── */}
      <CostSummary formulaWt={fw} measuredWt={mw} quantity={qty} rateValue={rv} rateUnit={rateUnit} shipmentFee={sf} />

      {/* ── Previous records ── */}
      {specComplete && <PreviousBatches batches={prevBatches} loading={loadingPrev} />}

      {/* ── Notes ── */}
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea name="notes" rows={2} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any remarks about this batch…" />
      </div>

      {/* ── Submit ── */}
      <div className="flex items-center gap-3 pt-1">
        {submitStatus === 'ok' ? (
          <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Submitted — awaiting admin approval
          </p>
        ) : (
          <>
            <Button type="submit" disabled={isPending}
              className="bg-[#0b3b46] hover:bg-[#0b3b46]/90 text-white">
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                : 'Submit for approval'}
            </Button>
            {submitStatus === 'error' && (
              <p className="flex items-center gap-1.5 text-[13px] text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errMsg}
              </p>
            )}
          </>
        )}
      </div>

    </form>
  );
}
