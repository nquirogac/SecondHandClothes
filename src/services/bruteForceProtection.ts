const MAX_ATTEMPTS = 4;
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
  const wasAlreadyBlocked = state.lockedUntil !== null;
  state.count += 1;

  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = getNow() + LOCKOUT_MS;
  }

  return {
    blocked: wasAlreadyBlocked,
    attempts: state.count,
    retryAfter: state.lockedUntil ? Math.ceil((state.lockedUntil - getNow()) / 1000) : null,
  };
}

export function recordLoginSuccess(key: string) {
  attemptStore.delete(key);
}

export function getLoginKey(email: string, ip?: string) {
  return `login:${email.toLowerCase()}`;
}
