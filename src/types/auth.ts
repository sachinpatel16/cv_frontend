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

// ── Response DTOs ──

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  tenant_id: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}
