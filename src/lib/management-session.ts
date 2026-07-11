// Edge-safe (Web Crypto API only) — safe to import in proxy.ts

export interface SessionPayload {
  userId:       string;
  username:     string;
  displayName:  string;
  role:         string;
  allowedPaths: string[];
}

async function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const data   = btoa(JSON.stringify(payload));
  const key    = await importKey(secret, 'sign');
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${data}.${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  try {
    const key      = await importKey(secret, 'verify');
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    return JSON.parse(atob(data)) as SessionPayload;
  } catch {
    return null;
  }
}

// Password hashing — Node.js only, do NOT import in proxy.ts
export function hashPassword(password: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pbkdf2Sync, randomBytes } = require('crypto') as typeof import('crypto');
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pbkdf2Sync, timingSafeEqual } = require('crypto') as typeof import('crypto');
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

// Available pages for role assignment
export const AVAILABLE_PAGES = [
  { path: '/management',               label: 'Store — Submissions'    },
  { path: '/management/products',      label: 'Store — Products'       },
  { path: '/management/orders',        label: 'Store — Orders'         },
  { path: '/management/bulk-orders',   label: 'Store — Bulk Orders'    },
  { path: '/management/amazon',        label: 'Amazon — Overview'      },
  { path: '/management/amazon/orders', label: 'Amazon — Orders'        },
  { path: '/management/amazon/inventory', label: 'Amazon — Inventory'  },
  { path: '/management/amazon/costs',  label: 'Amazon — Costs'         },
  { path: '/management/amazon/pricing', label: 'Amazon — Pricing'      },
  { path: '/management/amazon/finance', label: 'Amazon — Finance'      },
  { path: '/management/manufacturer',  label: 'Manufacturer Portal'    },
] as const;
