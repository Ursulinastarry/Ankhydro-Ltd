// ===== ANK HYDRO ADMIN PANEL — Core JavaScript =====

const AdminApp = {
  // ---------- IMAGE UPLOAD HELPER ----------
  imageFieldHtml(label, fieldId, currentUrl) {
    const preview = currentUrl ? `<img src="${this.resolveImageUrl(currentUrl)}" style="max-width:120px;max-height:80px;border-radius:8px;margin-top:.5rem;display:block;" id="${fieldId}-preview">` : `<img id="${fieldId}-preview" style="max-width:120px;max-height:80px;border-radius:8px;margin-top:.5rem;display:none;">`;
    return `
      <div class="form-group">
        <label>${label}</label>
        <div style="display:flex;align-items:center;gap:.75rem;">
          <input type="file" id="${fieldId}" accept="image/*" style="flex:1;" onchange="AdminApp.previewImage('${fieldId}')">
          ${currentUrl ? `<button type="button" class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.clearImageField('${fieldId}')">Remove</button>` : ''}
        </div>
        <input type="hidden" id="${fieldId}-url" value="${currentUrl || ''}">
        ${preview}
      </div>
    `;
  },

  previewImage(fieldId) {
    const input = document.getElementById(fieldId);
    const preview = document.getElementById(fieldId + '-preview');
    if (input.files && input.files[0] && preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  clearImageField(fieldId) {
    const input = document.getElementById(fieldId);
    const preview = document.getElementById(fieldId + '-preview');
    const urlInput = document.getElementById(fieldId + '-url');
    if (input) input.value = '';
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (urlInput) urlInput.value = '';
  },

  async uploadImage(fieldId, section, itemId) {
    const input = document.getElementById(fieldId);
    if (!input || !input.files || !input.files[0]) {
      const urlInput = document.getElementById(fieldId + '-url');
      return urlInput ? urlInput.value : '';
    }
    console.log('File to upload:', input.files[0]); // Check if this is defined
    const formData = new FormData();
    formData.append('image', input.files[0]);
    formData.append('section', section);
    formData.append('item_id', String(itemId));

    // Get auth headers, then FORCE delete the Content-Type
    const headers = this.authHeaders();
    delete headers['Content-Type']; 

    try {
      const resp = await fetch(this.BACKEND_HOST + '/api/admin/upload', {
        method: 'POST',
        headers: headers, // Pass the clean headers
        body: formData
      });
      if (this.handleAuthResponse(resp)) return null;
      let result;
      try {
        result = await resp.json();
      } catch (parseErr) {
        throw new Error(`Server returned a non-JSON response (status ${resp.status})`);
      }
      if (resp.ok && result.success) {
        return result.url;
      } else {
        this.toast('Image upload failed: ' + (result.error || `Server responded ${resp.status}`), 'error');
        return null; // distinct from '' (no file chosen) so callers know it failed
      }
    } catch (err) {
      this.toast('Image upload error: ' + err.message, 'error');
      return null;
    }
  },

  // ---------- DATA STORE (localStorage) ----------
  DB_KEYS: {
    auth: 'ank_admin_auth',
    services: 'ank_services',
    packages: 'ank_packages',
    projects: 'ank_projects',
    blog: 'ank_blog',
    quotes: 'ank_quotes',
    messages: 'ank_messages',
    testimonials: 'ank_testimonials',
    team: 'ank_team',
    faq: 'ank_faq',
    stats: 'ank_stats',
    settings: 'ank_settings',
    activity: 'ank_activity',
    mpesaOrders: 'ank_mpesa_orders'
  },

  BACKEND_HOST: 'https://ankhydro-ltd-production.up.railway.app',
  DB_API_BASE: 'https://ankhydro-ltd-production.up.railway.app/api/admin',
  SITE_DATA_API: 'https://ankhydro-ltd-production.up.railway.app/api/site-data',
  MPESA_API_BASE: 'https://ankhydro-ltd-production.up.railway.app/api/mpesa',
  dbAvailable: false,
  mpesaAvailable: false,
  data: {
    settings: {},
    stats: {},
    services: [],
    packages: [],
    projects: [],
    blog: [],
    quotes: [],
    messages: [],
    testimonials: [],
    team: [],
    faq: [],
    activity: [],
    mpesaOrders: []
  },

  currentSection: 'dashboard',
  editingId: null,
  editingType: null,

  // ---------- INIT ----------
  async init() {
    // Login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
      return;
    }

    // Dashboard page — check auth
    if (!this.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    await this.loadAdminData();
    await this.loadMpesaOrders();
    await this.seedDefaultData();
    this.setupNavigation();
    this.setupSidebar();
    this.setupLogout();
    this.setupStats();
    this.setupSettings();
    this.renderDashboard();
    this.renderAll();
  },

  // ---------- AUTH ----------
  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const btnText = btn?.querySelector('.login-btn-text');
    const btnLoading = btn?.querySelector('.login-btn-loading');

    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';
    if (btn) btn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const resp = await fetch(`${this.DB_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      let result;
      try {
        result = await resp.json();
      } catch (e) {
        throw new Error(`Server returned a non-JSON response (status ${resp.status})`);
      }
      if (!resp.ok || !result.success) {
        throw new Error(result.error || 'Invalid email or password.');
      }

      localStorage.setItem(this.DB_KEYS.auth, JSON.stringify({
        email: result.email,
        token: result.token,
        loggedIn: true,
        timestamp: Date.now()
      }));
      window.location.href = 'dashboard.html';
    } catch (error) {
      errorEl.textContent = error.message || 'Could not reach the server. Please try again.';
      errorEl.style.display = 'block';
      errorEl.style.background = '';
      errorEl.style.color = '';
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
      if (btn) btn.disabled = false;
    }
  },

  isAuthenticated() {
    const auth = JSON.parse(localStorage.getItem(this.DB_KEYS.auth) || 'null');
    if (!auth || !auth.loggedIn || !auth.token) return false;
    // Session timeout: 30 min of front-end inactivity. The token itself is
    // also checked and expired server-side (12h) on every request, so a
    // stolen/copied token can't be replayed forever even if this client-side
    // check is bypassed.
    if (Date.now() - auth.timestamp > 30 * 60 * 1000) {
      localStorage.removeItem(this.DB_KEYS.auth);
      return false;
    }
    // Refresh timestamp
    auth.timestamp = Date.now();
    localStorage.setItem(this.DB_KEYS.auth, JSON.stringify(auth));
    return true;
  },

  // Bearer token for the currently logged-in admin, or null if not logged in.
  getToken() {
    const auth = JSON.parse(localStorage.getItem(this.DB_KEYS.auth) || 'null');
    return auth?.token || null;
  },

  // Merges an Authorization header into a fetch options object.
  authHeaders(extra = {}) {
    const token = this.getToken();
    return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
  },

  // Call after any admin-API fetch response. If the server says the session
  // is invalid/expired, force a fresh login instead of leaving the admin
  // looking at a dashboard that will fail on every action.
  handleAuthResponse(resp) {
    if (resp && resp.status === 401) {
      localStorage.removeItem(this.DB_KEYS.auth);
      this.toast('Your session has expired. Please log in again.', 'error');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      return true;
    }
    return false;
  },

  // ---------- ENSURE DATA STRUCTURE (no hardcoded content) ----------
  // All real content now comes exclusively from the database via loadAdminData().
  // This only guarantees the localStorage keys exist as empty structures so the
  // admin UI doesn't throw on first run if the API is temporarily unreachable —
  // it never injects sample company text, prices, or images.
  async seedDefaultData() {
    if (this.dbAvailable) {
      this.showDbBanner(false);
      return;
    }

    this.showDbBanner(true);

    const emptyListKeys = ['services', 'packages', 'testimonials', 'team', 'faq', 'quotes', 'messages', 'projects', 'blog', 'activity'];
    emptyListKeys.forEach((key) => {
      if (!localStorage.getItem(this.DB_KEYS[key])) this.saveLocal(key, []);
    });

    if (!localStorage.getItem(this.DB_KEYS.stats)) {
      this.saveLocal('stats', { boreholes: 0, solar: 0, clients: 0, counties: 0 });
    }
    if (!localStorage.getItem(this.DB_KEYS.settings)) {
      this.saveLocal('settings', {
        company: '', tagline: '', phone: '', email: '', whatsapp: '', address: '', hours: '',
        facebook: '', instagram: '', tiktok: '', linkedin: '', youtube: '', twitter: '', ga: ''
      });
    }
  },

  // Shows a persistent banner telling the admin the DB API could not be reached,
  // so they know any data on screen is empty/local rather than live content.
  showDbBanner(show) {
    let banner = document.getElementById('dbStatusBanner');
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'dbStatusBanner';
        banner.style.cssText = 'background:#FFEBEE;color:#C62828;padding:.75rem 1.25rem;text-align:center;font-weight:600;font-size:.9rem;';
        banner.textContent = 'Could not connect to the database. Changes made here will not be saved until the connection is restored.';
        document.body.prepend(banner);
      }
    } else if (banner) {
      banner.remove();
    }
  },

  // ---------- STORAGE HELPERS ----------
  async loadAdminData() {
    try {
      const resp = await fetch(`${this.DB_API_BASE}/all`, { headers: this.authHeaders() });
      if (this.handleAuthResponse(resp)) return;
      if (!resp.ok) throw new Error('Admin API unavailable');
      const data = await resp.json();
      this.dbAvailable = true;
      this.data = {
        settings: data.settings || {},
        stats: data.stats || {},
        services: data.services || [],
        packages: data.packages || [],
        projects: data.projects || [],
        blog: data.blog || [],
        quotes: data.quotes || [],
        messages: data.messages || [],
        testimonials: data.testimonials || [],
        team: data.team || [],
        faq: data.faq || [],
        activity: data.activity || []
      };
    } catch (error) {
      console.warn('Admin DB unavailable, using localStorage fallback.', error.message || error);
      this.dbAvailable = false;
      this.loadFromLocalStorage();
    }
  },

  // M-Pesa orders live under their own router (mpesaRoutes.ts -> /api/mpesa),
  // not the /api/admin bulk endpoint above, so they're fetched separately.
  // Kept independent of `dbAvailable` so a hiccup in one doesn't hide the other.
  async loadMpesaOrders() {
    try {
      const resp = await fetch(`${this.MPESA_API_BASE}/orders`, { headers: this.authHeaders() });
      if (this.handleAuthResponse(resp)) return;
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const data = await resp.json();
      this.data.mpesaOrders = data.orders || [];
      this.mpesaAvailable = true;
      this.saveLocal('mpesaOrders', this.data.mpesaOrders); // cache for offline viewing
    } catch (error) {
      console.warn('M-Pesa orders unavailable, using cached copy if any.', error.message || error);
      this.mpesaAvailable = false;
      this.data.mpesaOrders = this.loadLocal('mpesaOrders');
    }
  },

  loadLocal(key) {
    try {
      const raw = localStorage.getItem(this.DB_KEYS[key]);
      if (!raw) return (key === 'stats' || key === 'settings') ? {} : [];
      return JSON.parse(raw);
    } catch (e) {
      return (key === 'stats' || key === 'settings') ? {} : [];
    }
  },

  loadFromLocalStorage() {
    const keys = ['settings', 'stats', 'services', 'packages', 'projects', 'blog', 'quotes', 'messages', 'testimonials', 'team', 'faq', 'activity'];
    keys.forEach((key) => {
      this.data[key] = this.loadLocal(key);
    });
  },

  load(key) {
    if (key === 'mpesaOrders') {
      return this.data.mpesaOrders || [];
    }
    if (this.dbAvailable) {
      return this.data[key] || ((key === 'stats' || key === 'settings') ? {} : []);
    }
    return this.loadLocal(key);
  },

  saveLocal(key, data) {
    localStorage.setItem(this.DB_KEYS[key], JSON.stringify(data));
    this.data[key] = data;
  },

  async save(key, data) {
    if (key === 'mpesaOrders') {
      this.data.mpesaOrders = data;
      this.saveLocal('mpesaOrders', data); // local cache only, for offline viewing
      return true;
    }
    if (this.dbAvailable) {
      this.data[key] = data;
      return await this.syncKey(key, data);
    } else {
      this.saveLocal(key, data);
      // No DB connection — this was only ever written to localStorage.
      return false;
    }
  },

  async syncKey(key, data) {
    if (!this.dbAvailable) return false;
    try {
      const headers = this.authHeaders({ 'Content-Type': 'application/json' });
      let resp;
      if (['services', 'packages', 'projects', 'blog', 'testimonials', 'team', 'faq'].includes(key)) {
        resp = await fetch(`${this.DB_API_BASE}/bulk`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: key, items: data })
        });
      } else if (key === 'settings') {
        resp = await fetch(`${this.DB_API_BASE}/settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data)
        });
      } else if (key === 'stats') {
        resp = await fetch(`${this.DB_API_BASE}/stats`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data)
        });
      } else {
        return true; // key not DB-backed (e.g. activity handled separately)
      }

      if (this.handleAuthResponse(resp)) return false;
      if (!resp.ok) {
        let detail = '';
        try { detail = (await resp.json()).error || ''; } catch (e) { /* non-JSON error body */ }
        throw new Error(`Server responded ${resp.status}${detail ? ' — ' + detail : ''}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to sync ${key} to DB.`, error.message || error);
      this.toast(`Could not save to the database: ${error.message || error}`, 'error');
      return false;
    }
  },

  async updateItem(type, id, patch) {
    const isMpesa = type === 'mpesaOrders';
    if (isMpesa ? !this.mpesaAvailable : !this.dbAvailable) return false;
    const url = isMpesa ? `${this.MPESA_API_BASE}/orders/${id}` : `${this.DB_API_BASE}/${type}/${id}`;
    try {
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(patch)
      });
      if (this.handleAuthResponse(resp)) return false;
      if (!resp.ok) {
        let detail = '';
        try { detail = (await resp.json()).error || ''; } catch (e) { /* non-JSON error body */ }
        throw new Error(`Server responded ${resp.status}${detail ? ' — ' + detail : ''}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to update ${type}/${id}`, error.message || error);
      this.toast(`Could not save changes to the database: ${error.message || error}`, 'error');
      return false;
    }
  },

  nextId(key) {
    const items = this.load(key);
    return items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },

  // ---------- NAVIGATION ----------
  setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.navigateTo(section);
      });
    });
  },

  navigateTo(section) {
    this.currentSection = section;

    // Update nav active state
    document.querySelectorAll('.nav-item[data-section]').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');

    // Show/hide sections
    document.querySelectorAll('.section-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`section-${section}`);
    if (panel) panel.style.display = 'block';

    // Update title
    const titles = {
      dashboard: 'Dashboard', services: 'Services', packages: 'Packages',
      projects: 'Projects / Portfolio', blog: 'Blog Posts', quotes: 'Quote Requests',
      messages: 'Contact Messages', testimonials: 'Testimonials', team: 'Team Members',
      faq: 'FAQ Management', stats: 'Stats / Counters', settings: 'Site Settings',
      mpesa: 'M-Pesa Orders'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    // Close mobile sidebar + overlay
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
  },

  setupSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
      });
    }
    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  },

  setupLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem(this.DB_KEYS.auth);
      window.location.href = 'index.html';
    });
  },

  // ---------- DASHBOARD ----------
  renderDashboard() {
    const quotes = this.load('quotes');
    const messages = this.load('messages');
    const blog = this.load('blog');
    const projects = this.load('projects');
    const services = this.load('services');
    const packages = this.load('packages');
    const testimonials = this.load('testimonials');
    const team = this.load('team');
    const faq = this.load('faq');
    const mpesaOrders = this.load('mpesaOrders');

    // Main stat numbers
    this.setText('dashQuotes', quotes.length);
    this.setText('dashMessages', messages.length);
    this.setText('dashBlog', blog.length);
    this.setText('dashProjects', projects.length);
    this.setText('dashMpesa', mpesaOrders.length);

    // Trend badges
    const newQuotes = quotes.filter(q => q.status === 'New').length;
    const unreadMsgs = messages.filter(m => m.status === 'Unread').length;
    const pendingOrders = mpesaOrders.filter(o => o.status === 'pending').length;
    const paidOrders = mpesaOrders.filter(o => o.status === 'paid').length;
    this.setText('quotesTrend', `${newQuotes} new`);
    this.setText('messagesTrend', `${unreadMsgs} unread`);
    this.setText('mpesaTrend', `${paidOrders} paid`);

    // Sidebar badges
    this.updateBadge('quotesBadge', newQuotes);
    this.updateBadge('messagesBadge', unreadMsgs);
    this.updateBadge('mpesaBadge', pendingOrders);

    // Quick stats panel
    this.setText('qsServices', services.length);
    this.setText('qsPackages', packages.length);
    this.setText('qsTestimonials', testimonials.length);
    this.setText('qsTeam', team.length);
    this.setText('qsFaq', faq.length);

    // Mini charts (simulated bar data based on item counts)
    this.renderMiniChart('quotesChart', this.generateChartData(quotes.length));
    this.renderMiniChart('messagesChart', this.generateChartData(messages.length));
    this.renderMiniChart('blogChart', this.generateChartData(blog.length));
    this.renderMiniChart('projectsChart', this.generateChartData(projects.length));
    this.renderMiniChart('mpesaChart', this.generateChartData(mpesaOrders.length));

    // Activity feed
    const activity = this.load('activity').slice(-10).reverse();
    const feed = document.getElementById('recentActivity');
    if (feed) {
      if (activity.length === 0) {
        feed.innerHTML = '<p class="empty-state">No recent activity yet. Actions you take will appear here.</p>';
      } else {
        feed.innerHTML = activity.map(a => `
          <div class="activity-item">
            <div class="activity-icon">${a.icon || '📋'}</div>
            <span class="activity-text">${a.text}</span>
            <span class="activity-time">${this.timeAgo(a.timestamp)}</span>
          </div>
        `).join('');
      }
    }
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  generateChartData(total) {
    // Generate 7 bars simulating weekly data, last bar is tallest
    const bars = [];
    for (let i = 0; i < 7; i++) {
      const base = Math.max(1, total);
      bars.push(Math.round(Math.random() * base * 0.7 + base * 0.1));
    }
    bars[6] = Math.max(...bars, total); // Ensure last bar is tallest
    return bars;
  },

  renderMiniChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const max = Math.max(...data, 1);
    container.innerHTML = data.map(val => {
      const height = Math.max(4, (val / max) * 32);
      return `<div class="dash-mini-bar" style="height:${height}px;"></div>`;
    }).join('');
  },

  updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('show', count > 0);
    }
  },

  // ---------- RENDER ALL TABLES ----------
  renderAll() {
    this.renderServices();
    this.renderPackages();
    this.renderProjects();
    this.renderBlog();
    this.renderQuotes();
    this.renderMessages();
    this.renderTestimonials();
    this.renderTeam();
    this.renderFaq();
    this.renderMpesaOrders();
    this.loadStats();
    this.loadSettings();
  },

  // Resolves a stored image path/URL for display from within /admin/.
  // Uploaded images can come back as a full URL (https://...), a root-relative
  // path (/uploads/...), or a bare relative path (uploads/...). Blindly
  // prefixing everything with "../" (as this used to do) breaks the first two
  // cases and is why images could look "missing" even though the DB value
  // itself was fine.
  resolveImageUrl(url) {
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('/')) return url;
    return '../' + url;
  },

  imgThumb(url) {
    if (!url) return '<span style="color:var(--gray-400);font-size:.75rem;">No image</span>';
    return `<img src="${this.resolveImageUrl(url)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`;
  },

  getServiceName(serviceId) {
    if (!serviceId) return null;
    const services = this.load('services');
    const service = services.find((s) => String(s.id) === String(serviceId));
    return service ? service.title : null;
  },

  serviceOptionsHtml(selectedId) {
    const services = this.load('services');
    const options = ['<option value="">Select service (optional)</option>'];
    services
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .forEach((service) => {
        const value = String(service.id);
        const selected = selectedId && String(selectedId) === value ? ' selected' : '';
        options.push(`<option value="${value}"${selected}>${service.title}</option>`);
      });
    return options.join('');
  },

  renderServices() {
    const items = this.load('services').sort((a, b) => a.display_order - b.display_order);
    const tbody = document.getElementById('servicesTable');
    if (!tbody) return;
    tbody.innerHTML = items.map(s => `
      <tr>
        <td>${s.display_order}</td>
        <td style="display:flex;align-items:center;gap:.5rem;">${this.imgThumb(s.image)} <strong>${s.title}</strong></td>
        <td>${s.category}</td>
        <td><span class="status status-${s.status}">${s.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('service', ${s.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('services', ${s.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderPackages() {
    const items = this.load('packages').sort((a, b) => a.display_order - b.display_order);
    const tbody = document.getElementById('packagesTable');
    if (!tbody) return;
    tbody.innerHTML = items.map(p => `
      <tr>
        <td style="display:flex;align-items:center;gap:.5rem;">${this.imgThumb(p.image)} <strong>${p.name}</strong></td>
        <td>${p.price_label}</td>
        <td>${this.getServiceName(p.service_id) || p.category || '—'}</td>
        <td><span class="status status-${p.status}">${p.status}</span></td>
        <td>${p.featured ? '⭐' : '—'}</td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('package', ${p.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('packages', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderProjects() {
    const items = this.load('projects');
    const tbody = document.getElementById('projectsTable');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No projects added yet.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(p => `
      <tr>
        <td><strong>${p.title}</strong></td>
        <td>${p.location}</td>
        <td>${p.service}</td>
        <td>${p.date || '—'}</td>
        <td><span class="status status-${p.status}">${p.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('project', ${p.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('projects', ${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderBlog() {
    const items = this.load('blog');
    const tbody = document.getElementById('blogTable');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No blog posts yet. Create your first post!</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(b => `
      <tr>
        <td style="display:flex;align-items:center;gap:.5rem;">${this.imgThumb(b.image)} <strong>${b.title}</strong></td>
        <td>${b.category}</td>
        <td>${b.author || 'Admin'}</td>
        <td>${b.date}</td>
        <td><span class="status status-${b.status}">${b.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('blog', ${b.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('blog', ${b.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderQuotes() {
    const items = this.load('quotes');
    const tbody = document.getElementById('quotesTable');
    const empty = document.getElementById('quotesEmpty');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = items.map(q => `
      <tr>
        <td>${q.date}</td>
        <td><strong>${q.name}</strong></td>
        <td><a href="tel:${q.phone}">${q.phone}</a></td>
        <td>${q.service}</td>
        <td>${q.package || '—'}</td>
        <td>
          <select class="status-select" onchange="AdminApp.updateStatus('quotes', ${q.id}, this.value)">
            ${['New','Contacted','In Progress','Quoted','Converted','Closed'].map(s =>
              `<option value="${s}" ${q.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.viewDetail('quote', ${q.id})">View</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('quotes', ${q.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderMessages() {
    const items = this.load('messages');
    const tbody = document.getElementById('messagesTable');
    const empty = document.getElementById('messagesEmpty');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = items.map(m => `
      <tr>
        <td>${m.date}</td>
        <td><strong>${m.name}</strong></td>
        <td><a href="mailto:${m.email}">${m.email}</a></td>
        <td><a href="tel:${m.phone}">${m.phone}</a></td>
        <td>
          <select class="status-select" onchange="AdminApp.updateStatus('messages', ${m.id}, this.value)">
            ${['Unread','Read','Replied'].map(s =>
              `<option value="${s}" ${m.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.viewDetail('message', ${m.id})">View</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('messages', ${m.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderMpesaOrders() {
    const items = this.load('mpesaOrders');
    const tbody = document.getElementById('mpesaTable');
    const empty = document.getElementById('mpesaEmpty');
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = items.map(o => `
      <tr>
        <td>${o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
        <td><strong>${o.customer_name || 'N/A'}</strong>${o.customer_email ? `<br><span style="color:var(--gray-400);font-size:.8rem;">${o.customer_email}</span>` : ''}</td>
        <td><a href="tel:${o.phone}">${o.phone}</a></td>
        <td>${o.package_name || o.service || '—'}</td>
        <td>${o.currency || 'KES'} ${Number(o.amount || 0).toLocaleString()}</td>
        <td>${o.receipt_number || '—'}</td>
        <td>
          <select class="status-select" onchange="AdminApp.updateStatus('mpesaOrders', ${o.id}, this.value)">
            ${['pending','paid','failed','cancelled'].map(s =>
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.viewDetail('mpesaOrder', ${o.id})">View</button>
        </td>
      </tr>
    `).join('');
  },

  renderTestimonials() {
    const items = this.load('testimonials').sort((a, b) => a.display_order - b.display_order);
    const tbody = document.getElementById('testimonialsTable');
    if (!tbody) return;
    tbody.innerHTML = items.map(t => `
      <tr>
        <td style="display:flex;align-items:center;gap:.5rem;">${this.imgThumb(t.image)} <strong>${t.client}</strong></td>
        <td>${t.location}</td>
        <td>${t.service}</td>
        <td>${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</td>
        <td><span class="status status-${t.status}">${t.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('testimonial', ${t.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('testimonials', ${t.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderTeam() {
    const items = this.load('team').sort((a, b) => a.display_order - b.display_order);
    const tbody = document.getElementById('teamTable');
    if (!tbody) return;
    tbody.innerHTML = items.map(t => `
      <tr>
        <td style="display:flex;align-items:center;gap:.5rem;">${this.imgThumb(t.image)} <strong>${t.name}</strong></td>
        <td>${t.role}</td>
        <td><span class="status status-${t.status}">${t.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('team', ${t.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('team', ${t.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  renderFaq() {
    const items = this.load('faq').sort((a, b) => a.display_order - b.display_order);
    const tbody = document.getElementById('faqTable');
    if (!tbody) return;
    tbody.innerHTML = items.map(f => `
      <tr>
        <td>${f.display_order}</td>
        <td><strong>${f.question}</strong></td>
        <td>${f.category}</td>
        <td><span class="status status-${f.status}">${f.status}</span></td>
        <td class="actions">
          <button class="btn-admin btn-admin-sm btn-admin-outline" onclick="AdminApp.editItem('faq', ${f.id})">Edit</button>
          <button class="btn-admin btn-admin-sm btn-admin-danger" onclick="AdminApp.deleteItem('faq', ${f.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  },

  // ---------- MODAL FORMS ----------
  openModal(type, item = null) {
    this.editingType = type;
    this.editingId = item ? item.id : null;

    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('modalSaveBtn');

    title.textContent = item ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    saveBtn.onclick = () => this.saveModal();

    const forms = {
      service: () => `
        <div class="form-group"><label>Service Title</label><input type="text" id="m-title" value="${item?.title || ''}" /></div>
        <div class="form-group"><label>URL Slug</label><input type="text" id="m-slug" value="${item?.slug || ''}" placeholder="auto-generated from title if left blank" /></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="m-category"><option>Solar Energy</option><option>Water/Borehole</option><option>Pumps</option><option>Irrigation</option><option>Infrastructure</option></select></div>
          <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
        </div>
        <div class="form-group"><label>Short Description</label><textarea id="m-description">${item?.description || ''}</textarea></div>
        ${this.imageFieldHtml('Service Image', 'm-image', item?.image)}
        <div class="form-group"><label>Status</label><select id="m-status"><option>published</option><option>draft</option></select></div>
      `,
      package: () => `
        <div class="form-group"><label>Package Name</label><input type="text" id="m-name" value="${item?.name || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Price (KES)</label><input type="number" id="m-price" value="${item?.price || ''}" /></div>
          <div class="form-group"><label>Price Label</label><input type="text" id="m-price_label" value="${item?.price_label || ''}" placeholder="Call us to enquire" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="m-category"><option>Solar</option><option>Pumps</option><option>Irrigation</option><option>Infrastructure</option></select></div>
          <div class="form-group"><label>Service</label><select id="m-service-id">${this.serviceOptionsHtml(item?.service_id)}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
        </div>
        <div class="form-group"><label>Specifications (comma-separated)</label><textarea id="m-specs">${item?.specs || ''}</textarea></div>
        ${this.imageFieldHtml('Package Image', 'm-image', item?.image)}
        <div class="form-row">
          <div class="form-group"><label>Status</label><select id="m-status"><option>active</option><option>inactive</option><option>coming soon</option></select></div>
          <div class="form-group"><label>Featured</label><select id="m-featured"><option value="false">No</option><option value="true">Yes</option></select></div>
        </div>
      `,
      project: () => `
        <div class="form-group"><label>Project Title</label><input type="text" id="m-title" value="${item?.title || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Location (County)</label><input type="text" id="m-location" value="${item?.location || ''}" /></div>
          <div class="form-group"><label>Service Type</label><select id="m-service"><option>Solar Installation</option><option>Hybrid Solar</option><option>Borehole Drilling</option><option>Borehole Rehabilitation</option><option>Pump Installation</option><option>Irrigation</option><option>Tank Tower</option><option>Solar Structure</option></select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="m-description">${item?.description || ''}</textarea></div>
        ${this.imageFieldHtml('Before Image', 'm-image', item?.image)}
        ${this.imageFieldHtml('After Image', 'm-image2', item?.image2)}
        <div class="form-row">
          <div class="form-group"><label>Date Completed</label><input type="date" id="m-date" value="${item?.date || ''}" /></div>
          <div class="form-group"><label>Status</label><select id="m-status"><option>published</option><option>draft</option></select></div>
        </div>
        <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
        <div class="form-group"><label>Client Name</label><input type="text" id="m-client" value="${item?.client || ''}" /></div>
        <div class="form-group"><label>Client Testimonial</label><textarea id="m-testimonial">${item?.testimonial || ''}</textarea></div>
      `,
      blog: () => `
        <div class="form-group"><label>Post Title</label><input type="text" id="m-title" value="${item?.title || ''}" /></div>
        <div class="form-group"><label>URL Slug</label><input type="text" id="m-slug" value="${item?.slug || ''}" placeholder="auto-generated from title if left blank" /></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="m-category"><option>Solar Energy Guide</option><option>Borehole Drilling Tips</option><option>Irrigation & Farming</option><option>Water Conservation</option><option>Company News</option><option>Product Reviews</option></select></div>
          <div class="form-group"><label>Author</label><input type="text" id="m-author" value="${item?.author || 'Admin'}" /></div>
        </div>
        ${this.imageFieldHtml('Featured Image', 'm-image', item?.image)}
        <div class="form-group"><label>Excerpt / Summary</label><textarea id="m-excerpt">${item?.excerpt || ''}</textarea></div>
        <div class="form-group"><label>Content</label><textarea id="m-content" style="min-height:200px;">${item?.content || ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Date</label><input type="date" id="m-date" value="${item?.date || new Date().toISOString().split('T')[0]}" /></div>
          <div class="form-group"><label>Status</label><select id="m-status"><option>published</option><option>draft</option><option>scheduled</option></select></div>
        </div>
        <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="m-tags" value="${item?.tags || ''}" /></div>
      `,
      testimonial: () => `
        <div class="form-row">
          <div class="form-group"><label>Client Name</label><input type="text" id="m-client" value="${item?.client || ''}" /></div>
          <div class="form-group"><label>Location</label><input type="text" id="m-location" value="${item?.location || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Service Received</label><input type="text" id="m-service" value="${item?.service || ''}" /></div>
          <div class="form-group"><label>Rating (1-5)</label><input type="number" id="m-rating" min="1" max="5" value="${item?.rating || 5}" /></div>
        </div>
        <div class="form-group"><label>Testimonial Text</label><textarea id="m-text">${item?.text || ''}</textarea></div>
        ${this.imageFieldHtml('Client Photo', 'm-image', item?.image)}
        <div class="form-row">
          <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
          <div class="form-group"><label>Status</label><select id="m-status"><option>published</option><option>draft</option></select></div>
        </div>
      `,
      team: () => `
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" id="m-name" value="${item?.name || ''}" /></div>
          <div class="form-group"><label>Role / Title</label><input type="text" id="m-role" value="${item?.role || ''}" /></div>
        </div>
        <div class="form-group"><label>Bio</label><textarea id="m-bio">${item?.bio || ''}</textarea></div>
        ${this.imageFieldHtml('Profile Photo', 'm-image', item?.image)}
        <div class="form-row">
          <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
          <div class="form-group"><label>Status</label><select id="m-status"><option>active</option><option>inactive</option></select></div>
        </div>
      `,
      faq: () => `
        <div class="form-group"><label>Question</label><input type="text" id="m-question" value="${item?.question || ''}" /></div>
        <div class="form-group"><label>Answer</label><textarea id="m-answer" style="min-height:150px;">${item?.answer || ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="m-category"><option>Borehole & Water</option><option>Solar Energy</option><option>Pumps & Irrigation</option><option>General</option></select></div>
          <div class="form-group"><label>Display Order</label><input type="number" id="m-order" value="${item?.display_order || ''}" /></div>
        </div>
        <div class="form-group"><label>Status</label><select id="m-status"><option>published</option><option>draft</option></select></div>
      `
    };

    body.innerHTML = forms[type] ? forms[type]() : '';

    // Set select values for editing
    if (item) {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
      setVal('m-category', item.category);
      setVal('m-status', item.status);
      setVal('m-featured', String(item.featured));
      setVal('m-service', item.service);
      setVal('m-service-id', item.service_id || '');
    }

    document.getElementById('modalOverlay').classList.add('open');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    this.editingId = null;
    this.editingType = null;
  },

  async saveModal() {
    const type = this.editingType;
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    const keyMap = {
      service: 'services', package: 'packages', project: 'projects',
      blog: 'blog', testimonial: 'testimonials', team: 'team', faq: 'faq'
    };
    const storeKey = keyMap[type];
    const items = this.load(storeKey);

    let item;
    if (this.editingId) {
      item = items.find(i => i.id === this.editingId);
    } else {
      item = { id: this.nextId(storeKey) };
      items.push(item);
    }

    // Upload images if present (except faq which has no image).
    // uploadImage() returns: a URL string on success, '' if the user didn't
    // pick a new file (use whatever's in the hidden -url field, which may
    // itself be '' if they hit Remove), or null if the upload attempt failed.
    // Treating a failed upload the same as "no image" is what was silently
    // writing blank/null images to the database — so on failure we now stop
    // the save entirely instead of continuing with the other fields.
    const resolveImage = async (fieldId, section, id) => {
      const result = await this.uploadImage(fieldId, section, id);
      if (result === null) return { failed: true, value: undefined };
      if (result) return { failed: false, value: result };
      const hidden = document.getElementById(fieldId + '-url');
      return { failed: false, value: hidden ? hidden.value : '' };
    };

    if (type !== 'faq') {
      const img = await resolveImage('m-image', type, item.id);
      if (img.failed) {
        if (!this.editingId) items.splice(items.indexOf(item), 1); // don't leave a half-created item in local state
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        return; // uploadImage() already showed the error toast
      }
      item.image = img.value;
    }
    // Project has before/after images
    if (type === 'project') {
      const img2 = await resolveImage('m-image2', type, item.id + '-after');
      if (img2.failed) {
        if (!this.editingId) items.splice(items.indexOf(item), 1);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        return;
      }
      item.image2 = img2.value;
    }

    // Populate fields based on type
    switch (type) {
      case 'service': {
        item.title = val('m-title');
        const manualSlug = val('m-slug');
        if (manualSlug) {
          item.slug = manualSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        } else if (!this.editingId) {
          // Only auto-derive a slug when creating a new service and none was
          // typed in. Regenerating it on every edit — even ones that don't
          // touch the title — silently rewrites the slug to a value that no
          // longer matches the hand-picked <section id="..."> anchors in
          // services.html, which makes the service vanish from the public
          // site even though the DB save itself succeeds.
          item.slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        item.category = val('m-category');
        item.description = val('m-description');
        item.status = val('m-status');
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        break;
      }
      case 'package':
        item.name = val('m-name');
        item.price = parseInt(val('m-price')) || 0;
        item.price_label = val('m-price_label');
        item.category = val('m-category');
        item.service_id = parseInt(val('m-service-id')) || null;
        item.specs = val('m-specs');
        item.status = val('m-status');
        item.featured = val('m-featured') === 'true';
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        break;
      case 'project':
        item.title = val('m-title');
        item.location = val('m-location');
        item.service = val('m-service');
        item.description = val('m-description');
        item.date = val('m-date');
        item.status = val('m-status');
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        item.client = val('m-client');
        item.testimonial = val('m-testimonial');
        break;
      case 'blog': {
        item.title = val('m-title');
        const manualSlug = val('m-slug');
        if (manualSlug) {
          item.slug = manualSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        } else if (!this.editingId) {
          // Same reasoning as services: don't auto-regenerate the slug on
          // edit, or previously shared/bookmarked blog-post.html?slug=...
          // links break every time the post is updated.
          item.slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        item.category = val('m-category');
        item.author = val('m-author');
        item.excerpt = val('m-excerpt');
        item.content = val('m-content');
        item.date = val('m-date');
        item.status = val('m-status');
        item.tags = val('m-tags');
        break;
      }
      case 'testimonial':
        item.client = val('m-client');
        item.location = val('m-location');
        item.service = val('m-service');
        item.rating = parseInt(val('m-rating')) || 5;
        item.text = val('m-text');
        item.status = val('m-status');
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        break;
      case 'team':
        item.name = val('m-name');
        item.role = val('m-role');
        item.bio = val('m-bio');
        item.status = val('m-status');
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        break;
      case 'faq':
        item.question = val('m-question');
        item.answer = val('m-answer');
        item.category = val('m-category');
        item.status = val('m-status');
        item.display_order = parseInt(val('m-order')) || item.display_order || items.length;
        break;
    }

    const dbSaved = await this.save(storeKey, items);

    if (this.dbAvailable && !dbSaved) {
      // syncKey() already showed the specific error toast. Keep the modal open
      // (with the image already uploaded, so the user doesn't lose that step)
      // so they can retry instead of believing this was saved when it wasn't.
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Retry Save'; }
      return;
    }

    this.logActivity(this.editingId ? `Updated ${type}: ${item.title || item.name || item.client || item.question}` : `Added new ${type}: ${item.title || item.name || item.client || item.question}`, '📋');
    this.closeModal();
    this.renderAll();
    this.renderDashboard();
    this.toast(this.dbAvailable ? 'Saved successfully!' : 'Saved locally — no database connection, so this will not persist.', this.dbAvailable ? 'success' : 'error');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  },

  editItem(type, id) {
    const keyMap = {
      service: 'services', package: 'packages', project: 'projects',
      blog: 'blog', testimonial: 'testimonials', team: 'team', faq: 'faq'
    };
    const items = this.load(keyMap[type]);
    const item = items.find(i => i.id === id);
    if (item) this.openModal(type, item);
  },

  async deleteItem(storeKey, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    let items = this.load(storeKey);
    const item = items.find(i => i.id === id);
    items = items.filter(i => i.id !== id);
    await this.save(storeKey, items);
    if (this.dbAvailable) {
      try {
        const resp = await fetch(`${this.DB_API_BASE}/${storeKey}/${id}`, { method: 'DELETE', headers: this.authHeaders() });
        this.handleAuthResponse(resp);
      } catch (error) {
        console.warn('Failed to delete item in DB.', error.message || error);
      }
    }
    this.logActivity(`Deleted item from ${storeKey}`, '🗑️');
    this.renderAll();
    this.renderDashboard();
    this.toast('Item deleted.', 'success');
  },

  async updateStatus(storeKey, id, newStatus) {
    const items = this.load(storeKey);
    const item = items.find(i => i.id === id);
    if (item) {
      item.status = newStatus;
      await this.save(storeKey, items);
      if (storeKey === 'mpesaOrders') {
        if (this.mpesaAvailable) await this.updateItem(storeKey, id, { status: newStatus });
      } else if (this.dbAvailable && (storeKey === 'quotes' || storeKey === 'messages')) {
        await this.updateItem(storeKey, id, { status: newStatus });
      }
      this.logActivity(`Updated ${storeKey} status to "${newStatus}" for ${item.name || item.customer_name || item.title || 'item'}`, '🔄');
      this.renderAll();
      this.renderDashboard();
    }
  },

  // ---------- DETAIL VIEW ----------
  async viewDetail(type, id) {
    const storeKey = type === 'quote' ? 'quotes' : type === 'mpesaOrder' ? 'mpesaOrders' : 'messages';
    const items = this.load(storeKey);
    const item = items.find(i => i.id === id);
    if (!item) return;

    const title = document.getElementById('detailTitle');
    const body = document.getElementById('detailBody');

    if (type === 'quote') {
      title.textContent = `Quote Request — ${item.name}`;
      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>Name</label><span>${item.name}</span></div>
          <div class="detail-item"><label>Phone</label><span><a href="tel:${item.phone}">${item.phone}</a></span></div>
          <div class="detail-item"><label>Email</label><span><a href="mailto:${item.email}">${item.email}</a></span></div>
          <div class="detail-item"><label>Location</label><span>${item.location || '—'}</span></div>
          <div class="detail-item"><label>Service</label><span>${item.service}</span></div>
          <div class="detail-item"><label>Package</label><span>${item.package || '—'}</span></div>
          <div class="detail-item"><label>Contact Method</label><span>${item.contactMethod || '—'}</span></div>
          <div class="detail-item"><label>Date</label><span>${item.date}</span></div>
          <div class="detail-item detail-full"><label>Description</label><span>${item.description || '—'}</span></div>
        </div>
        <div class="detail-notes">
          <label style="font-weight:600;font-size:.85rem;display:block;margin-bottom:.35rem;">Internal Notes</label>
          <textarea id="detail-notes" placeholder="Add internal notes...">${item.notes || ''}</textarea>
          <button class="btn-admin btn-admin-sm btn-admin-primary" style="margin-top:.5rem;" onclick="AdminApp.saveNotes('quotes', ${id})">Save Notes</button>
        </div>
      `;
    } else if (type === 'mpesaOrder') {
      title.textContent = `M-Pesa Order #${item.id} — ${item.customer_name || 'N/A'}`;
      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>Customer</label><span>${item.customer_name || '—'}</span></div>
          <div class="detail-item"><label>Phone</label><span><a href="tel:${item.phone}">${item.phone}</a></span></div>
          <div class="detail-item"><label>Email</label><span>${item.customer_email ? `<a href="mailto:${item.customer_email}">${item.customer_email}</a>` : '—'}</span></div>
          <div class="detail-item"><label>Service / Package</label><span>${item.package_name || item.service || '—'}</span></div>
          <div class="detail-item"><label>Amount</label><span>${item.currency || 'KES'} ${Number(item.amount || 0).toLocaleString()}</span></div>
          <div class="detail-item"><label>Status</label><span>${item.status}</span></div>
          <div class="detail-item"><label>Account Reference</label><span>${item.account_reference || '—'}</span></div>
          <div class="detail-item"><label>Transaction Desc.</label><span>${item.transaction_desc || '—'}</span></div>
          <div class="detail-item"><label>M-Pesa Receipt No.</label><span>${item.receipt_number || '—'}</span></div>
          <div class="detail-item"><label>Transaction ID</label><span>${item.transaction_id || '—'}</span></div>
          <div class="detail-item"><label>Checkout Request ID</label><span style="font-size:.75rem;word-break:break-all;">${item.checkout_request_id || '—'}</span></div>
          <div class="detail-item"><label>Merchant Request ID</label><span style="font-size:.75rem;word-break:break-all;">${item.merchant_request_id || '—'}</span></div>
          <div class="detail-item"><label>Result Code / Desc.</label><span>${item.result_code ?? '—'} ${item.result_desc ? '— ' + item.result_desc : ''}</span></div>
          <div class="detail-item"><label>Created</label><span>${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span></div>
          <div class="detail-item"><label>Paid At</label><span>${item.paid_at ? new Date(item.paid_at).toLocaleString() : '—'}</span></div>
          <div class="detail-item detail-full"><label>Delivery Address</label><span>${item.delivery_address || '—'}</span></div>
        </div>
      `;
    } else {
      title.textContent = `Message — ${item.name}`;
      // Mark as read
      if (item.status === 'Unread') {
        item.status = 'Read';
        await this.save(storeKey, items);
        this.renderMessages();
        this.renderDashboard();
      }
      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>Name</label><span>${item.name}</span></div>
          <div class="detail-item"><label>Phone</label><span><a href="tel:${item.phone}">${item.phone}</a></span></div>
          <div class="detail-item"><label>Email</label><span><a href="mailto:${item.email}">${item.email}</a></span></div>
          <div class="detail-item"><label>Date</label><span>${item.date}</span></div>
          <div class="detail-item"><label>Service Interest</label><span>${item.service || '—'}</span></div>
          <div class="detail-item detail-full"><label>Message</label><span>${item.message}</span></div>
        </div>
      `;
    }

    document.getElementById('detailOverlay').classList.add('open');
  },

  closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
  },

  async saveNotes(storeKey, id) {
    const items = this.load(storeKey);
    const item = items.find(i => i.id === id);
    if (item) {
      item.notes = document.getElementById('detail-notes')?.value || '';
      await this.save(storeKey, items);
      if (this.dbAvailable && (storeKey === 'quotes' || storeKey === 'messages')) {
        await this.updateItem(storeKey, id, { notes: item.notes });
      }
      this.toast('Notes saved!', 'success');
    }
  },

  // ---------- STATS ----------
  setupStats() {
    document.getElementById('saveStatsBtn')?.addEventListener('click', async () => {
      const stats = {
        boreholes: parseInt(document.getElementById('stat-boreholes')?.value) || 0,
        solar: parseInt(document.getElementById('stat-solar')?.value) || 0,
        clients: parseInt(document.getElementById('stat-clients')?.value) || 0,
        counties: parseInt(document.getElementById('stat-counties')?.value) || 0
      };
      const ok = await this.save('stats', stats);
      if (this.dbAvailable && !ok) return; // error toast already shown by syncKey
      this.logActivity('Updated homepage stats', '📈');
      this.toast('Stats saved!', 'success');
    });
  },

  loadStats() {
    const stats = this.load('stats');
    if (stats && !Array.isArray(stats)) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
      set('stat-boreholes', stats.boreholes);
      set('stat-solar', stats.solar);
      set('stat-clients', stats.clients);
      set('stat-counties', stats.counties);
    }
  },

  // ---------- SETTINGS ----------
  setupSettings() {
    document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
      const val = (id) => document.getElementById(id)?.value || '';
      const settings = {
        company: val('set-company'), tagline: val('set-tagline'),
        phone: val('set-phone'), email: val('set-email'),
        whatsapp: val('set-whatsapp'), address: val('set-address'),
        hours: val('set-hours'), facebook: val('set-facebook'),
        instagram: val('set-instagram'), tiktok: val('set-tiktok'),
        linkedin: val('set-linkedin'), youtube: val('set-youtube'),
        twitter: val('set-twitter'), ga: val('set-ga')
      };
      const ok = await this.save('settings', settings);
      if (this.dbAvailable && !ok) return; // error toast already shown by syncKey
      this.logActivity('Updated site settings', '🔧');
      this.toast('Settings saved!', 'success');
    });

    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
      const newPw = document.getElementById('newPassword')?.value;
      const confirmPw = document.getElementById('confirmPassword')?.value;
      if (!newPw || newPw.length < 6) return this.toast('Password must be at least 6 characters.', 'error');
      if (newPw !== confirmPw) return this.toast('Passwords do not match.', 'error');
      if (!this.dbAvailable) return this.toast('Cannot change password — not connected to the database.', 'error');
      try {
        const resp = await fetch(`${this.DB_API_BASE}/change-password`, {
          method: 'PUT',
          headers: this.authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ newPassword: newPw })
        });
        if (this.handleAuthResponse(resp)) return;
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || !result.success) {
          throw new Error(result.error || `Server responded ${resp.status}`);
        }
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        this.toast('Password updated!', 'success');
      } catch (error) {
        this.toast(`Could not change password: ${error.message || error}`, 'error');
      }
    });
  },

  loadSettings() {
    const settings = this.load('settings');
    if (settings && !Array.isArray(settings)) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      set('set-company', settings.company); set('set-tagline', settings.tagline);
      set('set-phone', settings.phone); set('set-email', settings.email);
      set('set-whatsapp', settings.whatsapp); set('set-address', settings.address);
      set('set-hours', settings.hours); set('set-facebook', settings.facebook);
      set('set-instagram', settings.instagram); set('set-tiktok', settings.tiktok);
      set('set-linkedin', settings.linkedin); set('set-youtube', settings.youtube);
      set('set-twitter', settings.twitter); set('set-ga', settings.ga);
    }
  },

  // ---------- EXPORT CSV ----------
  exportCSV(storeKey) {
    const items = this.load(storeKey);
    if (items.length === 0) return this.toast('No data to export.', 'error');

    const headers = Object.keys(items[0]);
    const csv = [
      headers.join(','),
      ...items.map(item => headers.map(h => `"${String(item[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ankhydro-${storeKey}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('CSV exported!', 'success');
  },

  // ---------- ACTIVITY LOG ----------
  async logActivity(text, icon = '📋') {
    const entry = { text, icon, timestamp: Date.now() };
    const activity = this.load('activity');
    activity.push(entry);
    if (activity.length > 50) activity.splice(0, activity.length - 50);
    this.save('activity', activity);

    if (this.dbAvailable) {
      try {
        const resp = await fetch(`${this.DB_API_BASE}/activity`, {
          method: 'POST',
          headers: this.authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ action: text, icon, user_email: JSON.parse(localStorage.getItem(this.DB_KEYS.auth) || '{}').email || null, metadata: null })
        });
        this.handleAuthResponse(resp);
      } catch (error) {
        console.warn('Failed to write activity log to DB.', error.message || error);
      }
    }
  },

  timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  },

  // ---------- GATHER SITE DATA ----------
  gatherSiteData() {
    return {
      settings: this.getSourceData('settings'),
      stats: this.getSourceData('stats'),
      services: this.getSourceData('services'),
      packages: this.getSourceData('packages'),
      testimonials: this.getSourceData('testimonials'),
      team: this.getSourceData('team'),
      faq: this.getSourceData('faq'),
      blog: this.getSourceData('blog'),
      projects: this.getSourceData('projects'),
      published_at: new Date().toISOString()
    };
  },

  // Load that handles both arrays and objects (stats/settings are objects)
  loadSafe(key) {
    try {
      const raw = localStorage.getItem(this.DB_KEYS[key]);
      if (!raw) return key === 'stats' || key === 'settings' ? {} : [];
      return JSON.parse(raw);
    } catch (e) {
      return key === 'stats' || key === 'settings' ? {} : [];
    }
  },

  getSourceData(key) {
    if (this.dbAvailable) {
      return this.data[key] || (key === 'stats' || key === 'settings' ? {} : []);
    }
    return this.loadSafe(key);
  },

  // ---------- PUBLISH TO LIVE SITE ----------
  async publishToLive() {
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publishing...';
    }

    try {
      const endpoint = this.BACKEND_HOST + '/api/site-data/publish';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' })
      });
      const result = await resp.json();

      if (resp.ok && result.success) {
        this.logActivity('Published all content to live site', '🚀');
        this.toast('Published to live site successfully!', 'success');
      } else {
        this.toast('Publish failed: ' + (result.error || 'Unknown error') + ' — Use "Download JSON" as fallback.', 'error');
      }
    } catch (err) {
      this.toast('Server unavailable. Use "Download JSON" to publish manually.', 'error');
    }

    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.textContent = '🚀 Publish to Live';
    }
  },

  // ---------- DOWNLOAD JSON (fallback for no-PHP environments) ----------
  downloadSiteData() {
    const siteData = this.gatherSiteData();
    delete siteData.auth_token;
    const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.logActivity('Downloaded site-data.json for manual upload', '📥');
    this.toast('Downloaded site-data.json — upload it to your website root folder.', 'success');
  },

  // ---------- TOAST ----------
  toast(message, type = '') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => AdminApp.init());