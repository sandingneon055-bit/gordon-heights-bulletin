/* ═══════════════════════════════════════════════════════════
   Barangay Gordon Heights – Bulletin System Frontend JS
   All API calls connect to the Flask backend
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const State = {
  user:          null,
  currentPage:   '',
  annPage:       1,
  annFilter:     'all',
  annSearch:     '',
  calDate:       new Date(),
  calEvents:     [],
  selectedSev:   'MEDIUM',
  editAnnId:     null,
};

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

const API = {
  get:    (path)        => api('GET',    path),
  post:   (path, body)  => api('POST',   path, body),
  put:    (path, body)  => api('PUT',    path, body),
  del:    (path)        => api('DELETE', path),
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const stack = document.getElementById('toast-stack');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'✅', error:'❌', warning:'⚠️', '':'ℹ️' };
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  stack.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='.3s'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modal-title').innerHTML  = title;
  document.getElementById('modal-body').innerHTML   = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  State.editAnnId = null;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function catIcon(cat) {
  return { general:'📌', emergency:'🚨', event:'📅', health:'💊' }[cat] || '📋';
}
function catColor(cat) {
  return { general:'#e8f2ff', emergency:'#fdecea', event:'#e8f8f0', health:'#fff8e8' }[cat] || '#f0f0f0';
}
function sevColor(sev) {
  return { HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--green)' }[sev] || 'var(--muted)';
}
function priorityClass(p) {
  return { High:'badge-high', Medium:'badge-medium', Low:'badge-low' }[p] || '';
}
function statusClass(s) {
  return { Pending:'badge-pending', 'In Progress':'badge-progress', Resolved:'badge-resolved',
           Published:'badge-published', Draft:'badge-draft' }[s] || '';
}
function emptyState(msg, sub = '', icon = '📭') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${msg}</div><div class="empty-sub">${sub}</div></div>`;
}
function loading() {
  return `<div class="loading"><div class="spinner"></div> Loading…</div>`;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById(`pg-${page}`);
  if (el) el.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  document.getElementById('user-menu').classList.remove('open');
  State.currentPage = page;

  // Load data for each page
  const loaders = {
    'dashboard':         loadDashboard,
    'announcements':     () => loadAnnouncements(1, State.annFilter, State.annSearch),
    'calendar':          loadCalendar,
    'alerts':            loadAlerts,
    'hotlines':          loadHotlines,
    'my-reports':        loadMyReports,
    'report-issue':      () => {},
    'profile':           loadProfile,
    'admin-dashboard':   loadAdminDashboard,
    'admin-post':        () => {},
    'admin-manage':      () => loadManage(null, 'all'),
    'admin-reports':     () => loadAdminReports(null, ''),
    'admin-events':      loadAdminEvents,
    'admin-alerts':      loadAdminAlerts,
    'admin-analytics':   loadAnalytics,
    'admin-users':       loadUsers,
    'admin-sensors':     loadSensors,
  };
  if (loaders[page]) loaders[page]();
}

// ─── Sidebar toggle ───────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Mobile: slide in/out from left
    const isOpen = sidebar.classList.toggle('open');
    // Show/hide overlay
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'sidebar-overlay';
      overlay.onclick = () => toggleSidebar();
      document.getElementById('app-shell').appendChild(overlay);
    }
    overlay.style.display = isOpen ? 'block' : 'none';
  } else {
    // Desktop: collapse/expand width
    sidebar.classList.toggle('collapsed');
  }
}

// Close sidebar when clicking a nav item on mobile
document.addEventListener('click', e => {
  if (window.innerWidth <= 768 && e.target.closest('.nav-item')) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.style.display = 'none';
  }
});
function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('open');
}
document.addEventListener('click', e => {
  const um = document.getElementById('user-menu');
  if (!e.target.closest('.user-chip')) um.classList.remove('open');
  if (!e.target.closest('.global-search')) {
    document.getElementById('search-results').classList.remove('open');
  }
});

// ─── Password toggle ──────────────────────────────────────────────────────────
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function showAuthTab(tab) {
  // Show/hide forms
  const forms = { login: 'form-login', register: 'form-register', guest: 'form-guest' };
  Object.entries(forms).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (tab === key) ? '' : 'none';
  });

  // Update tab active state
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');

  // Clear all error messages
  ['login-error', 'register-error', 'guest-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  // Stop camera if leaving guest tab
  if (tab !== 'guest' && typeof stopGuestCamera === 'function') stopGuestCamera();

  // Reset terms checkboxes when switching tabs
  const lt = document.getElementById('login-terms');
  const rt = document.getElementById('register-terms');
  if (lt) { lt.checked = false; toggleLoginBtn(); }
  if (rt) { rt.checked = false; toggleRegisterBtn(); }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

async function doLogin() {
  // Hard check — terms must be agreed
  const termsChecked = document.getElementById('login-terms')?.checked;
  if (!termsChecked) {
    showError('login-error', 'You must agree to the Terms and Conditions before signing in.');
    return;
  }

  const identifier = document.getElementById('login-identifier').value.trim();
  const password   = document.getElementById('login-password').value;
  if (!identifier || !password) { showError('login-error', 'Please enter your username/email and password.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';

  try {
    const res = await API.post('/api/auth/login', { identifier, password });
    State.user = res.user;
    initApp();
  } catch(e) {
    showError('login-error', e.message);
    // Re-enable only if terms still checked
    const stillChecked = document.getElementById('login-terms')?.checked;
    btn.disabled = !stillChecked;
    btn.style.opacity = stillChecked ? '1' : '0.5';
    btn.textContent = 'Sign In';
  }
}

// doRegister defined below with full non-citizen + terms support

async function doLogout() {
  await API.post('/api/auth/logout').catch(() => {});
  State.user = null;
  document.getElementById('app-shell').style.display   = 'none';
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('login-identifier').value = '';
  document.getElementById('login-password').value   = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('auth-screen') && document.getElementById('auth-screen').style.display !== 'none') {
    const isLoginActive    = document.getElementById('tab-login').classList.contains('active');
    const isRegisterActive = document.getElementById('tab-register').classList.contains('active');
    const loginTerms       = document.getElementById('login-terms')?.checked;
    const registerTerms    = document.getElementById('register-terms')?.checked;

    if (isLoginActive && loginTerms)       doLogin();
    else if (isRegisterActive && registerTerms) doRegister();
    // If terms not checked, do nothing — button is disabled
  }
});

// ─── Init App ─────────────────────────────────────────────────────────────────
async function initApp() {
  const u = State.user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display   = '';

  // Topbar user info
  document.getElementById('topbar-name').textContent = u.full_name;
  document.getElementById('topbar-role').textContent = u.role === 'admin' ? 'Admin Official' : (u.address || 'Resident');
  document.getElementById('topbar-avatar').textContent = u.full_name.charAt(0).toUpperCase();

  // Show correct nav
  document.getElementById('nav-resident').style.display = u.role === 'admin' ? 'none' : '';
  document.getElementById('nav-admin').style.display    = u.role === 'admin' ? '' : 'none';

  // Populate post audience options
  try {
    const data = await API.get('/api/puroks');
    const sel = document.getElementById('post-audience');
    sel.innerHTML = '<option>All Residents</option>';
    data.puroks.forEach(p => { const o = document.createElement('option'); o.textContent = p; sel.appendChild(o); });
  } catch(e) {}

  // Dashboard name
  document.getElementById('dash-name').textContent = u.full_name.split(' ')[0];

  // Navigate
  navigate(u.role === 'admin' ? 'admin-dashboard' : 'dashboard');

  // Check for active alerts → bell
  updateAlertBell();
}

async function updateAlertBell() {
  try {
    const data = await API.get('/api/alerts');
    const active = data.alerts.filter(a => a.is_active);
    const badge = document.getElementById('bell-count');
    const abadge = document.getElementById('alert-count-badge');
    if (active.length > 0) {
      badge.textContent = active.length;
      badge.style.display = '';
      if (abadge) { abadge.textContent = active.length; abadge.style.display = ''; }
    } else {
      badge.style.display = 'none';
      if (abadge) abadge.style.display = 'none';
    }
  } catch(e) {}
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────
async function globalSearch(q) {
  const box = document.getElementById('search-results');
  if (!q.trim()) { box.classList.remove('open'); return; }
  try {
    const data = await API.get(`/api/announcements?search=${encodeURIComponent(q)}&per_page=6`);
    if (!data.announcements.length) { box.innerHTML = `<div class="sr-item"><div class="sr-title">No results found.</div></div>`; box.classList.add('open'); return; }
    box.innerHTML = data.announcements.map(a => `
      <div class="sr-item" onclick="openAnnModal('${a.id}')">
        <div class="sr-title">${catIcon(a.category)} ${a.title}</div>
        <div class="sr-cat">${a.category} · ${fmtDate(a.created_at)}</div>
      </div>`).join('');
    box.classList.add('open');
  } catch(e) {}
}

// ─── RESIDENT DASHBOARD ───────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [annData, alertData, evtData] = await Promise.all([
      API.get('/api/announcements?per_page=4'),
      API.get('/api/alerts'),
      API.get('/api/events'),
    ]);

    // Stats
    const active = alertData.alerts.filter(a => a.is_active).length;
    const upcoming = evtData.events.filter(e => new Date(e.date) >= new Date()).length;
    document.getElementById('dash-stats').innerHTML = `
      ${statCard('📢', annData.total, 'Announcements', active > 0 ? `⚠️ ${active} active alert` : 'All clear', '#c8922a')}
      ${statCard('🚨', active, 'Active Alerts', active > 0 ? 'Tap to view' : 'No active alerts', active > 0 ? 'var(--red)' : 'var(--green)')}
      ${statCard('📅', upcoming, 'Upcoming Events', 'This & next month', 'var(--blue)')}
      ${statCard('🌐', 'SDG 11 & 16', 'Aligned', 'Sustainable · Just', 'var(--green)')}`;

    // Announcements
    const el = document.getElementById('dash-announcements');
    el.innerHTML = annData.announcements.length
      ? annData.announcements.slice(0,3).map(annCardHTML).join('')
      : emptyState('No announcements yet.');

    // Alerts
    const ael = document.getElementById('dash-alerts');
    const activeAlerts = alertData.alerts.filter(a => a.is_active);
    ael.innerHTML = activeAlerts.length
      ? activeAlerts.slice(0,2).map(alertCardHTML).join('')
      : `<div class="event-item" style="border-color:var(--green);"><div class="event-title">✅ No active emergency alerts</div><div class="event-meta" style="font-size:12px;color:var(--muted);margin-top:3px">Barangay Gordon Heights is currently safe.</div></div>`;

    // Events
    const nel = document.getElementById('dash-events');
    const upcoming_evts = evtData.events.filter(e => new Date(e.date) >= new Date()).slice(0,3);
    nel.innerHTML = upcoming_evts.length
      ? upcoming_evts.map(eventItemHTML).join('')
      : emptyState('No upcoming events.');
  } catch(e) { toast('Failed to load dashboard.', 'error'); }
}

function statCard(icon, val, label, sub, color) {
  return `<div class="stat-card" style="--c:${color}">
    <div class="stat-icon">${icon}</div>
    <div class="stat-value">${val}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-sub" style="color:${color}">${sub}</div>
  </div>`;
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
function annCardHTML(a) {
  return `<div class="ann-card${a.is_pinned?' pinned':''}" onclick="openAnnModal('${a.id}')">
    <div class="ann-icon" style="background:${catColor(a.category)}">${catIcon(a.category)}</div>
    <div class="ann-body">
      <div class="ann-title">${a.is_pinned?'<span class="pin-badge">📌 PINNED</span> ':''}${a.title}</div>
      <div class="ann-preview">${a.content.substring(0,110)}…</div>
      <div class="ann-meta">
        <span class="ann-date">📅 ${fmtDate(a.created_at)}</span>
        <span class="cat-tag cat-${a.category}">${a.category}</span>
        <span class="ann-views">👁 ${a.views||0}</span>
      </div>
    </div>
  </div>`;
}

async function openAnnModal(id) {
  openModal('Loading…', loading());
  try {
    const a = await API.get(`/api/announcements/${id}`);
    openModal(
      `${catIcon(a.category)} ${a.title}`,
      `<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <span class="cat-tag cat-${a.category}">${a.category}</span>
        ${a.is_pinned?'<span class="badge badge-pinned">📌 Pinned</span>':''}
        <span style="font-size:12px;color:var(--muted)">📅 ${fmtDate(a.created_at)}</span>
        <span style="font-size:12px;color:var(--muted)">👁 ${a.views} views</span>
        <span style="font-size:12px;color:var(--muted)">✍ ${a.author}</span>
      </div>
      <p style="font-size:14px;line-height:1.75;color:#3a5070;white-space:pre-wrap;">${a.content}</p>`,
      `<button class="btn-secondary" onclick="closeModal()">Close</button>`
    );
  } catch(e) { toast('Failed to load announcement.', 'error'); closeModal(); }
}

async function loadAnnouncements(page = 1, cat = State.annFilter, search = State.annSearch) {
  State.annPage = page; State.annFilter = cat; State.annSearch = search;
  const el = document.getElementById('ann-list-full');
  el.innerHTML = loading();
  try {
    const data = await API.get(`/api/announcements?page=${page}&per_page=8&category=${cat}&search=${encodeURIComponent(search)}`);
    el.innerHTML = data.announcements.length
      ? data.announcements.map(annCardHTML).join('')
      : emptyState('No announcements found.', 'Try a different filter or search term.');

    // Update badge
    const badge = document.getElementById('ann-count-badge');
    if (badge) { badge.textContent = data.total || ''; badge.style.display = data.total ? '' : 'none'; }

    // Pagination
    renderPagination('ann-pagination', data.page, data.total_pages, p => loadAnnouncements(p, State.annFilter, State.annSearch));
  } catch(e) { el.innerHTML = emptyState('Could not load announcements.', e.message); }
}

function filterAnn(btn, cat, search) {
  if (btn) {
    document.querySelectorAll('#ann-filter-tabs .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (cat !== null && cat !== undefined) State.annFilter = cat;
  if (search !== null && search !== undefined) State.annSearch = search;
  loadAnnouncements(1, State.annFilter, State.annSearch);
}

function renderPagination(elId, page, totalPages, cb) {
  const el = document.getElementById(elId);
  if (!el || totalPages <= 1) { if(el) el.innerHTML = ''; return; }
  let html = `<button class="pag-btn" onclick="(${cb})(${page-1})" ${page===1?'disabled':''}>‹ Prev</button>`;
  for (let i = 1; i <= totalPages; i++)
    html += `<button class="pag-btn${i===page?' active':''}" onclick="(${cb})(${i})">${i}</button>`;
  html += `<button class="pag-btn" onclick="(${cb})(${page+1})" ${page===totalPages?'disabled':''}>Next ›</button>`;
  el.innerHTML = html;
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
async function loadCalendar() {
  try {
    const data = await API.get('/api/events');
    State.calEvents = data.events;
    renderCalendar();
    renderMonthEvents();
  } catch(e) { toast('Failed to load events.', 'error'); }
}

function renderCalendar() {
  const d = State.calDate;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-label').textContent = `${months[d.getMonth()]} ${d.getFullYear()}`;

  const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const days  = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  const today = new Date();
  const eventDays = new Set(
    State.calEvents
      .filter(e => e.date.startsWith(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`))
      .map(e => parseInt(e.date.split('-')[2]))
  );

  let html = ['S','M','T','W','T','F','S'].map(h=>`<div class="cal-head">${h}</div>`).join('');
  for (let i=0;i<first;i++) html += `<div class="cal-empty cal-day"></div>`;
  for (let i=1;i<=days;i++) {
    const isToday = today.getDate()===i && today.getMonth()===d.getMonth() && today.getFullYear()===d.getFullYear();
    const hasEv = eventDays.has(i);
    html += `<div class="cal-day${isToday?' today':''}${hasEv?' has-event':''}" onclick="calDayClick(${i})">${i}</div>`;
  }
  document.getElementById('cal-grid').innerHTML = html;
}

function renderMonthEvents() {
  const d = State.calDate;
  const prefix = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const evts = State.calEvents.filter(e => e.date.startsWith(prefix)).sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('month-events').innerHTML = evts.length
    ? evts.map(eventItemHTML).join('')
    : emptyState('No events this month.', 'Check back later.', '📅');
}

function eventItemHTML(e) {
  const d = new Date(e.date);
  const dateStr = d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
  return `<div class="event-item">
    <div class="event-date">${dateStr}${e.time?' · '+e.time:''}</div>
    <div class="event-title">${e.title}</div>
    <div class="event-loc">📍 ${e.location}</div>
    ${e.description?`<div class="event-time" style="margin-top:4px">${e.description}</div>`:''}
  </div>`;
}

function calNav(dir) {
  State.calDate.setMonth(State.calDate.getMonth() + dir);
  renderCalendar();
  renderMonthEvents();
}

function calDayClick(day) {
  const d = State.calDate;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const evts = State.calEvents.filter(e => e.date === dateStr);
  if (evts.length) {
    openModal(`📅 Events on ${fmtDate(dateStr)}`, evts.map(eventItemHTML).join(''), `<button class="btn-secondary" onclick="closeModal()">Close</button>`);
  }
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────
function alertCardHTML(a) {
  const c = sevColor(a.severity);
  return `<div class="alert-item" style="--c:${c}">
    <div class="alert-header">
      <div class="alert-title">${a.title}</div>
      <span class="badge badge-${a.severity.toLowerCase()}">${a.severity}</span>
    </div>
    <div class="alert-body">${a.message}</div>
    <div class="alert-foot">
      <span>📍 ${a.area || 'All Residents'}</span>
      <span>🕐 ${fmtDateTime(a.created_at)}</span>
      <span>📋 ${a.issued_by}</span>
    </div>
  </div>`;
}

async function loadAlerts() {
  const el = document.getElementById('alerts-list');
  el.innerHTML = loading();
  try {
    const [alertData, sensorData] = await Promise.all([API.get('/api/alerts'), API.get('/api/sensors')]);

    // IoT bar
    document.getElementById('iot-bar').innerHTML = sensorData.sensors.map(s => `
      <div class="iot-card ${s.status}">
        <div class="iot-status ${s.status}">${s.status === 'alert' ? '⚠ ALERT' : '● ONLINE'}</div>
        <div class="iot-name">${s.name}</div>
        <div class="iot-loc">📍 ${s.location}</div>
        <div class="iot-reading" style="color:${s.status==='alert'?'var(--red)':'var(--green)'}">${s.reading}</div>
      </div>`).join('');

    el.innerHTML = alertData.alerts.length
      ? alertData.alerts.map(alertCardHTML).join('')
      : emptyState('No emergency alerts.', 'Barangay Gordon Heights is currently safe.', '✅');
    updateAlertBell();
  } catch(e) { el.innerHTML = emptyState('Could not load alerts.', e.message); }
}

// ─── HOTLINES ─────────────────────────────────────────────────────────────────
async function loadHotlines() {
  const el = document.getElementById('hotlines-grid');
  el.innerHTML = loading();
  try {
    const data = await API.get('/api/hotlines');
    el.innerHTML = data.hotlines.filter(h => h.number !== '911').map(h => `
      <div class="hotline-card" onclick="toast('📞 ${h.number}', '')">
        <div class="hc-icon">${h.icon}</div>
        <div class="hc-name">${h.name}</div>
        <div class="hc-number">${h.number}</div>
        <div class="hc-avail">${h.available}</div>
      </div>`).join('');
  } catch(e) { el.innerHTML = emptyState('Could not load hotlines.', e.message); }
}

// ─── MY REPORTS ───────────────────────────────────────────────────────────────
async function loadMyReports() {
  const el = document.getElementById('my-reports-list');
  el.innerHTML = loading();
  try {
    const data = await API.get('/api/reports');
    if (!data.reports.length) { el.innerHTML = emptyState('No reports yet.', 'Submit a report to get started.', '📝'); return; }
    el.innerHTML = data.reports.map(r => `
      <div class="report-item">
        <div class="report-header">
          <div class="report-title">${r.title}</div>
          <span class="badge ${statusClass(r.status)}">${r.status}</span>
        </div>
        <div class="report-meta">
          📂 ${r.category} &nbsp;·&nbsp; 🚦 <span class="badge ${priorityClass(r.priority)}">${r.priority}</span>
          &nbsp;·&nbsp; 📍 ${r.location} &nbsp;·&nbsp; 📅 ${fmtDate(r.created_at)}
          ${r.admin_notes ? `<br>💬 <em>${r.admin_notes}</em>` : ''}
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML = emptyState('Could not load reports.', e.message); }
}

// ─── SUBMIT REPORT ────────────────────────────────────────────────────────────
async function submitReport() {
  const category    = document.getElementById('rpt-category').value;
  const title       = document.getElementById('rpt-title').value.trim();
  const description = document.getElementById('rpt-desc').value.trim();
  const priority    = document.getElementById('rpt-priority').value;
  const location    = document.getElementById('rpt-location').value.trim();
  const landmark    = document.getElementById('rpt-landmark').value.trim();

  if (!category || !title || !description || !location)
    return toast('Please fill in all required fields.', 'warning');

  try {
    await API.post('/api/reports', { category, title, description, priority, location, landmark });
    toast('Report submitted successfully!', 'success');
    resetReportForm();
    navigate('my-reports');
  } catch(e) { toast(e.message, 'error'); }
}

function resetReportForm() {
  ['rpt-category','rpt-title','rpt-desc','rpt-location','rpt-landmark'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.getElementById('rpt-priority').value = 'Medium';
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
async function loadProfile() {
  const el = document.getElementById('profile-card');
  el.innerHTML = loading();
  try {
    const u = await API.get('/api/auth/me');
    const fields = [
      ['Full Name', u.full_name], ['Username', `@${u.username}`],
      ['Email', u.email], ['Address', u.address || '—'],
      ['Contact', u.contact || '—'], ['Role', u.role],
      ['Member Since', fmtDate(u.created_at)],
    ];
    el.innerHTML = fields.map(([k,v]) => `<div class="profile-field"><span class="pf-key">${k}</span><span class="pf-val">${v}</span></div>`).join('');
  } catch(e) { el.innerHTML = emptyState('Could not load profile.', e.message); }
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
async function loadAdminDashboard() {
  try {
    const data = await API.get('/api/analytics');
    const t = data.totals;

    document.getElementById('admin-stats').innerHTML = `
      ${statCard('📢', t.announcements, 'Announcements', `${t.total_views} total views`, 'var(--gold)')}
      ${statCard('👥', t.residents, 'Registered Residents', 'Active accounts', 'var(--blue)')}
      ${statCard('📝', t.reports, 'Issue Reports', `${t.pending_reports} pending`, t.pending_reports>0?'var(--red)':'var(--green)')}
      ${statCard('🚨', t.alerts_sent, 'Alerts Sent', 'Emergency broadcasts', 'var(--red)')}`;

    // Category chart
    const cats = Object.entries(data.by_category);
    const maxViews = Math.max(...cats.map(([,v])=>v.views||0), 1);
    document.getElementById('admin-cat-chart').innerHTML = `<div class="bar-chart">${
      cats.map(([cat, v]) => `<div class="bar-row">
        <div class="bar-lbl">${catIcon(cat)} ${cat}</div>
        <div class="bar-track"><div class="bar-fill navy" style="width:${Math.round((v.views/maxViews)*100)}%"></div></div>
        <div class="bar-val">${v.views}</div>
      </div>`).join('')
    }</div>`;

    // Activity
    document.getElementById('admin-activity').innerHTML = data.recent_activity.length
      ? data.recent_activity.map(a => `<div class="activity-item">
          <div class="act-dot" style="background:${a.type==='announcement'?'var(--gold)':'var(--blue)'}"></div>
          <div class="act-text">${a.type==='announcement'?'📢':'📝'} ${a.title}</div>
          <div class="act-time">${fmtDate(a.time)}</div>
        </div>`).join('')
      : emptyState('No recent activity.','','📋');

    // Top announcements
    document.getElementById('admin-top-anns').innerHTML = `<div class="bar-chart">${
      data.top_announcements.map((a,i) => `<div class="bar-row">
        <div class="bar-lbl" title="${a.title}">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||'📌'} ${a.title.substring(0,28)}…</div>
        <div class="bar-track"><div class="bar-fill gold" style="width:${Math.min(100,Math.round(a.views/Math.max(...data.top_announcements.map(x=>x.views),1)*100))}%"></div></div>
        <div class="bar-val">${a.views}</div>
      </div>`).join('')
    }</div>`;

    // Pending badge
    const pb = document.getElementById('pending-badge');
    if (pb) { pb.textContent = t.pending_reports || ''; pb.style.display = t.pending_reports ? '' : 'none'; }
  } catch(e) { toast('Failed to load dashboard.', 'error'); }
}

// ─── ADMIN POST / EDIT ────────────────────────────────────────────────────────
async function postAnnouncement() {
  const title     = document.getElementById('post-title').value.trim();
  const content   = document.getElementById('post-content').value.trim();
  const category  = document.getElementById('post-category').value;
  const audience  = document.getElementById('post-audience').value;
  const is_pinned    = document.getElementById('post-pinned').checked;
  const is_published = document.getElementById('post-published').checked;

  if (!title || !content) return toast('Title and content are required.', 'warning');

  try {
    if (State.editAnnId) {
      await API.put(`/api/announcements/${State.editAnnId}`, { title, content, category, audience, is_pinned, is_published });
      toast('Announcement updated!', 'success');
      State.editAnnId = null;
    } else {
      await API.post('/api/announcements', { title, content, category, audience, is_pinned, is_published });
      toast(is_published ? '📢 Announcement published!' : '📝 Saved as draft!', 'success');
    }
    clearPostForm();
    navigate('admin-manage');
  } catch(e) { toast(e.message, 'error'); }
}

function clearPostForm() {
  document.getElementById('post-title').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-category').value = 'general';
  document.getElementById('post-audience').value = 'All Residents';
  document.getElementById('post-pinned').checked = false;
  document.getElementById('post-published').checked = true;
  State.editAnnId = null;
}

// ─── ADMIN MANAGE ─────────────────────────────────────────────────────────────
async function loadManage(btn, cat) {
  if (btn) {
    document.querySelectorAll('#pg-admin-manage .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const tbody = document.getElementById('manage-tbody');
  tbody.innerHTML = `<tr><td colspan="6">${loading()}</td></tr>`;
  try {
    const data = await API.get(`/api/announcements?category=${cat}&per_page=50&include_drafts=true`);
    if (!data.announcements.length) { tbody.innerHTML = `<tr><td colspan="6">${emptyState('No announcements found.')}</td></tr>`; return; }
    tbody.innerHTML = data.announcements.map(a => `<tr>
      <td><strong>${a.is_pinned?'📌 ':''}${a.title}</strong></td>
      <td><span class="cat-tag cat-${a.category}">${a.category}</span></td>
      <td>${fmtDate(a.created_at)}</td>
      <td>👁 ${a.views}</td>
      <td><span class="badge ${a.is_published?'badge-published':'badge-draft'}">${a.is_published?'✅ Published':'📝 Draft'}</span></td>
      <td><div class="td-actions">
        <button class="btn-gold btn-sm" onclick="editAnn('${a.id}')">✏️ Edit</button>
        ${!a.is_published?`<button class="btn-primary btn-sm" onclick="publishNow('${a.id}')">📢 Publish</button>`:''}
        <button class="btn-secondary btn-sm" onclick="togglePin('${a.id}')">${a.is_pinned?'📌 Unpin':'📌 Pin'}</button>
        <button class="btn-danger btn-sm" onclick="deleteAnn('${a.id}', '${a.title.replace(/'/g,"\\'")}')">🗑</button>
      </div></td>
    </tr>`).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="6">${emptyState('Failed to load.', e.message)}</td></tr>`; }
}

async function publishNow(id) {
  try {
    await API.put(`/api/announcements/${id}`, { is_published: true });
    toast('📢 Announcement published!', 'success');
    loadManage(null, 'all');
  } catch(e) { toast(e.message, 'error'); }
}

async function editAnn(id) {
  try {
    const a = await API.get(`/api/announcements/${id}`);
    State.editAnnId = id;
    document.getElementById('post-title').value = a.title;
    document.getElementById('post-content').value = a.content;
    document.getElementById('post-category').value = a.category;
    document.getElementById('post-audience').value = a.audience;
    document.getElementById('post-pinned').checked = a.is_pinned;
    document.getElementById('post-published').checked = a.is_published;
    navigate('admin-post');
    toast('Editing announcement – make changes and click Publish.', 'warning');
  } catch(e) { toast(e.message, 'error'); }
}

async function togglePin(id) {
  try {
    const res = await API.post(`/api/announcements/${id}/pin`);
    toast(res.message === 'Pinned' ? '📌 Announcement pinned!' : '📌 Announcement unpinned.', 'success');
    loadManage(null, 'all');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAnn(id, title) {
  openModal('🗑 Delete Announcement',
    `<p style="font-size:14px;color:#506070;">Are you sure you want to delete <strong>"${title}"</strong>? This cannot be undone.</p>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn-danger" onclick="confirmDeleteAnn('${id}')">Delete</button>`);
}
async function confirmDeleteAnn(id) {
  try {
    await API.del(`/api/announcements/${id}`);
    toast('Announcement deleted.', 'success');
    closeModal();
    loadManage(null, 'all');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── ADMIN REPORTS ────────────────────────────────────────────────────────────
async function loadAdminReports(btn, status) {
  if (btn) {
    document.querySelectorAll('#pg-admin-reports .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const tbody = document.getElementById('reports-tbody');
  tbody.innerHTML = `<tr><td colspan="7">${loading()}</td></tr>`;
  try {
    const url = status ? `/api/reports?status=${encodeURIComponent(status)}` : '/api/reports';
    const data = await API.get(url);
    if (!data.reports.length) { tbody.innerHTML = `<tr><td colspan="7">${emptyState('No reports found.')}</td></tr>`; return; }
    tbody.innerHTML = data.reports.map(r => `<tr>
      <td><strong>${r.title}</strong></td>
      <td>${r.category}</td>
      <td><span class="badge ${priorityClass(r.priority)}">${r.priority}</span></td>
      <td>${r.submitter_name}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td><span class="badge ${statusClass(r.status)}">${r.status}</span></td>
      <td><button class="btn-gold btn-sm" onclick="manageReport('${r.id}')">Manage</button></td>
    </tr>`).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="7">${emptyState('Failed to load.', e.message)}</td></tr>`; }
}

function manageReport(id) {
  openModal('Manage Report', loading());
  API.get('/api/reports').then(data => {
    const r = data.reports.find(x => x.id === id);
    if (!r) return;
    openModal(`📝 ${r.title}`,
      `<div style="font-size:13px;color:#506070;line-height:1.8">
        <p><strong>Category:</strong> ${r.category}</p>
        <p><strong>Priority:</strong> <span class="badge ${priorityClass(r.priority)}">${r.priority}</span></p>
        <p><strong>Location:</strong> ${r.location}${r.landmark?' (near '+r.landmark+')':''}</p>
        <p><strong>Submitted by:</strong> ${r.submitter_name}</p>
        <p><strong>Date:</strong> ${fmtDateTime(r.created_at)}</p>
        <p><strong>Description:</strong><br>${r.description}</p>
        <hr style="margin:14px 0;border-color:var(--border)">
        <div class="field-group"><label class="field-label">Update Status</label>
          <select class="field-input" id="modal-status">
            <option ${r.status==='Pending'?'selected':''}>Pending</option>
            <option ${r.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${r.status==='Resolved'?'selected':''}>Resolved</option>
          </select></div>
        <div class="field-group"><label class="field-label">Admin Notes</label>
          <textarea class="field-input" id="modal-notes" rows="3" placeholder="Add notes for the resident…">${r.admin_notes||''}</textarea></div>
      </div>`,
      `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="btn-primary" onclick="updateReport('${id}')">Save Changes</button>`);
  });
}

async function updateReport(id) {
  const status     = document.getElementById('modal-status').value;
  const admin_notes = document.getElementById('modal-notes').value.trim();
  try {
    await API.put(`/api/reports/${id}`, { status, admin_notes });
    toast('Report updated!', 'success');
    closeModal();
    loadAdminReports(null, '');
  } catch(e) { toast(e.message, 'error'); }
}

// ─── ADMIN EVENTS ─────────────────────────────────────────────────────────────
async function loadAdminEvents() {
  const el = document.getElementById('admin-events-list');
  el.innerHTML = loading();
  try {
    const data = await API.get('/api/events');
    el.innerHTML = data.events.length
      ? data.events.sort((a,b)=>a.date.localeCompare(b.date)).map(e => `
          <div class="event-item" style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="event-date">${fmtDate(e.date)}${e.time?' · '+e.time:''}</div>
              <div class="event-title">${e.title}</div>
              <div class="event-loc">📍 ${e.location}</div>
            </div>
            <button class="btn-danger btn-sm" onclick="deleteEvent('${e.id}')">🗑</button>
          </div>`).join('')
      : emptyState('No events yet.', 'Create one using the form.', '📅');
  } catch(e) { el.innerHTML = emptyState('Failed to load.', e.message); }
}

async function createEvent() {
  const title    = document.getElementById('evt-title').value.trim();
  const desc     = document.getElementById('evt-desc').value.trim();
  const date     = document.getElementById('evt-date').value;
  const time     = document.getElementById('evt-time').value;
  const location = document.getElementById('evt-location').value.trim();
  const category = document.getElementById('evt-category').value;
  if (!title || !date || !location) return toast('Title, date, and location are required.', 'warning');
  try {
    await API.post('/api/events', { title, description: desc, date, time, location, category });
    toast('Event created!', 'success');
    ['evt-title','evt-desc','evt-date','evt-time','evt-location'].forEach(id => { document.getElementById(id).value = ''; });
    loadAdminEvents();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteEvent(id) {
  try {
    await API.del(`/api/events/${id}`);
    toast('Event deleted.', 'success');
    loadAdminEvents();
  } catch(e) { toast(e.message, 'error'); }
}

// ─── ADMIN ALERTS ─────────────────────────────────────────────────────────────
function setSev(btn, sev) {
  State.selectedSev = sev;
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function sendAlert() {
  const title   = document.getElementById('alert-title').value.trim();
  const message = document.getElementById('alert-message').value.trim();
  const area    = document.getElementById('alert-area').value.trim();
  if (!title || !message) return toast('Title and message are required.', 'warning');
  try {
    await API.post('/api/alerts', { title, message, area, severity: State.selectedSev });
    toast('🚨 Emergency alert broadcasted to all residents!', 'success');
    document.getElementById('alert-title').value   = '';
    document.getElementById('alert-message').value = '';
    document.getElementById('alert-area').value    = '';
    loadAdminAlerts();
    updateAlertBell();
  } catch(e) { toast(e.message, 'error'); }
}

async function loadAdminAlerts() {
  const el = document.getElementById('admin-alerts-list');
  el.innerHTML = loading();
  try {
    const data = await API.get('/api/alerts');
    const active = data.alerts.filter(a => a.is_active);
    el.innerHTML = active.length
      ? active.map(a => `
          <div class="alert-item" style="--c:${sevColor(a.severity)}">
            <div class="alert-header">
              <div class="alert-title">${a.title}</div>
              <span class="badge badge-${a.severity.toLowerCase()}">${a.severity}</span>
            </div>
            <div class="alert-body">${a.message}</div>
            <div class="alert-foot">
              <span>📍 ${a.area||'All Residents'}</span>
              <span>🕐 ${fmtDateTime(a.created_at)}</span>
              <button class="btn-secondary btn-sm" onclick="deactivateAlert('${a.id}')">Deactivate</button>
            </div>
          </div>`).join('')
      : emptyState('No active alerts.', 'Broadcast an alert using the form.', '✅');
  } catch(e) { el.innerHTML = emptyState('Failed to load.', e.message); }
}

async function deactivateAlert(id) {
  try {
    await API.post(`/api/alerts/${id}/deactivate`);
    toast('Alert deactivated.', 'success');
    loadAdminAlerts();
    updateAlertBell();
  } catch(e) { toast(e.message, 'error'); }
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const data = await API.get('/api/analytics');
    const t = data.totals;

    document.getElementById('analytics-stats').innerHTML = `
      ${statCard('👁', t.total_views, 'Total Announcement Views', `Across ${t.announcements} posts`, 'var(--gold)')}
      ${statCard('👥', t.residents, 'Registered Residents', 'Barangay Gordon Heights', 'var(--blue)')}
      ${statCard('📝', t.reports, 'Issue Reports', `${t.pending_reports} pending`, t.pending_reports>0?'var(--red)':'var(--green)')}
      ${statCard('🚨', t.alerts_sent, 'Alerts Broadcast', 'Emergency notifications', 'var(--red)')}`;

    // Views chart
    const cats = Object.entries(data.by_category);
    const maxV = Math.max(...cats.map(([,v])=>v.views||0), 1);
    const colors = { general:'navy', emergency:'red', event:'green', health:'gold' };
    document.getElementById('views-chart').innerHTML = `<div class="bar-chart">${
      cats.map(([cat,v]) => `<div class="bar-row">
        <div class="bar-lbl">${catIcon(cat)} ${cat}</div>
        <div class="bar-track"><div class="bar-fill ${colors[cat]||'navy'}" style="width:${Math.round(v.views/maxV*100)}%"></div></div>
        <div class="bar-val">${v.views}</div>
      </div>`).join('')
    }</div>`;

    // Reports chart
    const rStats = data.report_status;
    const maxR = Math.max(...Object.values(rStats), 1);
    const rColors = { Pending:'gold', 'In Progress':'blue', Resolved:'green' };
    document.getElementById('reports-chart').innerHTML = `<div class="bar-chart">${
      Object.entries(rStats).map(([s,v]) => `<div class="bar-row">
        <div class="bar-lbl">${s}</div>
        <div class="bar-track"><div class="bar-fill ${rColors[s]||'navy'}" style="width:${Math.round(v/maxR*100)}%"></div></div>
        <div class="bar-val">${v}</div>
      </div>`).join('')
    }</div>`;

    // Residents by street chart
    const purok = data.purok_distribution;
    const maxP = Math.max(...Object.values(purok), 1);
    document.getElementById('purok-chart').innerHTML = Object.keys(purok).length
      ? `<div class="bar-chart">${Object.entries(purok).sort((a,b)=>b[1]-a[1]).map(([p,v]) => `<div class="bar-row">
          <div class="bar-lbl">${p}</div>
          <div class="bar-track"><div class="bar-fill navy" style="width:${Math.round(v/maxP*100)}%"></div></div>
          <div class="bar-val">${v}</div>
        </div>`).join('')}</div>`
      : emptyState('No resident data yet.');

    // Top announcements
    const maxAV = Math.max(...data.top_announcements.map(a=>a.views), 1);
    document.getElementById('top-anns-chart').innerHTML = `<div class="bar-chart">${
      data.top_announcements.map((a,i) => `<div class="bar-row">
        <div class="bar-lbl" title="${a.title}">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||'📌'} ${a.title.length>22?a.title.substring(0,22)+'…':a.title}</div>
        <div class="bar-track"><div class="bar-fill gold" style="width:${Math.round(a.views/maxAV*100)}%"></div></div>
        <div class="bar-val">${a.views}</div>
      </div>`).join('')
    }</div>`;
  } catch(e) { toast('Failed to load analytics.', 'error'); }
}

// ─── ADMIN USERS ──────────────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="8">${loading()}</td></tr>`;
  try {
    const data = await API.get('/api/admin/users');
    tbody.innerHTML = data.users.map(u => `<tr>
      <td><strong>${u.full_name}</strong></td>
      <td>@${u.username}</td>
      <td>${u.email}</td>
      <td>${u.address||'—'}</td>
      <td>${u.contact||'—'}</td>
      <td>${fmtDate(u.created_at)}</td>
      <td><span class="badge ${u.is_active?'badge-active':'badge-inactive'}">${u.is_active?'Active':'Inactive'}</span></td>
      <td>${u.role!=='admin'?`<button class="btn-${u.is_active?'danger':'gold'} btn-sm" onclick="toggleUser('${u.id}',this)">${u.is_active?'Deactivate':'Activate'}</button>`:'<span class="badge badge-admin">Admin</span>'}</td>
    </tr>`).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="8">${emptyState('Failed to load.', e.message)}</td></tr>`; }
}

async function toggleUser(id, btn) {
  btn.disabled = true;
  try {
    const res = await API.post(`/api/admin/users/${id}/toggle`);
    toast(res.message, 'success');
    loadUsers();
  } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
}

// ─── IoT SENSORS ──────────────────────────────────────────────────────────────
async function loadSensors() {
  const el = document.getElementById('sensors-grid');
  el.innerHTML = loading();
  try {
    const data = await API.get('/api/sensors');
    el.innerHTML = data.sensors.map(s => `
      <div class="sensor-card ${s.status}" id="sc-${s.id}">
        <div class="iot-status ${s.status}">${s.status==='alert'?'⚠ ALERT':'● ONLINE'}</div>
        <div class="iot-name" style="font-size:15px;margin-top:6px">${s.name}</div>
        <div class="iot-loc">📍 ${s.location}</div>
        <div class="iot-reading" style="font-size:16px;font-weight:700;margin:10px 0;color:${s.status==='alert'?'var(--red)':'var(--green)'}">${s.reading}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Updated: ${fmtDateTime(s.last_updated)}</div>
        <div class="field-group"><label class="field-label">Update Reading</label>
          <input type="text" class="field-input" id="r-${s.id}" value="${s.reading}" placeholder="e.g. 1.2m or 31°C"/></div>
        <div class="field-group"><label class="field-label">Status</label>
          <select class="field-input" id="st-${s.id}">
            <option value="online" ${s.status==='online'?'selected':''}>Online / Normal</option>
            <option value="alert"  ${s.status==='alert'?'selected':''}>Alert</option>
            <option value="offline" ${s.status==='offline'?'selected':''}>Offline</option>
          </select></div>
        <button class="btn-primary" style="width:100%" onclick="updateSensor('${s.id}')">💾 Update Sensor</button>
      </div>`).join('');
  } catch(e) { el.innerHTML = emptyState('Failed to load sensors.', e.message); }
}

async function updateSensor(id) {
  const reading = document.getElementById(`r-${id}`).value.trim();
  const status  = document.getElementById(`st-${id}`).value;
  try {
    await API.put(`/api/sensors/${id}`, { reading, status });
    toast('Sensor updated!', 'success');
    loadSensors();
    updateAlertBell();
  } catch(e) { toast(e.message, 'error'); }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async function boot() {
  try {
    const data = await API.get('/api/auth/me');
    State.user = data;
    initApp();
  } catch(e) {
    // Not logged in — show auth screen
    document.getElementById('auth-screen').style.display = '';
    document.getElementById('app-shell').style.display   = 'none';
  }
})();

/* ═══════════════════════════════════════════════════════════
   REAL-TIME NOTIFICATIONS – Socket.IO
═══════════════════════════════════════════════════════════ */

let socket = null;
let notifContainer = null;
let reconnectAttempts = 0;

// ─── Create notification container ───────────────────────────────────────────
function initNotifContainer() {
  if (document.getElementById('rt-notif-container')) return;
  notifContainer = document.createElement('div');
  notifContainer.id = 'rt-notif-container';
  notifContainer.className = 'rt-notif-container';
  document.body.appendChild(notifContainer);
}

// ─── Show a notification popup ────────────────────────────────────────────────
function showNotif({ type, severity, title, message, onView }) {
  initNotifContainer();

  const notif = document.createElement('div');
  notif.className = 'rt-notif';

  const barClass = type === 'alert' ? (severity || 'HIGH') : 'ann';
  const icon     = type === 'alert' ? '🚨' : '📢';
  const label    = type === 'alert' ? (severity || 'ALERT') : 'NEW ANNOUNCEMENT';
  const labelCls = type === 'alert' ? (severity || 'HIGH') : 'ann';

  notif.innerHTML = `
    <div class="rt-notif-bar ${barClass}"></div>
    <div class="rt-notif-inner">
      <div class="rt-notif-icon ${type === 'alert' ? 'alert' : 'ann'}">${icon}</div>
      <div class="rt-notif-content">
        <div class="rt-notif-label ${labelCls}">${label}</div>
        <div class="rt-notif-title">${title}</div>
        <div class="rt-notif-msg">${message || ''}</div>
      </div>
      <button class="rt-notif-close" onclick="dismissNotif(this.closest('.rt-notif'))">✕</button>
    </div>
    <div class="rt-notif-footer">
      <button class="rt-notif-action primary" onclick="viewNotif(this, '${type}')">View</button>
      <button class="rt-notif-action secondary" onclick="dismissNotif(this.closest('.rt-notif'))">Dismiss</button>
    </div>`;

  // Store callback
  notif._onView = onView;
  notifContainer.appendChild(notif);

  // Auto-dismiss after 8 seconds
  setTimeout(() => dismissNotif(notif), 8000);
}

function dismissNotif(el) {
  if (!el || !el.parentNode) return;
  el.style.opacity = '0';
  el.style.transform = 'translateX(60px)';
  el.style.transition = 'all .3s ease';
  setTimeout(() => el.remove(), 300);
}

function viewNotif(btn, type) {
  const notif = btn.closest('.rt-notif');
  if (notif && notif._onView) notif._onView();
  dismissNotif(notif);
}

// ─── Update bell badge count ──────────────────────────────────────────────────
function bumpBellCount() {
  const badge = document.getElementById('bell-count');
  const abadge = document.getElementById('alert-count-badge');
  const current = parseInt(badge.textContent || '0', 10);
  badge.textContent = current + 1;
  badge.style.display = '';
  if (abadge) { abadge.textContent = current + 1; abadge.style.display = ''; }
  // Animate bell
  const bell = document.getElementById('alert-bell');
  if (bell) {
    bell.style.animation = 'none';
    bell.offsetHeight; // reflow
    bell.style.animation = 'bellShake .5s ease';
  }
}

// Add bell shake animation to existing styles
const bellStyle = document.createElement('style');
bellStyle.textContent = `
  @keyframes bellShake {
    0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)}
    60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)}
  }
`;
document.head.appendChild(bellStyle);

// ─── Connection status indicator ─────────────────────────────────────────────
function setConnStatus(status) {
  let indicator = document.getElementById('conn-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'conn-indicator';
    indicator.style.cssText = 'position:fixed;bottom:16px;left:16px;display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);z-index:1000;background:var(--white);padding:4px 10px;border-radius:20px;border:0.5px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.08);';
    document.body.appendChild(indicator);
  }
  const labels = { connected: 'Live', disconnected: 'Offline', connecting: 'Connecting…' };
  indicator.innerHTML = `<span class="conn-dot ${status}"></span>${labels[status] || status}`;

  // Hide when connected after 3s
  if (status === 'connected') {
    setTimeout(() => { indicator.style.opacity = '0'; indicator.style.transition = 'opacity .5s'; setTimeout(() => { indicator.style.opacity = '1'; indicator.style.display = 'none'; }, 500); }, 3000);
  } else {
    indicator.style.display = 'flex';
    indicator.style.opacity = '1';
  }
}

// ─── Initialize Socket.IO connection ─────────────────────────────────────────
function initSocket() {
  if (socket) return;

  socket = io({ transports: ['websocket', 'polling'], reconnectionAttempts: 10, reconnectionDelay: 2000 });

  // ── Connection lifecycle ──
  socket.on('connect', () => {
    reconnectAttempts = 0;
    setConnStatus('connected');
    console.log('🔌 Real-time connected:', socket.id);
  });

  socket.on('disconnect', () => {
    setConnStatus('disconnected');
    console.log('🔌 Real-time disconnected');
  });

  socket.on('connect_error', () => {
    reconnectAttempts++;
    setConnStatus('connecting');
  });

  socket.on('connected', (data) => {
    console.log('✅', data.message);
  });

  // ── NEW EMERGENCY ALERT ──
  socket.on('new_alert', (alert) => {
    console.log('🚨 New alert received:', alert.title);

    // Show popup notification
    showNotif({
      type: 'alert',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      onView: () => navigate('alerts')
    });

    // Update bell count
    bumpBellCount();

    // Toast
    toast(`🚨 Emergency Alert: ${alert.title}`, 'error');

    // If user is on alerts page, refresh it live
    if (State.currentPage === 'alerts') loadAlerts();

    // If user is on dashboard, refresh alerts widget
    if (State.currentPage === 'dashboard') loadDashboard();

    // Browser notification (if permission granted)
    sendBrowserNotif('🚨 Emergency Alert', alert.title, alert.message);
  });

  // ── NEW ANNOUNCEMENT ──
  socket.on('new_announcement', (ann) => {
    console.log('📢 New announcement received:', ann.title);

    // Show popup notification
    showNotif({
      type: 'announcement',
      title: ann.title,
      message: ann.is_pinned ? '📌 Pinned announcement' : 'New barangay announcement',
      onView: () => {
        navigate('announcements');
        setTimeout(() => openAnnModal(ann.id), 300);
      }
    });

    // Update announcement badge count
    const badge = document.getElementById('ann-count-badge');
    if (badge) {
      const c = parseInt(badge.textContent || '0', 10);
      badge.textContent = c + 1;
      badge.style.display = '';
    }

    // Toast
    toast(`📢 New Announcement: ${ann.title}`, 'success');

    // If user is on announcements or dashboard, refresh live
    if (State.currentPage === 'announcements') loadAnnouncements(1, State.annFilter, State.annSearch);
    if (State.currentPage === 'dashboard') loadDashboard();
    if (State.currentPage === 'admin-manage') loadManage(null, 'all');
  });

  // ── ALERT DEACTIVATED ──
  socket.on('alert_deactivated', (data) => {
    console.log('✅ Alert deactivated:', data.id);
    toast('✅ An emergency alert has been lifted.', 'success');

    // Refresh pages if open
    if (State.currentPage === 'alerts') loadAlerts();
    if (State.currentPage === 'dashboard') loadDashboard();
    if (State.currentPage === 'admin-alerts') loadAdminAlerts();

    updateAlertBell();
  });
}

// ─── Browser Push Notification ────────────────────────────────────────────────
async function requestBrowserNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function sendBrowserNotif(title, body, detail) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body: `${body}\n${detail || ''}`.trim(),
      icon: '/static/icons/icon-192.png',
      badge: '/static/icons/icon-192.png',
      tag: 'gordon-heights-alert',
      renotify: true,
    });
    n.onclick = () => { window.focus(); navigate('alerts'); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch(e) {}
}

// ─── Hook into initApp ────────────────────────────────────────────────────────
const _origInitApp = initApp;
async function initApp() {
  await _origInitApp.call(this);
  // Start socket after login
  initSocket();
  // Request browser notification permission
  requestBrowserNotifPermission();
}

// ─── Safe Logout (handles socket cleanup + auth) ──────────────────────────────
async function safeLogout() {
  // Cleanup socket
  if (typeof socket !== 'undefined' && socket) {
    try { socket.disconnect(); } catch(e) {}
    socket = null;
  }
  // Cleanup UI elements
  const indicator = document.getElementById('conn-indicator');
  if (indicator) indicator.remove();
  const container = document.getElementById('rt-notif-container');
  if (container) container.remove();
  // Stop any active cameras
  if (typeof GuestState !== 'undefined' && GuestState.stream) {
    try { GuestState.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
    GuestState.stream = null;
  }
  if (typeof NcState !== 'undefined' && NcState.stream) {
    try { NcState.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
    NcState.stream = null;
  }
  // Call base logout
  await doLogout();
}

/* ═══════════════════════════════════════════════════════════
   NON-CITIZEN & GUEST REPORT FUNCTIONALITY
═══════════════════════════════════════════════════════════ */

// ─── State ────────────────────────────────────────────────────────────────────
const GuestState = {
  photoData:   null,
  latitude:    null,
  longitude:   null,
  locationName: null,
  stream:      null,
  citizenType: 'citizen',
};

const NcState = {
  photoData:   null,
  latitude:    null,
  longitude:   null,
  locationName: null,
  stream:      null,
};

// ─── Auth tab extension (merged into main showAuthTab below) ─────────────────

// ─── Citizen Type Selector ────────────────────────────────────────────────────
function setCitizenType(type) {
  GuestState.citizenType = type;
  document.getElementById('ctype-citizen').classList.toggle('active',    type==='citizen');
  document.getElementById('ctype-noncitizen').classList.toggle('active', type==='non_citizen');

  const addrFields = document.getElementById('citizen-address-fields');
  const ncContact  = document.getElementById('noncitizen-contact-field');

  if (type === 'non_citizen') {
    if(addrFields) addrFields.style.display = 'none';
    if(ncContact)  ncContact.style.display  = '';
  } else {
    if(addrFields) addrFields.style.display = '';
    if(ncContact)  ncContact.style.display  = 'none';
  }
}

// ─── Override doRegister to support non-citizen ───────────────────────────────
const _origDoRegister = doRegister;
async function doRegister() {
  // Hard check — terms must be agreed
  const termsChecked = document.getElementById('register-terms')?.checked;
  if (!termsChecked) {
    showError('register-error', 'You must agree to the Terms and Conditions to create an account.');
    return;
  }

  const full_name = document.getElementById('reg-name').value.trim();
  const username  = document.getElementById('reg-username').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const confirm   = document.getElementById('reg-confirm').value;
  const role      = GuestState.citizenType;

  let address = '', contact = '';

  if (role === 'citizen') {
    const block  = document.getElementById('reg-block').value.trim();
    const lot    = document.getElementById('reg-lot').value.trim();
    const street = document.getElementById('reg-street-addr').value.trim();
    contact      = document.getElementById('reg-contact').value.trim();
    address      = (block && lot && street) ? `${block} ${lot}, ${street}` : (block||lot||street);
    if (!full_name||!username||!email||!block||!lot||!street||!contact||!password)
      return showError('register-error','Please fill in all required fields.');
  } else {
    contact = document.getElementById('reg-contact-nc').value.trim();
    if (!full_name||!username||!email||!contact||!password)
      return showError('register-error','Please fill in all required fields.');
  }

  if (password.length < 6)  return showError('register-error','Password must be at least 6 characters.');
  if (password !== confirm)  return showError('register-error','Passwords do not match.');

  const btn = document.getElementById('register-btn');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    await API.post('/api/auth/register', { full_name, username, email, address, contact, password, role });
    toast('Account created! You may now sign in.', 'success');
    showAuthTab('login');
    document.getElementById('login-identifier').value = email;
  } catch(e) {
    showError('register-error', e.message);
    // Re-enable only if terms still checked
    const stillChecked = document.getElementById('register-terms')?.checked;
    btn.disabled = !stillChecked;
    btn.style.opacity = stillChecked ? '1' : '0.5';
    btn.textContent = 'Create Account';
  }
}

// ─── Override initApp to support non-citizen role ────────────────────────────
const _origInitApp2 = initApp;
async function initApp() {
  const u = State.user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display   = '';

  document.getElementById('topbar-name').textContent  = u.full_name;
  document.getElementById('topbar-avatar').textContent = u.full_name.charAt(0).toUpperCase();

  const isAdmin    = u.role === 'admin';
  const isNonCit   = u.role === 'non_citizen';
  const isResident = u.role === 'resident';

  document.getElementById('topbar-role').textContent = isAdmin ? 'Admin Official' : isNonCit ? 'Non-Citizen / Visitor' : (u.address || 'Resident');

  document.getElementById('nav-resident').style.display   = isResident ? '' : 'none';
  document.getElementById('nav-admin').style.display      = isAdmin    ? '' : 'none';
  document.getElementById('nav-noncitizen').style.display = isNonCit   ? '' : 'none';

  // Populate audience options (citizens/admins only)
  if (!isNonCit) {
    try {
      const data = await API.get('/api/puroks');
      const sel = document.getElementById('post-audience');
      if(sel) { sel.innerHTML = '<option>All Residents</option>'; data.puroks.forEach(p => { const o=document.createElement('option');o.textContent=p;sel.appendChild(o); }); }
    } catch(e) {}
  }

  document.getElementById('dash-name') && (document.getElementById('dash-name').textContent = u.full_name.split(' ')[0]);

  if (isNonCit) {
    navigate('nc-dashboard');
  } else {
    navigate(isAdmin ? 'admin-dashboard' : 'dashboard');
  }

  updateAlertBell();

  // Init socket
  if (typeof initSocket === 'function') initSocket();
  if (typeof requestBrowserNotifPermission === 'function') requestBrowserNotifPermission();
}

// Override navigate to include non-citizen pages
const _origNavigate = navigate;
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(`pg-${page}`);
  if (el) el.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('user-menu').classList.remove('open');
  State.currentPage = page;

  const loaders = {
    'dashboard':            loadDashboard,
    'announcements':        () => loadAnnouncements(1, State.annFilter, State.annSearch),
    'calendar':             loadCalendar,
    'alerts':               loadAlerts,
    'hotlines':             loadHotlines,
    'my-reports':           loadMyReports,
    'report-issue':         () => {},
    'photo-report':         () => {},
    'profile':              loadProfile,
    'nc-dashboard':         () => {},
    'nc-report':            () => {},
    'admin-dashboard':      loadAdminDashboard,
    'admin-post':           () => {},
    'admin-manage':         () => loadManage(null,'all'),
    'admin-reports':        () => loadAdminReports(null,''),
    'admin-events':         loadAdminEvents,
    'admin-alerts':         loadAdminAlerts,
    'admin-analytics':      loadAnalytics,
    'admin-users':          loadUsers,
    'admin-sensors':        loadSensors,
    'admin-guest-reports':  () => loadGuestReports(null,''),
  };
  if (loaders[page]) loaders[page]();
}

// ─── CAMERA HELPERS (Guest on login page) ────────────────────────────────────
function triggerCamera() {
  const vid = document.getElementById('camera-video');
  if (vid.style.display === 'none' && !GuestState.photoData) startCamera();
}

async function startCamera() {
  try {
    GuestState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const vid = document.getElementById('camera-video');
    vid.srcObject = GuestState.stream;
    vid.style.display = '';
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('camera-controls').style.display = 'flex';
    document.getElementById('photo-actions').style.display = 'none';
  } catch(e) {
    toast('Camera not available. Please upload a photo instead.', 'warning');
    document.getElementById('photo-upload').click();
  }
}

function stopGuestCamera() {
  if (GuestState.stream) { GuestState.stream.getTracks().forEach(t => t.stop()); GuestState.stream = null; }
  const vid = document.getElementById('camera-video');
  if(vid) { vid.style.display = 'none'; vid.srcObject = null; }
}

function capturePhoto() {
  const vid    = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const prev   = document.getElementById('photo-preview');
  if (!vid || vid.videoWidth === 0) { toast('Camera not ready.','warning'); return; }

  canvas.width  = vid.videoWidth;
  canvas.height = vid.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0);

  // Draw timestamp
  const ts = new Date().toLocaleString('en-PH');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(6, canvas.height-28, canvas.width-12, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '13px monospace';
  ctx.fillText(`📅 ${ts}`, 12, canvas.height-12);

  GuestState.photoData = canvas.toDataURL('image/jpeg', 0.85);
  prev.src = GuestState.photoData;
  prev.style.display = '';
  vid.style.display  = 'none';
  stopGuestCamera();
  document.getElementById('camera-controls').style.display = 'none';
  document.getElementById('photo-actions').style.display = '';
  document.getElementById('camera-placeholder').style.display = 'none';
  toast('📸 Photo captured!', 'success');
}

function retakePhoto() {
  GuestState.photoData = null;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('camera-placeholder').style.display = '';
  document.getElementById('photo-actions').style.display = 'none';
  document.getElementById('camera-controls').style.display = 'none';
  startCamera();
}

function handlePhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img    = new Image();
    img.onload = () => {
      const canvas = document.getElementById('camera-canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const ts = new Date().toLocaleString('en-PH');
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(6, canvas.height-28, canvas.width-12, 22);
      ctx.fillStyle = '#fff';
      ctx.font = '13px monospace';
      ctx.fillText(`📅 ${ts}`, 12, canvas.height-12);
      GuestState.photoData = canvas.toDataURL('image/jpeg', 0.85);
      const prev = document.getElementById('photo-preview');
      prev.src = GuestState.photoData;
      prev.style.display = '';
      document.getElementById('camera-placeholder').style.display = 'none';
      document.getElementById('photo-actions').style.display = '';
      document.getElementById('camera-controls').style.display = 'none';
      toast('🖼 Photo uploaded!', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function getLocation() {
  if (!navigator.geolocation) { toast('Geolocation not supported by your browser.','warning'); return; }
  document.getElementById('location-text').textContent = '📡 Getting location…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      GuestState.latitude  = pos.coords.latitude;
      GuestState.longitude = pos.coords.longitude;
      GuestState.locationName = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} — Gordon Heights, Olongapo City`;
      document.getElementById('location-text').textContent = `📍 ${GuestState.locationName}`;
      document.getElementById('location-text').style.color = 'var(--green)';
      toast('📍 Location captured!', 'success');
    },
    (err) => {
      GuestState.locationName = 'Gordon Heights, Olongapo City (GPS unavailable)';
      document.getElementById('location-text').textContent = '⚠️ GPS unavailable — using default location';
      document.getElementById('location-text').style.color = 'var(--amber)';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function submitGuestReport() {
  const name    = document.getElementById('guest-name').value.trim();
  const contact = document.getElementById('guest-contact').value.trim();
  const desc    = document.getElementById('guest-desc').value.trim();

  if (!name)               return showError('guest-error', 'Please enter your name.');
  if (!desc)               return showError('guest-error', 'Please describe what you witnessed.');
  if (!GuestState.photoData) return showError('guest-error', 'Please take or upload a photo.');

  const btn = document.getElementById('guest-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await API.post('/api/guest-report', {
      reporter_name:    name,
      reporter_contact: contact,
      description:      desc,
      photo:            GuestState.photoData,
      latitude:         GuestState.latitude,
      longitude:        GuestState.longitude,
      location_name:    GuestState.locationName || 'Gordon Heights, Olongapo City',
    });
    toast('✅ Report sent! Barangay officials have been notified.', 'success');
    // Reset form
    ['guest-name','guest-contact','guest-desc'].forEach(id => document.getElementById(id).value='');
    GuestState.photoData = null; GuestState.latitude = null; GuestState.longitude = null;
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('camera-placeholder').style.display = '';
    document.getElementById('photo-actions').style.display = 'none';
    document.getElementById('location-text').textContent = 'Location not yet captured';
    document.getElementById('location-text').style.color = '';
    showAuthTab('login');
  } catch(e) {
    showError('guest-error', e.message);
  } finally {
    btn.disabled = false; btn.textContent = '📤 Send Report to Barangay Admin';
  }
}

// ─── CAMERA HELPERS (Non-citizen inside app) ──────────────────────────────────
function ncTriggerCamera() {
  if (!NcState.photoData) ncStartCamera();
}

async function ncStartCamera() {
  try {
    NcState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const vid = document.getElementById('nc-video');
    vid.srcObject = NcState.stream;
    vid.style.display = '';
    document.getElementById('nc-cam-placeholder').style.display = 'none';
    document.getElementById('nc-cam-controls').style.display = 'flex';
  } catch(e) {
    toast('Camera not available. Please upload a photo.', 'warning');
    document.getElementById('nc-upload').click();
  }
}

function stopNcCamera() {
  if (NcState.stream) { NcState.stream.getTracks().forEach(t=>t.stop()); NcState.stream = null; }
  const vid = document.getElementById('nc-video');
  if(vid) { vid.style.display='none'; vid.srcObject=null; }
}

function ncCapture() {
  const vid    = document.getElementById('nc-video');
  const canvas = document.getElementById('nc-canvas');
  const prev   = document.getElementById('nc-preview');
  if (!vid||vid.videoWidth===0) { toast('Camera not ready.','warning'); return; }
  canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid,0,0);
  const ts = new Date().toLocaleString('en-PH');
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(6,canvas.height-28,canvas.width-12,22);
  ctx.fillStyle='#fff'; ctx.font='13px monospace';
  ctx.fillText(`📅 ${ts}`,12,canvas.height-12);
  NcState.photoData = canvas.toDataURL('image/jpeg',0.85);
  prev.src = NcState.photoData; prev.style.display='';
  vid.style.display='none'; stopNcCamera();
  document.getElementById('nc-cam-controls').style.display='none';
  document.getElementById('nc-photo-actions').style.display='';
  document.getElementById('nc-cam-placeholder').style.display='none';
  toast('📸 Photo captured!','success');
}

function ncRetake() {
  NcState.photoData = null;
  document.getElementById('nc-preview').style.display='none';
  document.getElementById('nc-cam-placeholder').style.display='flex';
  document.getElementById('nc-photo-actions').style.display='none';
  document.getElementById('nc-cam-controls').style.display='none';
  ncStartCamera();
}

function ncHandleUpload(input) {
  if (!input.files||!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('nc-canvas');
      canvas.width=img.width; canvas.height=img.height;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      const ts = new Date().toLocaleString('en-PH');
      ctx.fillStyle='rgba(0,0,0,0.6)';
      ctx.fillRect(6,canvas.height-28,canvas.width-12,22);
      ctx.fillStyle='#fff'; ctx.font='13px monospace';
      ctx.fillText(`📅 ${ts}`,12,canvas.height-12);
      NcState.photoData=canvas.toDataURL('image/jpeg',0.85);
      const prev=document.getElementById('nc-preview');
      prev.src=NcState.photoData; prev.style.display='';
      document.getElementById('nc-cam-placeholder').style.display='none';
      document.getElementById('nc-photo-actions').style.display='';
      toast('🖼 Photo uploaded!','success');
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function ncGetLocation() {
  if (!navigator.geolocation) { toast('Geolocation not supported.','warning'); return; }
  document.getElementById('nc-location-text').textContent='📡 Getting location…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      NcState.latitude  = pos.coords.latitude;
      NcState.longitude = pos.coords.longitude;
      NcState.locationName = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} — Gordon Heights, Olongapo City`;
      document.getElementById('nc-location-text').textContent = `📍 ${NcState.locationName}`;
      document.getElementById('nc-location-text').style.color = 'var(--green)';
      toast('📍 Location captured!','success');
    },
    () => {
      NcState.locationName='Gordon Heights, Olongapo City (GPS unavailable)';
      document.getElementById('nc-location-text').textContent='⚠️ GPS unavailable — using default location';
      document.getElementById('nc-location-text').style.color='var(--amber)';
    },
    {enableHighAccuracy:true,timeout:10000}
  );
}

async function submitNcReport() {
  const desc = document.getElementById('nc-desc').value.trim();
  if (!desc) return toast('Please describe the incident.','warning');
  if (!NcState.photoData) return toast('Please take or upload a photo.','warning');
  if (!NcState.locationName) return toast('Please capture your location first.','warning');

  try {
    const u = State.user;
    await API.post('/api/guest-report', {
      reporter_name:    u.full_name,
      reporter_contact: u.contact || '',
      description:      desc,
      photo:            NcState.photoData,
      latitude:         NcState.latitude,
      longitude:        NcState.longitude,
      location_name:    NcState.locationName,
    });
    toast('✅ Report sent to Barangay Admin!','success');
    document.getElementById('nc-desc').value='';
    NcState.photoData=null; NcState.latitude=null; NcState.longitude=null;
    document.getElementById('nc-preview').style.display='none';
    document.getElementById('nc-cam-placeholder').style.display='flex';
    document.getElementById('nc-photo-actions').style.display='none';
    document.getElementById('nc-location-text').textContent='Location not yet captured';
    document.getElementById('nc-location-text').style.color='';
    stopNcCamera();
  } catch(e) { toast(e.message,'error'); }
}

// ─── ADMIN: Load Guest/Photo Reports ─────────────────────────────────────────
async function loadGuestReports(btn, status) {
  if (btn) {
    document.querySelectorAll('#pg-admin-guest-reports .ftab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  const el = document.getElementById('guest-reports-list');
  el.innerHTML = loading();
  try {
    const url = status ? `/api/guest-reports?status=${encodeURIComponent(status)}` : '/api/guest-reports';
    const data = await API.get(url);

    // Update badge
    const badge = document.getElementById('photo-reports-badge');
    const pending = data.reports.filter(r=>r.status==='Pending').length;
    if(badge) { badge.textContent = pending||''; badge.style.display=pending?'':'none'; }

    if (!data.reports.length) { el.innerHTML = emptyState('No photo reports yet.','Reports from guests and non-citizens will appear here.','📷'); return; }

    el.innerHTML = data.reports.map(r => {
      const hasPhoto = r.photo && r.photo.length > 0;
      const mapUrl = r.latitude && r.longitude
        ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}`
        : null;
      return `<div class="photo-report-card">
        <div class="prc-header">
          <div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
              <span class="badge ${r.type==='citizen_photo_report'?'badge-info':'badge-warn'}">${r.type==='citizen_photo_report'?'🏘️ Citizen':'🧳 Guest/Non-Citizen'}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--navy)">${r.description.substring(0,80)}${r.description.length>80?'…':''}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px">👤 ${r.reporter_name}${r.reporter_contact?' · 📞 '+r.reporter_contact:''}</div>
          </div>
          <span class="badge ${statusClass(r.status)}">${r.status}</span>
        </div>
        <div class="prc-meta">
          <span>🕐 ${fmtDateTime(r.created_at)}</span>
          ${r.location_name?`<span>📍 ${r.location_name}</span>`:''}
        </div>
        ${hasPhoto?`<div class="photo-wrap">
          <img class="prc-photo" src="data:image/jpeg;base64,${r.photo}" alt="Incident photo" loading="lazy"/>
          <div class="photo-timestamp">📅 ${fmtDateTime(r.created_at)}</div>
        </div>`:''}
        ${mapUrl?`<div class="prc-location">
          <span>📍 GPS: ${r.latitude?.toFixed(5)}, ${r.longitude?.toFixed(5)}</span>
          <a href="${mapUrl}" target="_blank" style="margin-left:auto;font-weight:600;color:var(--blue);text-decoration:none">Open in Maps →</a>
        </div>`:''}
        <div class="prc-actions">
          <button class="btn-gold btn-sm" onclick="manageGuestReport('${r.id}')">⚙️ Manage</button>
          ${r.status==='Pending'?`<button class="btn-primary btn-sm" onclick="quickUpdateGR('${r.id}','Reviewed')">✅ Mark Reviewed</button>`:''}
          ${r.status!=='Resolved'?`<button class="btn-secondary btn-sm" onclick="quickUpdateGR('${r.id}','Resolved')">🔒 Resolve</button>`:''}
          <button class="btn-danger btn-sm" onclick="deleteGuestReport('${r.id}')">🗑 Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = emptyState('Failed to load.', e.message); }
}

async function quickUpdateGR(id, status) {
  try {
    await API.put(`/api/guest-reports/${id}`, { status });
    toast(`Report marked as ${status}.`, 'success');
    loadGuestReports(null, '');
  } catch(e) { toast(e.message,'error'); }
}

function deleteGuestReport(id) {
  openModal(
    '🗑 Delete Photo Report',
    `<p style="font-size:14px;color:#506070;line-height:1.6">Are you sure you want to <strong>permanently delete</strong> this photo report? This action cannot be undone.</p>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn-danger" onclick="confirmDeleteGuestReport('${id}')">🗑 Delete Permanently</button>`
  );
}

async function confirmDeleteGuestReport(id) {
  try {
    await API.del(`/api/guest-reports/${id}`);
    toast('Photo report deleted.', 'success');
    closeModal();
    loadGuestReports(null, '');
  } catch(e) { toast(e.message, 'error'); }
}

function manageGuestReport(id) {
  openModal('⚙️ Manage Photo Report', loading());
  API.get('/api/guest-reports').then(data => {
    const r = data.reports.find(x=>x.id===id);
    if(!r) return;
    openModal('⚙️ Manage Photo Report',
      `<div style="font-size:13px;color:#506070;line-height:1.8">
        <p><strong>Reporter:</strong> ${r.reporter_name}${r.reporter_contact?' · '+r.reporter_contact:''}</p>
        <p><strong>Description:</strong> ${r.description}</p>
        <p><strong>Location:</strong> ${r.location_name||'—'}</p>
        <p><strong>Date/Time:</strong> ${fmtDateTime(r.created_at)}</p>
        <hr style="margin:12px 0;border-color:var(--border)">
        <div class="field-group"><label class="field-label">Update Status</label>
          <select class="field-input" id="gr-modal-status">
            <option ${r.status==='Pending'?'selected':''}>Pending</option>
            <option ${r.status==='Reviewed'?'selected':''}>Reviewed</option>
            <option ${r.status==='Resolved'?'selected':''}>Resolved</option>
          </select></div>
        <div class="field-group"><label class="field-label">Admin Notes</label>
          <textarea class="field-input" id="gr-modal-notes" rows="3" placeholder="Notes for this report…">${r.admin_notes||''}</textarea></div>
      </div>`,
      `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="btn-primary" onclick="saveGuestReport('${id}')">Save</button>`);
  });
}

async function saveGuestReport(id) {
  const status     = document.getElementById('gr-modal-status').value;
  const admin_notes = document.getElementById('gr-modal-notes').value.trim();
  try {
    await API.put(`/api/guest-reports/${id}`, { status, admin_notes });
    toast('Report updated!','success');
    closeModal();
    loadGuestReports(null,'');
  } catch(e) { toast(e.message,'error'); }
}

// ─── Socket.IO — listen for new guest reports (admin) ────────────────────────
const _origInitSocket = typeof initSocket === 'function' ? initSocket : null;
function initSocket() {
  if (_origInitSocket) _origInitSocket();
  if (!socket) return;
  socket.on('new_guest_report', (r) => {
    if (State.user?.role === 'admin') {
      showNotif({ type:'alert', severity:'MEDIUM', title:'📷 New Photo Report', message:`${r.reporter_name}: ${r.description}`, onView: ()=>navigate('admin-guest-reports') });
      toast(`📷 New photo report from ${r.reporter_name}!`, 'warning');
      const badge=document.getElementById('photo-reports-badge');
      if(badge){ const c=parseInt(badge.textContent||'0',10); badge.textContent=c+1; badge.style.display=''; }
      if(State.currentPage==='admin-guest-reports') loadGuestReports(null,'');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   TERMS AND CONDITIONS
═══════════════════════════════════════════════════════════ */

// Track which form triggered Terms (login or register)
let termsCalledFrom = null;

function showTerms(e, from) {
  if (e) e.preventDefault();
  termsCalledFrom = from || null;
  document.getElementById('terms-overlay').classList.add('open');
}

function closeTerms(e) {
  if (e && e.target !== document.getElementById('terms-overlay')) return;
  document.getElementById('terms-overlay').classList.remove('open');
}

function agreeTerms() {
  // Auto-check whichever checkbox is visible
  const loginTerms    = document.getElementById('login-terms');
  const registerTerms = document.getElementById('register-terms');

  // Check the one on the active visible form
  const loginForm    = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');

  if (loginForm && loginForm.style.display !== 'none') {
    if (loginTerms) { loginTerms.checked = true; toggleLoginBtn(); }
  }
  if (registerForm && registerForm.style.display !== 'none') {
    if (registerTerms) { registerTerms.checked = true; toggleRegisterBtn(); }
  }

  document.getElementById('terms-overlay').classList.remove('open');
  toast('✅ You have agreed to the Terms and Conditions.', 'success');
}

function toggleLoginBtn() {
  const checked = document.getElementById('login-terms').checked;
  const btn     = document.getElementById('login-btn');
  btn.disabled  = !checked;
  btn.style.opacity = checked ? '1' : '0.5';
  btn.style.cursor  = checked ? 'pointer' : 'not-allowed';
}

function toggleRegisterBtn() {
  const checked = document.getElementById('register-terms').checked;
  const btn     = document.getElementById('register-btn');
  btn.disabled  = !checked;
  btn.style.opacity = checked ? '1' : '0.5';
  btn.style.cursor  = checked ? 'pointer' : 'not-allowed';
}

// Terms checkbox reset handled inside main showAuthTab

// Close terms on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('terms-overlay')?.classList.remove('open');
  }
});

/* ═══════════════════════════════════════════════════════════
   CITIZEN PHOTO REPORT
═══════════════════════════════════════════════════════════ */

const CprState = {
  photoData:    null,
  latitude:     null,
  longitude:    null,
  locationName: null,
  stream:       null,
};

function cprTriggerCamera() {
  if (!CprState.photoData) cprStartCamera();
}

async function cprStartCamera() {
  try {
    CprState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const vid = document.getElementById('cpr-video');
    vid.srcObject = CprState.stream;
    vid.style.display = '';
    document.getElementById('cpr-placeholder').style.display = 'none';
    document.getElementById('cpr-cam-controls').style.display = 'flex';
  } catch(e) {
    toast('Camera not available. Please upload a photo instead.', 'warning');
    document.getElementById('cpr-upload').click();
  }
}

function cprStopCamera() {
  if (CprState.stream) { CprState.stream.getTracks().forEach(t => t.stop()); CprState.stream = null; }
  const vid = document.getElementById('cpr-video');
  if (vid) { vid.style.display = 'none'; vid.srcObject = null; }
}

function cprCapture() {
  const vid    = document.getElementById('cpr-video');
  const canvas = document.getElementById('cpr-canvas');
  const prev   = document.getElementById('cpr-preview');
  if (!vid || vid.videoWidth === 0) { toast('Camera not ready.', 'warning'); return; }

  canvas.width  = vid.videoWidth;
  canvas.height = vid.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0);

  // Stamp date & time
  const ts = new Date().toLocaleString('en-PH');
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(6, canvas.height - 30, canvas.width - 12, 24);
  ctx.fillStyle = '#fff';
  ctx.font = '13px monospace';
  ctx.fillText(`📅 ${ts}`, 12, canvas.height - 12);

  CprState.photoData = canvas.toDataURL('image/jpeg', 0.85);
  prev.src = CprState.photoData;
  prev.style.display = '';
  vid.style.display  = 'none';
  cprStopCamera();
  document.getElementById('cpr-cam-controls').style.display  = 'none';
  document.getElementById('cpr-photo-actions').style.display = '';
  document.getElementById('cpr-placeholder').style.display   = 'none';
  toast('📸 Photo captured!', 'success');
}

function cprRetake() {
  CprState.photoData = null;
  document.getElementById('cpr-preview').style.display       = 'none';
  document.getElementById('cpr-placeholder').style.display   = '';
  document.getElementById('cpr-photo-actions').style.display = 'none';
  document.getElementById('cpr-cam-controls').style.display  = 'none';
  cprStartCamera();
}

function cprHandleUpload(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('cpr-canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const ts = new Date().toLocaleString('en-PH');
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(6, canvas.height - 30, canvas.width - 12, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '13px monospace';
      ctx.fillText(`📅 ${ts}`, 12, canvas.height - 12);
      CprState.photoData = canvas.toDataURL('image/jpeg', 0.85);
      const prev = document.getElementById('cpr-preview');
      prev.src = CprState.photoData; prev.style.display = '';
      document.getElementById('cpr-placeholder').style.display   = 'none';
      document.getElementById('cpr-photo-actions').style.display = '';
      toast('🖼 Photo uploaded!', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function cprGetLocation() {
  if (!navigator.geolocation) { toast('Geolocation not supported.', 'warning'); return; }
  document.getElementById('cpr-location-text').textContent = '📡 Getting location…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      CprState.latitude     = pos.coords.latitude;
      CprState.longitude    = pos.coords.longitude;
      CprState.locationName = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} — Gordon Heights, Olongapo City`;
      document.getElementById('cpr-location-text').textContent = `📍 ${CprState.locationName}`;
      document.getElementById('cpr-location-text').style.color = 'var(--green)';
      toast('📍 Location captured!', 'success');
    },
    () => {
      CprState.locationName = 'Gordon Heights, Olongapo City (GPS unavailable)';
      document.getElementById('cpr-location-text').textContent = '⚠️ GPS unavailable — using default location';
      document.getElementById('cpr-location-text').style.color = 'var(--amber)';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function submitCitizenPhotoReport() {
  const desc = document.getElementById('cpr-desc').value.trim();
  if (!desc)              return toast('Please describe the incident.', 'warning');
  if (!CprState.photoData) return toast('Please take or upload a photo.', 'warning');
  if (!CprState.locationName) return toast('Please capture your GPS location first.', 'warning');

  try {
    await API.post('/api/citizen-photo-report', {
      description:   desc,
      photo:         CprState.photoData,
      latitude:      CprState.latitude,
      longitude:     CprState.longitude,
      location_name: CprState.locationName,
    });
    toast('✅ Photo report sent to Barangay Admin!', 'success');
    cprReset();
    navigate('my-reports');
  } catch(e) { toast(e.message, 'error'); }
}

function cprReset() {
  document.getElementById('cpr-desc').value = '';
  CprState.photoData = null; CprState.latitude = null; CprState.longitude = null; CprState.locationName = null;
  document.getElementById('cpr-preview').style.display       = 'none';
  document.getElementById('cpr-placeholder').style.display   = '';
  document.getElementById('cpr-photo-actions').style.display = 'none';
  document.getElementById('cpr-cam-controls').style.display  = 'none';
  document.getElementById('cpr-location-text').textContent   = 'Location not yet captured';
  document.getElementById('cpr-location-text').style.color   = '';
  cprStopCamera();
}
