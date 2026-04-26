// ─── SHARED AUTH HELPERS ─────────────────────────────────────────

function getToken()   { return localStorage.getItem('rv_token'); }
function getUser()    { try { return JSON.parse(localStorage.getItem('rv_user') || 'null'); } catch(e) { return null; } }
function isLoggedIn() { return !!getToken() && !!getUser(); }
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

// ─── RHODES EMAIL VALIDATION ─────────────────────────────────────
function isRhodesEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  // Accept @ru.ac.za, @campus.ru.ac.za, @rhodesuniversity.ac.za
  return /^[^\s@]+@(campus\.ru\.ac\.za|ru\.ac\.za|rhodesuniversity\.ac\.za)$/.test(lower);
}

// ─── API FETCH ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Check your internet connection or try again shortly.');
  }

  // Handle non-JSON responses (e.g. server crashed, returned HTML)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${res.status}). The database may not be connected yet — check Replit Secrets.`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ─── SERVER HEALTH CHECK ─────────────────────────────────────────
async function checkServerHealth() {
  try {
    const data = await apiFetch('/api/health');
    return data;
  } catch(e) {
    return { status: 'unreachable', db: 'disconnected' };
  }
}

// ─── ROUTE GUARDS ────────────────────────────────────────────────
function requireAuth() {
  if (!isLoggedIn()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/login.html?next=' + next;
  }
}

function requireGuest() {
  if (isLoggedIn()) {
    window.location.href = '/dashboard.html';
  }
}
