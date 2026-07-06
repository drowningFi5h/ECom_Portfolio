import { createAdminClient } from '@/lib/store/client';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Info } from 'lucide-react';
import { costBreakdown } from '@/lib/amazon-costs';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Settlement {
  group_id:             string;
  processing_status:    string;
  fund_transfer_status: string;
  period_start:         string;
  period_end:           string;
  fund_transfer_date:   string | null;
  total_amount:         number;
  currency:             string;
  service_fees:         number;
  adjustments:          number;
  other_amount:         number;
}

interface FinancialEvent {
  id:               number;
  group_id:         string;
  amazon_order_id:  string;
  seller_sku:       string;
  event_type:       string;
  posted_date:      string;
  quantity:         number;
  principal:        number;
  shipping_charge:  number;
  referral_fee:     number;
  variable_closing: number;
  fixed_closing:    number;
  other_fees:       number;
  promotion_amount: number;
  net_amazon:       number;
}

interface ProductCost {
  seller_sku:    string;
  gsm_config:    string | null;
  rate_per_kg:   number;
  box_h:         number | null;
  box_b:         number | null;
  box_l:         number | null;
  referral_pct:  number;
  shipping_cost: number;
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getData() {
  const sb = createAdminClient();

  const [settleRes, eventsRes, costsRes] = await Promise.all([
    sb.from('amazon_settlements')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(13),
    sb.from('amazon_financial_events')
      .select('*')
      .order('posted_date', { ascending: false })
      .limit(2000),
    sb.from('amazon_product_costs')
      .select('seller_sku, gsm_config, rate_per_kg, box_h, box_b, box_l, referral_pct, shipping_cost'),
  ]);

  const tablesMissing = settleRes.error?.code === '42P01' || eventsRes.error?.code === '42P01';

  return {
    settlements: (settleRes.data ?? []) as Settlement[],
    events:      (eventsRes.data ?? []) as FinancialEvent[],
    costs:       (costsRes.data ?? []) as ProductCost[],
    tablesMissing,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

const inr = (n: number, dec = 0) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const signed = (n: number, dec = 0) =>
  n === 0 ? '—' : (n > 0 ? '+' : '−') + inr(n, dec);

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

const monthLabel = (iso: string) =>
  new Date(iso + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

// ── Monthly P&L aggregation ───────────────────────────────────────────────────

interface MonthStats {
  units:       number;
  gross:       number;
  amazonFees:  number;
  netAmazon:   number;
  refunds:     number;
  totalCost:   number;
  net:         number;
  hasCost:     boolean;
}

function buildMonthlyPL(
  events: FinancialEvent[],
  costMap: Map<string, ProductCost>,
): { month: string; stats: MonthStats }[] {
  const map = new Map<string, MonthStats>();

  for (const e of events) {
    const month = e.posted_date?.slice(0, 7);
    if (!month) continue;

    if (!map.has(month)) {
      map.set(month, { units: 0, gross: 0, amazonFees: 0, netAmazon: 0, refunds: 0, totalCost: 0, net: 0, hasCost: false });
    }
    const s = map.get(month)!;

    if (e.event_type === 'shipment') {
      s.units     += e.quantity;
      s.gross     += e.principal;
      s.amazonFees += Math.abs(e.referral_fee + e.variable_closing + e.fixed_closing + e.other_fees);
      s.netAmazon += e.net_amazon;

      const pc = costMap.get(e.seller_sku);
      if (pc?.gsm_config) {
        const bd = costBreakdown(
          e.seller_sku, pc.gsm_config, pc.rate_per_kg,
          pc.box_h, pc.box_b, pc.box_l,
          e.principal / (e.quantity || 1),
          pc.referral_pct ?? 5,
          pc.shipping_cost ?? 0,
        );
        if (bd) {
          const eventCost = bd.totalCost * e.quantity;
          s.totalCost += eventCost;
          s.net       += e.net_amazon - eventCost;
          s.hasCost    = true;
        }
      }
    } else if (e.event_type === 'refund') {
      s.refunds   += e.principal;   // principal is negative for refunds
      s.netAmazon += e.net_amazon;
    }
  }

  return Array.from(map.entries())
    .map(([month, stats]) => ({ month, stats }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// ── SKU profitability ─────────────────────────────────────────────────────────

interface SkuStats {
  units: number; gross: number; amazonFees: number;
  netAmazon: number; totalCost: number; net: number; hasCost: boolean;
}

function buildSkuSummary(
  events: FinancialEvent[],
  costMap: Map<string, ProductCost>,
): { seller_sku: string; stats: SkuStats }[] {
  const map = new Map<string, SkuStats>();

  for (const e of events) {
    if (e.event_type !== 'shipment') continue;
    if (!map.has(e.seller_sku)) {
      map.set(e.seller_sku, { units: 0, gross: 0, amazonFees: 0, netAmazon: 0, totalCost: 0, net: 0, hasCost: false });
    }
    const s = map.get(e.seller_sku)!;
    s.units     += e.quantity;
    s.gross     += e.principal;
    s.amazonFees += Math.abs(e.referral_fee + e.variable_closing + e.fixed_closing + e.other_fees);
    s.netAmazon += e.net_amazon;

    const pc = costMap.get(e.seller_sku);
    if (pc?.gsm_config) {
      const bd = costBreakdown(
        e.seller_sku, pc.gsm_config, pc.rate_per_kg,
        pc.box_h, pc.box_b, pc.box_l,
        e.principal / (e.quantity || 1),
        pc.referral_pct ?? 5,
        pc.shipping_cost ?? 0,
      );
      if (bd) {
        const cost = bd.totalCost * e.quantity;
        s.totalCost += cost;
        s.net       += e.net_amazon - cost;
        s.hasCost    = true;
      }
    }
  }

  return Array.from(map.entries())
    .map(([seller_sku, stats]) => ({ seller_sku, stats }))
    .sort((a, b) => b.stats.gross - a.stats.gross);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FinancePage() {
  const { settlements, events, costs, tablesMissing } = await getData();

  if (tablesMissing) return <SetupCard />;

  const costMap    = new Map(costs.map(c => [c.seller_sku, c]));
  const monthly    = buildMonthlyPL(events, costMap);
  const skuSummary = buildSkuSummary(events, costMap);

  const shipEvents = events.filter(e => e.event_type === 'shipment');
  const totalPaid    = settlements.filter(s => s.fund_transfer_status === 'Successful').reduce((a, s) => a + s.total_amount, 0);
  const totalNetAmz  = shipEvents.reduce((a, e) => a + e.net_amazon, 0);
  const totalGross   = shipEvents.reduce((a, e) => a + e.principal, 0);
  const uniqueOrders = new Set(events.map(e => e.amazon_order_id)).size;
  const costsSet     = costs.filter(c => c.gsm_config).length;

  // Best month for the summary
  const bestMonth = monthly.reduce<{ month: string; net: number } | null>((best, { month, stats }) =>
    stats.hasCost && (!best || stats.net > best.net) ? { month, net: stats.net } : best
  , null);

  const enrichedEvents = events.slice(0, 150).map(e => {
    const pc = costMap.get(e.seller_sku);
    const bd = pc?.gsm_config
      ? costBreakdown(e.seller_sku, pc.gsm_config, pc.rate_per_kg, pc.box_h, pc.box_b, pc.box_l, e.principal / (e.quantity || 1), pc.referral_pct ?? 5, pc.shipping_cost ?? 0)
      : null;
    const totalCost = bd ? bd.totalCost * e.quantity : null;
    const netFull   = totalCost != null ? e.net_amazon - totalCost : null;
    const margin    = netFull != null && e.principal > 0 ? (netFull / e.principal) * 100 : null;
    return { ...e, totalCost, netFull, margin };
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Finance</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
          Settlements · P&amp;L · reconciliation
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total paid out"   value={inr(totalPaid)}          sub={`${settlements.length} settlements`}       color="var(--amz-teal-dark)"     bg="var(--amz-teal-light)" />
        <StatCard label="Gross revenue"    value={inr(totalGross)}         sub="principal from shipments"                  color="var(--amz-charcoal)"      bg="var(--amz-beige)" />
        <StatCard label="Net from Amazon"  value={inr(totalNetAmz)}        sub="after all Amazon fees"                     color="var(--amz-charcoal-soft)" bg="var(--amz-beige)" />
        <StatCard
          label="Best month"
          value={bestMonth ? inr(bestMonth.net) : '—'}
          sub={bestMonth ? monthLabel(bestMonth.month + '-01') : 'Configure costs to see'}
          color={bestMonth ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal-muted)'}
          bg="var(--amz-teal-light)"
        />
      </div>

      {costsSet === 0 && (
        <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            No cost configs set — Net profit columns will be empty.{' '}
            <strong>Go to the Costs tab</strong> to configure GSM per SKU.
          </p>
        </div>
      )}

      {/* ── Monthly P&L ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--amz-charcoal)' }}>Monthly P&amp;L</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--amz-charcoal-muted)' }}>
          Based on event posted dates · net profit requires cost config in the Costs tab
        </p>

        {monthly.length === 0 ? (
          <EmptyState message="No events yet — run: python -m finance.sync_finance" />
        ) : (
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">Month</th>
                  <th className="text-right px-3 py-3.5">Units</th>
                  <th className="text-right px-3 py-3.5">Gross rev</th>
                  <th className="text-right px-3 py-3.5">Refunds</th>
                  <th className="text-right px-3 py-3.5">Amazon fees</th>
                  <th className="text-right px-3 py-3.5">Net (Amazon)</th>
                  <th className="text-right px-3 py-3.5">COGS + packer</th>
                  <th className="text-right px-5 py-3.5">Net profit</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map(({ month, stats }, i) => {
                  const margin = stats.hasCost && stats.gross > 0
                    ? (stats.net / stats.gross) * 100
                    : null;
                  return (
                    <tr key={month} className="border-b last:border-0"
                      style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                      <td className="px-5 py-3.5 font-semibold text-sm" style={{ color: 'var(--amz-charcoal)' }}>
                        {monthLabel(month + '-01')}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {stats.units}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-sm font-semibold" style={{ color: 'var(--amz-charcoal)' }}>
                        {inr(stats.gross)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: stats.refunds < 0 ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                        {stats.refunds !== 0 ? signed(stats.refunds) : '—'}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: '#dc2626' }}>
                        −{inr(stats.amazonFees)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {inr(stats.netAmazon)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: stats.hasCost ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                        {stats.hasCost ? `−${inr(stats.totalCost)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {stats.hasCost ? (
                          <div>
                            <span className="text-sm font-bold"
                              style={{ color: stats.net >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                              {stats.net >= 0 ? '' : '−'}{inr(Math.abs(stats.net))}
                            </span>
                            {margin != null && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                                {margin.toFixed(1)}% margin
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>no cost config</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              {monthly.length > 1 && (() => {
                const tot = monthly.reduce((acc, { stats }) => ({
                  units:      acc.units + stats.units,
                  gross:      acc.gross + stats.gross,
                  refunds:    acc.refunds + stats.refunds,
                  amazonFees: acc.amazonFees + stats.amazonFees,
                  netAmazon:  acc.netAmazon + stats.netAmazon,
                  totalCost:  acc.totalCost + stats.totalCost,
                  net:        acc.net + stats.net,
                  hasCost:    acc.hasCost || stats.hasCost,
                }), { units: 0, gross: 0, refunds: 0, amazonFees: 0, netAmazon: 0, totalCost: 0, net: 0, hasCost: false });
                return (
                  <tfoot>
                    <tr className="border-t-2" style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
                      <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--amz-charcoal-soft)' }}>Total</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-bold" style={{ color: 'var(--amz-charcoal)' }}>{tot.units}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-sm font-bold" style={{ color: 'var(--amz-charcoal)' }}>{inr(tot.gross)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-bold" style={{ color: '#dc2626' }}>{tot.refunds !== 0 ? signed(tot.refunds) : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-bold" style={{ color: '#dc2626' }}>−{inr(tot.amazonFees)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-bold" style={{ color: 'var(--amz-charcoal)' }}>{inr(tot.netAmazon)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-bold" style={{ color: '#dc2626' }}>{tot.hasCost ? `−${inr(tot.totalCost)}` : '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-sm font-bold" style={{ color: tot.net >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                        {tot.hasCost ? `${tot.net >= 0 ? '' : '−'}${inr(Math.abs(tot.net))}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
      </section>

      {/* ── Settlements with reconciliation ─────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--amz-charcoal)' }}>Settlements</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--amz-charcoal-muted)' }}>
          14-day payout cycles · service fees and adjustments from last sync
        </p>

        {settlements.length === 0 ? (
          <EmptyState message="No settlements found — run the finance sync." />
        ) : (
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">Period</th>
                  <th className="text-center px-3 py-3.5">Status</th>
                  <th className="text-right px-3 py-3.5">Orders net</th>
                  <th className="text-right px-3 py-3.5">Service fees</th>
                  <th className="text-right px-3 py-3.5">Adjustments</th>
                  <th className="text-right px-3 py-3.5">Other</th>
                  <th className="text-right px-3 py-3.5">Transfer date</th>
                  <th className="text-right px-5 py-3.5">Amazon paid</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s, i) => {
                  // Orders net = total_amount minus the non-order items
                  const ordersNet = s.total_amount - (s.service_fees ?? 0) - (s.adjustments ?? 0) - (s.other_amount ?? 0);
                  return (
                    <tr key={s.group_id} className="border-b last:border-0"
                      style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--amz-charcoal)' }}>
                        {dt(s.period_start)} – {dt(s.period_end)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={
                            s.processing_status === 'Closed'
                              ? { background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)' }
                              : { background: '#fffbeb', color: '#d97706' }
                          }>
                          {s.processing_status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {inr(ordersNet)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs"
                        style={{ color: (s.service_fees ?? 0) < 0 ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                        {(s.service_fees ?? 0) !== 0 ? signed(s.service_fees ?? 0) : '—'}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs"
                        style={{ color: (s.adjustments ?? 0) > 0 ? 'var(--amz-teal-dark)' : (s.adjustments ?? 0) < 0 ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                        {(s.adjustments ?? 0) !== 0 ? signed(s.adjustments ?? 0) : '—'}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>
                        {(s.other_amount ?? 0) !== 0 ? signed(s.other_amount ?? 0) : '—'}
                      </td>
                      <td className="px-3 py-3.5 text-right text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {dt(s.fund_transfer_date)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-bold"
                        style={{ color: s.total_amount >= 0 ? 'var(--amz-teal-dark)' : '#dc2626', fontSize: '0.9rem' }}>
                        {s.total_amount >= 0 ? '' : '−'}{inr(s.total_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── SKU Profitability ────────────────────────────────────────────── */}
      {skuSummary.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--amz-charcoal)' }}>SKU Profitability</h2>
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm" style={{ minWidth: 780 }}>
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">SKU</th>
                  <th className="text-right px-3 py-3.5">Units</th>
                  <th className="text-right px-3 py-3.5">Gross rev</th>
                  <th className="text-right px-3 py-3.5">Amazon fees</th>
                  <th className="text-right px-3 py-3.5">Net (Amazon)</th>
                  <th className="text-right px-3 py-3.5">COGS + packer</th>
                  <th className="text-right px-5 py-3.5">Net profit</th>
                </tr>
              </thead>
              <tbody>
                {skuSummary.map(({ seller_sku, stats }, i) => {
                  const margin = stats.hasCost && stats.gross > 0 ? (stats.net / stats.gross) * 100 : null;
                  return (
                    <tr key={seller_sku} className="border-b last:border-0"
                      style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--amz-charcoal)' }}>{seller_sku}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>{stats.units}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--amz-charcoal)' }}>{inr(stats.gross)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs" style={{ color: '#dc2626' }}>−{inr(stats.amazonFees)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>{inr(stats.netAmazon)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs" style={{ color: stats.hasCost ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                        {stats.hasCost ? `−${inr(stats.totalCost)}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {stats.hasCost ? (
                          <div>
                            <span className="text-xs font-bold"
                              style={{ color: stats.net >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                              {stats.net >= 0 ? '' : '−'}{inr(Math.abs(stats.net))}
                            </span>
                            {margin != null && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                                {margin.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--amz-charcoal-muted)' }}>no cost config</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Order-level P&L ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--amz-charcoal)' }}>Order P&amp;L</h2>
          <span className="text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>150 most recent events</span>
        </div>

        {events.length === 0 ? (
          <EmptyState message="No financial events yet — run: python -m finance.sync_finance" />
        ) : (
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm" style={{ minWidth: 940 }}>
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">Order / date</th>
                  <th className="text-left px-3 py-3.5">SKU</th>
                  <th className="text-center px-3 py-3.5">Type</th>
                  <th className="text-right px-3 py-3.5">Gross</th>
                  <th className="text-right px-3 py-3.5">Referral</th>
                  <th className="text-right px-3 py-3.5">Closing</th>
                  <th className="text-right px-3 py-3.5">Net (Amz)</th>
                  <th className="text-right px-3 py-3.5">COGS+packer</th>
                  <th className="text-right px-5 py-3.5">Net / margin</th>
                </tr>
              </thead>
              <tbody>
                {enrichedEvents.map((e, i) => (
                  <tr key={e.id} className="border-b last:border-0"
                    style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                    <td className="px-5 py-2.5">
                      <p className="font-mono text-[11px]" style={{ color: 'var(--amz-charcoal)' }}>{e.amazon_order_id || '—'}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>{dt(e.posted_date)}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] max-w-[130px] truncate" style={{ color: 'var(--amz-charcoal-soft)' }}>
                      {e.seller_sku || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={
                          e.event_type === 'shipment'
                            ? { background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)' }
                            : { background: '#fef2f2', color: '#dc2626' }
                        }>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--amz-charcoal)' }}>
                      {inr(e.principal)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs" style={{ color: '#dc2626' }}>
                      {e.referral_fee !== 0 ? `${e.referral_fee > 0 ? '' : '−'}${inr(e.referral_fee)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs" style={{ color: '#dc2626' }}>
                      {(e.variable_closing + e.fixed_closing) !== 0
                        ? `−${inr(Math.abs(e.variable_closing + e.fixed_closing))}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                      {inr(e.net_amazon)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs"
                      style={{ color: e.totalCost != null ? '#dc2626' : 'var(--amz-charcoal-muted)' }}>
                      {e.totalCost != null ? `−${inr(e.totalCost, 2)}` : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {e.netFull != null ? (
                        <div>
                          <span className="text-xs font-bold inline-flex items-center gap-0.5"
                            style={{ color: e.netFull >= 0 ? 'var(--amz-teal-dark)' : '#dc2626' }}>
                            {e.netFull >= 0
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />}
                            {e.netFull >= 0 ? '' : '−'}{inr(Math.abs(e.netFull), 2)}
                          </span>
                          {e.margin != null && (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>
                              {Math.abs(e.margin).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <Minus className="h-3 w-3 ml-auto" style={{ color: 'var(--amz-charcoal-muted)' }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: 'var(--amz-beige-border)' }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--amz-charcoal-soft)' }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--amz-charcoal-muted)' }}>{sub}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-14 rounded-2xl border" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
      <Info className="h-7 w-7 mx-auto mb-3" style={{ color: 'var(--amz-charcoal-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>{message}</p>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--amz-charcoal)' }}>Finance</h1>
      <div className="rounded-2xl border p-8" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--amz-charcoal)' }}>Database setup required</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--amz-charcoal-soft)' }}>Run this SQL, then sync:</p>
        <pre className="text-xs p-4 rounded-xl overflow-x-auto mb-4" style={{ background: 'var(--amz-charcoal)', color: 'var(--amz-cream)' }}>{`CREATE TABLE IF NOT EXISTS amazon_settlements ( ... );
CREATE TABLE IF NOT EXISTS amazon_financial_events ( ... );
-- See database.py for full schema`}</pre>
        <code className="text-xs px-3 py-1.5 rounded" style={{ background: 'var(--amz-beige-border)', color: 'var(--amz-charcoal)' }}>
          python -m finance.sync_finance
        </code>
      </div>
    </div>
  );
}
