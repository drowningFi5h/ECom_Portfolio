import { createAdminClient } from '@/lib/store/client';
import { Tag, TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PricingSuggestion {
  seller_sku: string;
  current_price: number | null;
  competitive_price: number | null;
  suggested_price: number | null;
  strategy: string | null;
  reason: string | null;
  generated_at: string;
  applied: boolean;
}

interface PricingRule {
  seller_sku: string;
  min_price: number;
  max_price: number;
  strategy: string;
  enabled: boolean;
}

async function getRepricerData() {
  const sb = createAdminClient();

  const [suggestionsRes, rulesRes] = await Promise.all([
    sb.from('amazon_price_suggestions')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(200),
    sb.from('amazon_pricing_rules')
      .select('*')
      .order('seller_sku'),
  ]);

  return {
    suggestions: (suggestionsRes.data ?? []) as PricingSuggestion[],
    rules:       (rulesRes.data ?? []) as PricingRule[],
    suggestionsError: suggestionsRes.error,
  };
}

const fmt = (n: number | null) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

export default async function RepricerPage() {
  const { suggestions, rules, suggestionsError } = await getRepricerData();

  const tablesMissing = suggestionsError?.code === '42P01';
  const hasRules      = rules.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Dynamic Repricer</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Price suggestions run daily at 11:00 AM IST · review before applying
          </p>
        </div>
        {hasSuggestions && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full border"
            style={{ background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)', borderColor: 'var(--amz-teal)' }}>
            {suggestions.length} suggestions
          </span>
        )}
      </div>

      {tablesMissing ? (
        <SetupCard />
      ) : !hasRules ? (
        <NoRulesCard />
      ) : !hasSuggestions ? (
        <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <Tag className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--amz-teal)' }} />
          <p className="font-medium" style={{ color: 'var(--amz-charcoal)' }}>No suggestions yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--amz-charcoal-soft)' }}>
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured. Run the repricer to generate suggestions.
          </p>
          <code className="inline-block mt-3 text-xs px-3 py-1.5 rounded" style={{ background: 'var(--amz-beige-border)', color: 'var(--amz-charcoal)' }}>
            python -m pricing.repricer
          </code>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <SummaryPill label="Total"    value={suggestions.length}                            color="var(--amz-charcoal)"     bg="var(--amz-beige)" />
            <SummaryPill label="Lower"    value={suggestions.filter(s => (s.suggested_price ?? 0) < (s.current_price ?? 0)).length} color="#dc2626" bg="#fef2f2" />
            <SummaryPill label="Higher"   value={suggestions.filter(s => (s.suggested_price ?? 0) > (s.current_price ?? 0)).length} color="var(--amz-teal-dark)" bg="var(--amz-teal-light)" />
            <SummaryPill label="No change" value={suggestions.filter(s => s.suggested_price === s.current_price).length}           color="var(--amz-charcoal-soft)" bg="var(--amz-beige)" />
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                  <th className="text-left px-5 py-3.5">SKU</th>
                  <th className="text-right px-3 py-3.5">Current</th>
                  <th className="text-right px-3 py-3.5">Competitive</th>
                  <th className="text-right px-3 py-3.5">Suggested</th>
                  <th className="text-center px-3 py-3.5">Change</th>
                  <th className="text-left px-3 py-3.5">Strategy</th>
                  <th className="text-left px-5 py-3.5">Reason</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, i) => {
                  const diff = (s.suggested_price ?? 0) - (s.current_price ?? 0);
                  const pct  = s.current_price ? ((diff / s.current_price) * 100).toFixed(1) : null;

                  return (
                    <tr key={s.seller_sku}
                      className="border-b last:border-0"
                      style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--amz-charcoal)' }}>{s.seller_sku}</td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--amz-charcoal-soft)' }}>{fmt(s.current_price)}</td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--amz-charcoal-soft)' }}>{fmt(s.competitive_price)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--amz-charcoal)' }}>{fmt(s.suggested_price)}</td>
                      <td className="px-3 py-3 text-center">
                        {diff === 0 ? (
                          <span style={{ color: 'var(--amz-charcoal-muted)' }}><Minus className="h-3.5 w-3.5 inline" /></span>
                        ) : diff < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: '#dc2626' }}>
                            <TrendingDown className="h-3.5 w-3.5" />{pct}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: 'var(--amz-teal-dark)' }}>
                            <TrendingUp className="h-3.5 w-3.5" />+{pct}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)' }}>
                          {s.strategy ?? 'default'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs max-w-[220px] truncate" style={{ color: 'var(--amz-charcoal-soft)' }}>
                        {s.reason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryPill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="rounded-xl border px-4 py-3 text-center min-w-[80px]"
      style={{ background: bg, borderColor: 'var(--amz-beige-border)' }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>{label}</p>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="rounded-2xl border p-8" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5" style={{ color: 'var(--amz-teal-dark)' }} />
        <h3 className="font-semibold" style={{ color: 'var(--amz-charcoal)' }}>Database setup required</h3>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--amz-charcoal-soft)' }}>
        Run this SQL in your Supabase SQL editor to enable the repricer:
      </p>
      <pre className="text-xs p-4 rounded-xl overflow-x-auto" style={{ background: 'var(--amz-charcoal)', color: 'var(--amz-cream)' }}>{`CREATE TABLE IF NOT EXISTS amazon_pricing_rules (
    seller_sku   TEXT PRIMARY KEY,
    min_price    NUMERIC NOT NULL,
    max_price    NUMERIC NOT NULL,
    strategy     TEXT    NOT NULL DEFAULT 'match_competitive',
    undercut_by  NUMERIC DEFAULT 2,
    margin_pct   NUMERIC DEFAULT 20,
    cost_price   NUMERIC,
    enabled      BOOL    DEFAULT true,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS amazon_price_suggestions (
    seller_sku        TEXT PRIMARY KEY,
    current_price     NUMERIC,
    competitive_price NUMERIC,
    suggested_price   NUMERIC,
    strategy          TEXT,
    reason            TEXT,
    generated_at      TIMESTAMPTZ DEFAULT now(),
    applied           BOOL DEFAULT false
);`}</pre>
    </div>
  );
}

function NoRulesCard() {
  return (
    <div className="rounded-2xl border p-8" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5" style={{ color: 'var(--amz-teal-dark)' }} />
        <h3 className="font-semibold" style={{ color: 'var(--amz-charcoal)' }}>No pricing rules configured</h3>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--amz-charcoal-soft)' }}>
        Add rules to <code style={{ background: 'var(--amz-beige-border)', padding: '1px 6px', borderRadius: 4 }}>amazon_pricing_rules</code> to start generating suggestions.
        Three strategies available:
      </p>
      <ul className="text-sm space-y-1.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
        <li><strong style={{ color: 'var(--amz-charcoal)' }}>match_competitive</strong> — match the current competitive price (clamped to min/max)</li>
        <li><strong style={{ color: 'var(--amz-charcoal)' }}>undercut_by</strong> — beat competitive price by a fixed amount (e.g. ₹2)</li>
        <li><strong style={{ color: 'var(--amz-charcoal)' }}>fixed_margin</strong> — price at your cost × (1 + margin%)</li>
      </ul>
      <pre className="text-xs mt-4 p-3 rounded-xl" style={{ background: 'var(--amz-charcoal)', color: 'var(--amz-cream)' }}>{`-- Example rule:
INSERT INTO amazon_pricing_rules
  (seller_sku, min_price, max_price, strategy, undercut_by)
VALUES
  ('MY-SKU-001', 250, 450, 'undercut_by', 5);`}</pre>
    </div>
  );
}
