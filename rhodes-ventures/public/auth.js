// ─── AUTH HELPERS (shared across all pages) ──────────────────────

const API = '';  // Same origin — no need for absolute URL

function getToken()   { return localStorage.getItem('rv_token'); }
function getUser()    { const u = localStorage.getItem('rv_user'); return u ? JSON.parse(u) : null; }
function isLoggedIn() { return !!getToken(); }
function isAdmin()    { const u = getUser(); return u && u.role === 'admin'; }

function saveSession(token, user) {
  localStorage.setItem('rv_token', token);
  localStorage.setItem('rv_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('rv_token');
  localStorage.removeItem('rv_user');
}

function logout() {
  clearSession();
  window.location.href = '/login.html';
}

// ─── API call helper ─────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

// ─── Guard: redirect to login if not authenticated ───────────────
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
  }
}

// ─── Guard: redirect to dashboard if already logged in ───────────
function requireGuest() {
  if (isLoggedIn()) {
    window.location.href = '/dashboard.html';
  }
}