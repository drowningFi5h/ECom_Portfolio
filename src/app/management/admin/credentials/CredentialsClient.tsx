'use client';

import { useState, useTransition, useRef } from 'react';
import { Plus, Trash2, UserCheck, UserX, Shield, Users, KeyRound, ChevronDown, ChevronUp, Check, AlertCircle, Loader2 } from 'lucide-react';
import { createRole, deleteRole, createUser, toggleUser, deleteUser, resetPassword } from './actions';
import { AVAILABLE_PAGES } from '@/lib/management-session';
import type { Role, MgmtUser } from './actions';

// ── Shared ────────────────────────────────────────────────────────────────────

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{msg}
    </div>
  );
}

function OkMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2">
      <Check className="h-3.5 w-3.5 shrink-0" />{msg}
    </div>
  );
}

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white';
const btn = (variant: 'primary' | 'danger' | 'ghost') => ({
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  danger:  'border border-red-200 text-red-600 hover:bg-red-50',
  ghost:   'border border-slate-200 text-slate-600 hover:bg-slate-50',
}[variant]);

// ── Roles section ─────────────────────────────────────────────────────────────

function RoleCard({ role }: { role: Role }) {
  const [showPaths, setShowPaths] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr]    = useState('');

  function handleDelete() {
    if (!confirm(`Delete role "${role.label}"?`)) return;
    start(async () => {
      const res = await deleteRole(role.id);
      if (res.error) setErr(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{role.label}</span>
            <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{role.name}</code>
            <span className="text-xs text-slate-400">{role.user_count ?? 0} user{role.user_count !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={() => setShowPaths(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-1.5">
            {showPaths ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {role.allowed_paths.length} page{role.allowed_paths.length !== 1 ? 's' : ''} allowed
          </button>
          {showPaths && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {role.allowed_paths.map(p => {
                const page = AVAILABLE_PAGES.find(ap => ap.path === p);
                return (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                    {page?.label ?? p}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={handleDelete} disabled={pending || (role.user_count ?? 0) > 0}
          title={(role.user_count ?? 0) > 0 ? 'Remove all users first' : 'Delete role'}
          className={`p-1.5 rounded-lg text-xs transition-colors disabled:opacity-30 ${btn('danger')}`}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {err && <ErrMsg msg={err} />}
    </div>
  );
}

function CreateRoleForm() {
  const [open,    setOpen]    = useState(false);
  const [err,     setErr]     = useState('');
  const [ok,      setOk]      = useState(false);
  const [pending, start]      = useTransition();
  const formRef               = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setOk(false);
    start(async () => {
      const res = await createRole(new FormData(e.currentTarget));
      if (res.error) { setErr(res.error); return; }
      setOk(true);
      formRef.current?.reset();
      setTimeout(() => { setOk(false); setOpen(false); }, 1500);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors ${btn('ghost')}`}>
        <Plus className="h-4 w-4" /> New role
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 p-5 space-y-4 bg-slate-50">
      <p className="text-sm font-semibold text-slate-800">Create role</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Display label</label>
          <input name="label" required placeholder="Manufacturer" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Internal name</label>
          <input name="name" required placeholder="manufacturer" className={inp} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Allowed pages</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {AVAILABLE_PAGES.map(page => (
            <label key={page.path} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" name="allowed_paths" value={page.path}
                className="rounded border-slate-300 text-slate-800 focus:ring-slate-400" />
              <span className="text-xs text-slate-600 group-hover:text-slate-900">{page.label}</span>
            </label>
          ))}
        </div>
      </div>

      {err && <ErrMsg msg={err} />}
      {ok  && <OkMsg msg="Role created" />}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${btn('primary')}`}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Create role
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(''); }}
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${btn('ghost')}`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────

function UserRow({ user, roles }: { user: MgmtUser; roles: Role[] }) {
  const [pending, start]   = useTransition();
  const [err, setErr]      = useState('');
  const [showReset, setShowReset] = useState(false);
  const [newPass, setNewPass]     = useState('');
  const [resetOk, setResetOk]     = useState(false);

  function handleToggle() {
    start(async () => {
      const res = await toggleUser(user.id, !user.active);
      if (res.error) setErr(res.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    start(async () => {
      const res = await deleteUser(user.id);
      if (res.error) setErr(res.error);
    });
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await resetPassword(user.id, newPass);
      if (res.error) { setErr(res.error); return; }
      setResetOk(true);
      setNewPass('');
      setTimeout(() => { setResetOk(false); setShowReset(false); }, 2000);
    });
  }

  return (
    <div className={`rounded-xl border p-4 transition-colors ${user.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">{user.display_name ?? user.username}</span>
            <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{user.username}</code>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
              {user.role_label}
            </span>
            {!user.active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                Inactive
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Created {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {user.last_login && ` · Last login ${new Date(user.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setShowReset(v => !v)} title="Reset password"
            className={`p-1.5 rounded-lg text-xs transition-colors ${btn('ghost')}`}>
            <KeyRound className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleToggle} disabled={pending} title={user.active ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg text-xs transition-colors disabled:opacity-40 ${btn('ghost')}`}>
            {user.active
              ? <UserX className="h-3.5 w-3.5 text-amber-500" />
              : <UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
          </button>
          <button onClick={handleDelete} disabled={pending} title="Delete user"
            className={`p-1.5 rounded-lg text-xs transition-colors disabled:opacity-40 ${btn('danger')}`}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {showReset && (
        <form onSubmit={handleResetPassword} className="flex items-center gap-2 mt-3">
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="New password (min 8 chars)" minLength={8} required
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400" />
          <button type="submit" disabled={pending}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${btn('primary')}`}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
          </button>
        </form>
      )}

      {err     && <ErrMsg msg={err} />}
      {resetOk && <OkMsg msg="Password updated" />}
    </div>
  );
}

function CreateUserForm({ roles }: { roles: Role[] }) {
  const [open,    setOpen]    = useState(false);
  const [err,     setErr]     = useState('');
  const [ok,      setOk]      = useState(false);
  const [pending, start]      = useTransition();
  const formRef               = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setOk(false);
    start(async () => {
      const res = await createUser(new FormData(e.currentTarget));
      if (res.error) { setErr(res.error); return; }
      setOk(true);
      formRef.current?.reset();
      setTimeout(() => { setOk(false); setOpen(false); }, 1500);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} disabled={roles.length === 0}
        title={roles.length === 0 ? 'Create a role first' : undefined}
        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-40 ${btn('ghost')}`}>
        <Plus className="h-4 w-4" /> New user
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 p-5 space-y-4 bg-slate-50">
      <p className="text-sm font-semibold text-slate-800">Create user</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
          <input name="username" required placeholder="manufacturer1" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Display name</label>
          <input name="display_name" placeholder="Raj Packaging" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input name="password" type="password" required minLength={8} placeholder="Min 8 characters" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select name="role_id" required className={inp}>
            <option value="">— select role —</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {err && <ErrMsg msg={err} />}
      {ok  && <OkMsg msg="User created" />}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${btn('primary')}`}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Create user
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(''); }}
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${btn('ghost')}`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function CredentialsClient({ roles, users }: { roles: Role[]; users: MgmtUser[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

      {/* Roles column */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Roles</h2>
          <span className="text-xs text-slate-400 ml-auto">{roles.length} defined</span>
        </div>

        <div className="space-y-3">
          {roles.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No roles yet — create one below</p>
          ) : (
            roles.map(r => <RoleCard key={r.id} role={r} />)
          )}
          <CreateRoleForm />
        </div>
      </section>

      {/* Users column */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Users</h2>
          <span className="text-xs text-slate-400 ml-auto">{users.length} total</span>
        </div>

        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No users yet — create one below</p>
          ) : (
            users.map(u => <UserRow key={u.id} user={u} roles={roles} />)
          )}
          <CreateUserForm roles={roles} />
        </div>
      </section>

    </div>
  );
}
