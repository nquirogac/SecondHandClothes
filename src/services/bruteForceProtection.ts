const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

interface AttemptState {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const attemptStore = new Map<string, AttemptState>();

function getNow() {
  return Date.now();
}

function getOrCreateState(key: string): AttemptState {
  const now = getNow();
  const existing = attemptStore.get(key);

  if (!existing) {
    const state = { count: 0, firstAttempt: now, lockedUntil: null };
    attemptStore.set(key, state);
    return state;
  }

  if (existing.lockedUntil && now >= existing.lockedUntil) {
    existing.count = 0;
    existing.firstAttempt = now;
    existing.lockedUntil = null;
  }

  if (now - existing.firstAttempt > WINDOW_MS) {
    existing.count = 0;
    existing.firstAttempt = now;
    existing.lockedUntil = null;
  }

  return existing;
}

export function isLoginBlocked(key: string) {
  const state = attemptStore.get(key);
  if (!state) {
    return { blocked: false, retryAfter: null };
  }

  const now = getNow();
  if (state.lockedUntil && now < state.lockedUntil) {
    return { blocked: true, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) };
  }

  return { blocked: false, retryAfter: null };
}

export function recordLoginFailure(key: string) {
  const state = getOrCreateState(key);
  state.count += 1;

  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = getNow() + LOCKOUT_MS;
  }

  return {
    blocked: state.lockedUntil !== null,
    attempts: state.count,
    retryAfter: state.lockedUntil ? Math.ceil((state.lockedUntil - getNow()) / 1000) : null,
  };
}

export function recordLoginSuccess(key: string) {
  attemptStore.delete(key);
}

export function getLoginKey(username?: string, email?: string, userId?: string, ip?: string) {
  if (username) return `login:${username.toLowerCase()}`;
  if (email) return `login:${email.toLowerCase()}`;
  if (userId) return `login:${userId}`;
  return `login:ip:${ip ?? "unknown"}`;
}
