import { getRolesAndUsers } from './actions';
import CredentialsClient from './CredentialsClient';

export const dynamic = 'force-dynamic';

export default async function CredentialsPage() {
  const { roles, users, tablesMissing } = await getRolesAndUsers();

  if (tablesMissing) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Credentials</h1>
        <p className="text-sm text-slate-500 mb-6">Manage roles and user access</p>
        <div className="rounded-2xl border p-6 bg-amber-50 border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-2">Database tables not set up</p>
          <p className="text-xs text-amber-700 mb-4">Run this SQL in your Supabase SQL editor:</p>
          <pre className="text-xs rounded-xl p-4 overflow-x-auto bg-slate-900 text-slate-100">{`CREATE TABLE IF NOT EXISTS management_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  allowed_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS management_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id       UUID NOT NULL REFERENCES management_roles(id) ON DELETE RESTRICT,
  display_name  TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_login    TIMESTAMPTZ
);`}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Credentials</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define roles, assign page access, and manage user accounts</p>
      </div>
      <CredentialsClient roles={roles} users={users} />
    </div>
  );
}
