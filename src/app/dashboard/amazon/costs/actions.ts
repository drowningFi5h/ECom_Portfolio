'use server';

import { createAdminClient } from '@/lib/store/client';

export async function saveCost(data: {
  seller_sku:    string;
  gsm_config:    string | null;
  rate_per_kg:   number;
  box_h:         number | null;
  box_b:         number | null;
  box_l:         number | null;
  pack_qty:      number;
  referral_pct:  number;
  shipping_cost: number;
}): Promise<{ success: boolean; error?: string }> {
  const sb = createAdminClient();
  const payload = {
    seller_sku:    data.seller_sku,
    gsm_config:    data.gsm_config,
    rate_per_kg:   data.rate_per_kg,
    box_h:         data.box_h,
    box_b:         data.box_b,
    box_l:         data.box_l,
    pack_qty:      data.pack_qty,
    referral_pct:  data.referral_pct,
    shipping_cost: data.shipping_cost,
    updated_at:    new Date().toISOString(),
  };

  let { error } = await sb.from('amazon_product_costs').upsert(payload, { onConflict: 'seller_sku' });

  // Graceful fallback: if pack_qty column doesn't exist yet, retry without it
  if (error?.message?.includes('pack_qty')) {
    const { pack_qty: _, ...withoutPackQty } = payload;
    ({ error } = await sb.from('amazon_product_costs').upsert(withoutPackQty, { onConflict: 'seller_sku' }));
  }

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── SP-API price update ───────────────────────────────────────────────────────

async function getLwaToken(): Promise<string> {
  const resp = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.AMAZON_CLIENT_ID!,
      client_secret: process.env.AMAZON_CLIENT_SECRET!,
      refresh_token: process.env.AMAZON_REFRESH_TOKEN!,
    }),
  });
  if (!resp.ok) throw new Error(`LWA token failed: ${resp.status}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error(`No access_token in LWA response`);
  return data.access_token as string;
}

export async function updateAmazonPrice(
  sku:   string,
  price: number,
): Promise<{ success: boolean; error?: string; status?: number }> {
  // Listings Items API requires the Merchant Token (AMAZON_MERCHANT_ID), not the Seller ID
  const sellerId     = process.env.AMAZON_MERCHANT_ID;
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID ?? 'A21TJRUUN4KGV';

  if (!sellerId) {
    return { success: false, error: 'AMAZON_MERCHANT_ID not set in .env — add it to enable price updates' };
  }
  if (!process.env.AMAZON_CLIENT_ID || !process.env.AMAZON_REFRESH_TOKEN) {
    return { success: false, error: 'Amazon credentials missing from .env' };
  }

  let token: string;
  try {
    token = await getLwaToken();
  } catch (e) {
    return { success: false, error: `Auth failed: ${(e as Error).message}` };
  }

  const endpoint = `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}?marketplaceIds=${marketplaceId}`;

  const body = {
    productType: 'PRODUCT',
    patches: [
      {
        op:    'replace',
        path:  '/attributes/purchasable_offer',
        value: [
          {
            currency:       'INR',
            marketplace_id: marketplaceId,
            our_price: [
              {
                schedule: [{ value_with_tax: price }],
              },
            ],
          },
        ],
      },
    ],
  };

  const resp = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Authorization':     `Bearer ${token}`,
      'x-amz-access-token': token,
      'Content-Type':       'application/json',
      'Accept':             'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseBody = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    // Amazon returns structured errors — surface the most useful one
    const issues = (responseBody as { issues?: { message?: string }[] }).issues ?? [];
    const msg    = issues[0]?.message ?? JSON.stringify(responseBody);
    return { success: false, error: msg, status: resp.status };
  }

  // Mirror the new price in our local Supabase inventory record
  const sb = createAdminClient();
  await sb.from('amazon_inventory')
    .update({ listing_price: price })
    .eq('seller_sku', sku);

  return { success: true };
}
