// ── Request DTOs ──

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  tenant_id?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ── Response DTOs ──

/** User profile returned by login, register, refresh, and /auth/me */
export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  tenant_id: string;
}
