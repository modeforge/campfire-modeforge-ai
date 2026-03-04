'use client';

import { useActionState } from 'react';
import { loginAdmin, type AdminAuthState } from '@/app/admin/actions';

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  borderRadius: 0,
  outline: 'none',
};

export function CampfireAdminLogin() {
  const [state, formAction, pending] = useActionState<AdminAuthState, FormData>(
    loginAdmin,
    { authenticated: false }
  );

  if (state.authenticated) {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-light tracking-tight mb-8 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Campfire Admin
        </h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-normal mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              style={inputStyles}
            />
          </div>

          {state.error && (
            <div
              className="text-sm py-3 px-4"
              style={{
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                background: 'var(--bg-secondary)',
              }}
            >
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 0,
            }}
          >
            {pending ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
