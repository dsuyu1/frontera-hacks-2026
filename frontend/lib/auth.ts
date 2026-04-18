'use client';

const COGNITO_DOMAIN = 'https://frontera-rgv.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = '750ktfl6d9gcoltfi0gndhpd5';
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : 'https://dwzv8106oti1y.cloudfront.net/auth/callback';

export interface AuthUser {
  sub: string;
  email: string;
  username: string;
  idToken: string;
  accessToken: string;
}

function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array)).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c] ?? ''));
  return verifier;
}

async function sha256base64url(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c] ?? ''));
}

export async function startLogin() {
  const verifier = generatePKCE();
  const challenge = await sha256base64url(verifier);
  sessionStorage.setItem('pkce_verifier', verifier);
  const state = Math.random().toString(36).slice(2);
  sessionStorage.setItem('pkce_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'email openid profile',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
}

export async function handleCallback(code: string, returnedState: string): Promise<AuthUser | null> {
  const verifier = sessionStorage.getItem('pkce_verifier');
  const expectedState = sessionStorage.getItem('pkce_state');
  if (!verifier || returnedState !== expectedState) return null;

  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return null;
  const tokens = await res.json();

  const user = parseIdToken(tokens.id_token);
  if (!user) return null;

  const authUser: AuthUser = {
    ...user,
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
  };

  localStorage.setItem('frontera_auth', JSON.stringify(authUser));
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('pkce_state');
  return authUser;
}

function parseIdToken(token: string): { sub: string; email: string; username: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: payload.sub,
      email: payload.email ?? '',
      username: payload['cognito:username'] ?? payload.email ?? payload.sub,
    };
  } catch { return null; }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('frontera_auth');
    if (!raw) return null;
    const user: AuthUser = JSON.parse(raw);
    // Check token expiry
    const payload = JSON.parse(atob(user.idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Date.now() / 1000) {
      localStorage.removeItem('frontera_auth');
      return null;
    }
    return user;
  } catch { return null; }
}

export function logout() {
  localStorage.removeItem('frontera_auth');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: typeof window !== 'undefined' ? window.location.origin : 'https://dwzv8106oti1y.cloudfront.net',
  });
  window.location.href = `${COGNITO_DOMAIN}/logout?${params}`;
}
