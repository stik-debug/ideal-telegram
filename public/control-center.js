/* Skillora Owner Control Center — organized layout + announcement banner.
   Loaded after app.js (globals: me, api, esc, setView, auth, header). Server enforces admin-only access. */
(function () {
  'use strict';
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from((r || document).querySelectorAll(s));
  const isAdminPath = () => location.pathname === '/admin' || location.pathname === '/control-center';
  const toast = (msg, bad) => {
    let el = q('#cc-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cc-toast';
      el.className = 'cc-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'cc-toast' + (bad ? ' bad' : '') + ' show';
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.className = 'cc-toast'; el.textContent = ''; }, 4500);
  };
  const fmt = (n) => Number(n || 0).toLocaleString();

  async function showAnnouncement() {
    try {
      const a = await fetch('/api/announcement', { credentials: 'same-origin' }).then((r) => r.json());
      if (!a || !a.message) return;
      let dismissed = '';
      try { dismissed = sessionStorage.getItem('skillora.announcement') || ''; } catch { }
      if (dismissed === String(a.id)) return;
      const bar = document.createElement('div');
      bar.className = 'announce announce-' + esc(a.level);
      bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>${esc(a.message)}</span><button type="button" aria-label="Dismiss announcement">×</button>`;
      bar.querySelector('button').onclick = () => {
        bar.remove();
        try { sessionStorage.setItem('skillora.announcement', String(a.id)); } catch { }
      };
      document.body.insertBefore(bar, document.body.firstChild.nextSibling || document.body.firstChild);
    } catch { }
  }

  window.openControlCenter = async function () {
    if (!me) {
      auth();
      const card = q('.auth-card');
      if (card) {
        card.insertAdjacentHTML('afterbegin', '<p class="cc-signin-note" role="status"><b>Owner sign-in.</b> Use your owner/admin account to open the Control Center.</p>');
      }
      return;
    }
    if (me.role !== 'admin') {
      setView(`<section class="view-shell"><div class="view-head"><h1>Control Center</h1>
        <p>This account (${esc(me.email)}) is not an admin. Sign out and sign in with the owner account.</p>
        <button class="btn-solid" id="cc-denied-out">Sign out</button></div></section>`);
      q('#cc-denied-out').onclick = () => api('/logout', 'POST').then(() => location.reload());
      return;
    }
    await window.adminDash();
  };

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.openControlCenter();
    }
  });

  if (isAdminPath()) {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => window.openControlCenter(), 50));
  }

  const NAV = [
    { id: 'cc-overview', label: 'Overview', group: 'Home' },
    { id: 'cc-attention', label: 'Needs attention', group: 'Home' },
    { id: 'cc-students', label: 'Students', group: 'Learners' },
    { id: 'cc-enrolments', label: 'Enrolments', group: 'Learners' },
    { id: 'cc-assignments', label: 'Assignments', group: 'Learners' },
    { id: 'cc-support', label: 'Support tickets', group: 'Learners' },
    { id: 'cc-courses', label: 'Courses', group: 'Content' },
    { id: 'cc-certs', label: 'Certificates', group: 'Content' },
    { id: 'cc-payments', label: 'Payments', group: 'Money' },
    { id: 'cc-completion', label: 'Completion health', group: 'Money' },
    { id: 'cc-moderation', label: 'Moderation', group: 'Community' },
    { id: 'cc-community', label: 'Community tools', group: 'Community' },
    { id: 'cc-tools', label: 'Owner tools', group: 'System' },
    { id: 'cc-audit', label: 'Audit log', group: 'System' },
    { id: 'cc-deleted', label: 'Closed accounts', group: 'System' },
    { id: 'cc-revenue', label: 'Revenue', group: 'Money' },
    { id: 'cc-dbpay', label: 'Database & payments', group: 'System' },
  ];

  function slugifyHeading(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('payment oversight')) return 'cc-payments';
    if (t.includes('course completion')) return 'cc-completion';
    if (t.includes('audit')) return 'cc-audit';
    if (t.includes('course management')) return 'cc-courses';
    if (t.includes('student')) return 'cc-students';
    if (t.includes('enrol')) return 'cc-enrolments';
    if (t.includes('assignment')) return 'cc-assignments';
    if (t.includes('support')) return 'cc-support';
    if (t.includes('certificate')) return 'cc-certs';
    if (t.includes('moderation') || t.includes('freelance') || t.includes('career') || t.includes('employer') || t.includes('instructor')) return 'cc-moderation';
    if (t.includes('owner tool') || t.includes('announcement') || t.includes('password') || t.includes('users & admin')) return 'cc-tools';
    if (t.includes('community') || t.includes('cohort') || t.includes('outcome') || t.includes('mentor')) return 'cc-community';
    return null;
  }

  function buildSidebar(activeId) {
    let html = '<aside class="cc-sidebar" aria-label="Control Center navigation"><div class="cc-sidebar-brand"><span class="cc-dot"></span><div><strong>Control Center</strong><small>Owner tools</small></div></div>';
    let lastGroup = '';
    for (const item of NAV) {
      if (item.group !== lastGroup) {
        if (lastGroup) html += '</div>';
        html += `<div class="cc-nav-group"><p class="cc-nav-label">${item.group}</p>`;
        lastGroup = item.group;
      }
      html += `<a class="cc-nav-link${item.id === activeId ? ' active' : ''}" href="#${item.id}" data-cc-nav="${item.id}">${item.label}</a>`;
    }
    html += '</div><div class="cc-sidebar-foot"><button type="button" class="cc-nav-link" id="cc-sidebar-refresh">↻ Refresh data</button><a class="cc-nav-link" href="/">← Back to site</a></div></aside>';
    return html;
  }

  function panelToSection(panel, id) {
    panel.classList.add('cc-section-card');
    panel.id = id;
    panel.hidden = true;
    return panel;
  }

  async function reorganize() {
    const shell = q('#main .view-shell') || q('.view-shell');
    if (!shell || shell.dataset.ccLayout === '1') return;
    shell.dataset.ccLayout = '1';
    shell.classList.add('cc-shell');

    const metricGrids = qa(':scope > .dashboard-grid', shell);
    const metrics = [];
    metricGrids.forEach((grid) => {
      qa('article.panel, .panel', grid).forEach((card) => {
        const label = (q('p', card) || {}).textContent || '';
        const value = (q('h2', card) || {}).textContent || '';
        if (label || value) metrics.push({ label, value });
      });
    });

    const sections = {};
    qa(':scope > .panel', shell).forEach((panel) => {
      const h = q('h2, h3', panel);
      const id = slugifyHeading(h && h.textContent);
      if (id) sections[id] = panelToSection(panel, id);
    });

    const layout = document.createElement('div');
    layout.className = 'cc-layout';
    layout.innerHTML = buildSidebar('cc-overview');

    const main = document.createElement('div');
    main.className = 'cc-main';

    const top = document.createElement('header');
    top.className = 'cc-topbar';
    top.innerHTML = `<div><p class="eyebrow dark">SKILLORA OWNER</p><h1>Control Center</h1>
      <p class="cc-top-sub">Manage learners, courses, payments and site settings.</p></div>
      <div class="cc-top-actions"><span class="cc-who">${esc(me?.email || 'Admin')}</span>
      <button type="button" class="course-open" id="cc-refresh">Refresh</button></div>`;
    main.appendChild(top);

    const overview = document.createElement('section');
    overview.id = 'cc-overview';
    overview.className = 'cc-section-card cc-overview';
    overview.innerHTML = `<div class="cc-section-head"><h2>Overview</h2><p>Snapshot of your academy right now.</p></div>
      <div class="cc-metric-grid">${metrics.map((m) => `<article class="cc-metric"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></article>`).join('') || '<p class="muted">No metrics yet.</p>'}</div>`;
    main.appendChild(overview);

    const attention = document.createElement('section');
    attention.id = 'cc-attention';
    attention.className = 'cc-section-card';
    attention.hidden = true;
    attention.innerHTML = `<div class="cc-section-head"><h2>Needs your attention</h2><p>Items waiting for an owner decision.</p></div><div class="cc-tiles" id="cc-attention-tiles"></div>`;
    main.appendChild(attention);

    const order = NAV.map((n) => n.id).filter((id) => id !== 'cc-overview' && id !== 'cc-attention');
    for (const id of order) {
      if (sections[id]) main.appendChild(sections[id]);
    }
    qa(':scope > .panel', shell).forEach((panel) => {
      if (!panel.id) {
        panel.classList.add('cc-section-card');
        panel.hidden = true;
        main.appendChild(panel);
      }
    });

    shell.innerHTML = '';
    layout.appendChild(main);
    shell.appendChild(layout);

    if (!q('#cc-toast')) {
      const t = document.createElement('div');
      t.id = 'cc-toast';
      t.className = 'cc-toast';
      shell.appendChild(t);
    }

    function showSection(id) {
      qa('.cc-section-card', main).forEach((el) => { el.hidden = el.id !== id; });
      qa('[data-cc-nav]', layout).forEach((a) => { a.classList.toggle('active', a.getAttribute('data-cc-nav') === id); });
      try { history.replaceState(null, '', '#' + id); } catch { }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    layout.addEventListener('click', (e) => {
      const a = e.target.closest('[data-cc-nav]');
      if (!a) return;
      e.preventDefault();
      showSection(a.getAttribute('data-cc-nav'));
    });

    q('#cc-refresh', main).onclick = () => window.adminDash();
    q('#cc-sidebar-refresh', layout).onclick = () => window.adminDash();

    const hash = (location.hash || '').replace(/^#/, '');
    showSection(hash && q('#' + hash, main) ? hash : 'cc-overview');

    await loadAttention(attention);
    await loadSystemPanels(main);
    rebindMovedForms(main);
  }

  async function loadAttention(attentionEl) {
    try {
      const health = await api('/admin/health');
      const att = health.attention || {};
      const tiles = [
        ['Assignments', att.pending_assignments, 'cc-assignments'],
        ['Support tickets', att.open_tickets, 'cc-support'],
        ['Gigs', att.pending_gigs, 'cc-moderation'],
        ['Employers', att.pending_employers, 'cc-moderation'],
        ['Instructors', att.pending_instructors, 'cc-moderation'],
        ['Scholarships', att.pending_scholarships, 'cc-tools'],
        ['Safety reports', att.open_reports, 'cc-tools'],
        ['Memberships', att.pending_memberships, 'cc-moderation'],
      ];
      const total = tiles.reduce((a, t) => a + (Number(t[1]) || 0), 0);
      const host = q('#cc-attention-tiles', attentionEl);
      host.innerHTML = tiles.map((t) =>
        `<button type="button" class="cc-tile ${t[1] ? 'warn' : ''}" data-jump="${t[2]}"><b>${fmt(t[1])}</b><span>${esc(t[0])}</span></button>`
      ).join('');
      host.querySelectorAll('[data-jump]').forEach((btn) => {
        btn.onclick = () => {
          const link = q(`[data-cc-nav="${btn.getAttribute('data-jump')}"]`);
          if (link) link.click();
        };
      });
      attentionEl.hidden = false;
      const head = q('.cc-section-head h2', attentionEl);
      if (head && !q('.cc-pill', head)) {
        const pill = document.createElement('span');
        pill.className = 'cc-pill ' + (total ? 'warn' : 'ok');
        pill.textContent = total ? total + ' open' : 'All clear';
        head.appendChild(pill);
      }
      if (health.checks) {
        const ov = q('#cc-overview');
        if (ov && !q('#cc-health-checks', ov)) {
          const box = document.createElement('div');
          box.id = 'cc-health-checks';
          box.className = 'cc-health-list';
          box.innerHTML = '<h3>System health</h3><ul>' + health.checks.map((c) =>
            `<li class="${c.ok ? 'ok' : 'bad'}"><span>${c.ok ? '✓' : '!'}</span> ${esc(c.label)}${c.ok ? '' : c.fix ? ` <small>${esc(c.fix)}</small>` : ''}</li>`
          ).join('') + '</ul>';
          ov.appendChild(box);
        }
      }
    } catch (e) {
      console.warn('attention load failed', e);
    }
  }

  async function loadSystemPanels(main) {
    if (!q('#cc-tools', main)) {
      const tools = document.createElement('section');
      tools.id = 'cc-tools';
      tools.className = 'cc-section-card';
      tools.hidden = true;
      let ann = { message: '', level: 'info', active: false };
      try { ann = await api('/admin/announcement'); } catch { }
      tools.innerHTML = `
        <div class="cc-section-head"><h2>Owner tools</h2><p>Site-wide announcement and your admin password.</p></div>
        <div class="cc-split">
          <form id="cc-ann-form" class="cc-form-card">
            <h3>Site announcement</h3>
            <label>Message<textarea name="message" rows="3" maxlength="280">${esc(ann.message || '')}</textarea></label>
            <label>Level<select name="level">
              <option value="info"${ann.level === 'info' ? ' selected' : ''}>Info</option>
              <option value="warn"${ann.level === 'warn' ? ' selected' : ''}>Warning</option>
              <option value="urgent"${ann.level === 'urgent' ? ' selected' : ''}>Urgent</option>
            </select></label>
            <label class="cc-check"><input type="checkbox" name="active"${ann.active ? ' checked' : ''}> Show banner on site</label>
            <button class="course-open" type="submit">Save announcement</button>
          </form>
          <form id="cc-pw-form" class="cc-form-card">
            <h3>Change my password</h3>
            <label>Current password<input type="password" name="current_password" required autocomplete="current-password"></label>
            <label>New password (10+ chars)<input type="password" name="new_password" required minlength="10" autocomplete="new-password"></label>
            <button class="course-open" type="submit">Update password</button>
            <p class="muted">Other devices will be signed out.</p>
          </form>
        </div>`;
      main.appendChild(tools);
      q('#cc-ann-form', tools).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
          await api('/admin/announcement', 'PUT', { message: f.get('message'), level: f.get('level'), active: f.get('active') === 'on' });
          toast(f.get('active') === 'on' ? 'Announcement published.' : 'Announcement hidden.');
        } catch (ex) { toast(ex.message, true); }
      };
      q('#cc-pw-form', tools).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
          await api('/account/password', 'POST', { current_password: f.get('current_password'), new_password: f.get('new_password') });
          e.target.reset();
          toast('Password updated. Other devices were signed out.');
        } catch (ex) { toast(ex.message, true); }
      };
    }

    if (!q('#cc-deleted', main)) {
      const sec = document.createElement('section');
      sec.id = 'cc-deleted';
      sec.className = 'cc-section-card';
      sec.hidden = true;
      let deleted = [];
      try { deleted = await api('/admin/deleted-users'); } catch { deleted = []; }
      sec.innerHTML = `<div class="cc-section-head"><h2>Closed accounts</h2>
        <p>Learners can close their account. Records stay until you permanently purge them.</p></div>
        ${deleted.length ? `<div class="cc-table-wrap"><table class="cc-table">
          <thead><tr><th>ID</th><th>Closed</th><th>Reason</th><th></th></tr></thead>
          <tbody>${deleted.map((u) => `<tr>
            <td>${u.id}</td><td>${esc(u.deleted_at || '')}</td><td>${esc(u.deletion_reason || '—')}</td>
            <td class="cc-row-actions">
              <button type="button" class="nav-btn" data-restore="${u.id}">Restore</button>
              <button type="button" class="nav-btn danger" data-purge="${u.id}">Purge</button>
            </td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No closed accounts.</p>'}`;
      main.appendChild(sec);
      sec.querySelectorAll('[data-restore]').forEach((btn) => {
        btn.onclick = async () => {
          const email = prompt('Email to restore this account to:');
          if (!email) return;
          try {
            await api('/admin/users/' + btn.dataset.restore + '/restore', 'POST', { email });
            toast('Account restored.');
            window.adminDash();
          } catch (e) { toast(e.message, true); }
        };
      });
      sec.querySelectorAll('[data-purge]').forEach((btn) => {
        btn.onclick = async () => {
          if (!confirm('Permanently delete this user and their learning records?')) return;
          try {
            await api('/admin/users/' + btn.dataset.purge + '/purge', 'DELETE', {});
            toast('User purged.');
            window.adminDash();
          } catch (e) { toast(e.message, true); }
        };
      });
    }

    
    if (!q('#cc-revenue', main)) {
      const sec = document.createElement('section');
      sec.id = 'cc-revenue';
      sec.className = 'cc-section-card';
      sec.hidden = true;
      sec.innerHTML = '<div class="cc-section-head"><h2>Revenue</h2><p>Successful payments. All sales are final — no refunds.</p></div><div id="cc-revenue-body">Loading…</div>';
      main.appendChild(sec);
      (async () => {
        try {
          const r = await api('/admin/revenue');
          const el = q('#cc-revenue-body', sec);
          el.innerHTML = `<div class="cc-metric-grid">
            <article class="cc-metric"><span>Today</span><strong>KSh ${fmt(r.today.kes)}</strong><small>${fmt(r.today.n)} payments</small></article>
            <article class="cc-metric"><span>This month</span><strong>KSh ${fmt(r.month.kes)}</strong><small>${fmt(r.month.n)} payments</small></article>
            <article class="cc-metric"><span>All time</span><strong>KSh ${fmt(r.total.kes)}</strong><small>${fmt(r.total.n)} payments</small></article>
            <article class="cc-metric"><span>Pending</span><strong>KSh ${fmt(r.pending.kes)}</strong><small>${fmt(r.pending.n)} open</small></article>
          </div>
          <p class="muted" style="margin-top:12px">${esc(r.policy||'')}</p>
          <p style="margin-top:12px"><a class="course-open" href="/api/admin/revenue.csv">Download CSV export</a>
          <a class="course-open" style="margin-left:8px" href="/api/admin/backup/download">Download database backup</a></p>
          <div class="cc-table-wrap" style="margin-top:14px"><table class="cc-table"><thead><tr><th>Ref</th><th>Amount</th><th>Status</th><th>Email</th><th>Course</th></tr></thead>
          <tbody>${(r.recent||[]).map(p=>`<tr><td>${esc(p.ref)}</td><td>KSh ${fmt(p.amount_kes)}</td><td>${esc(p.status)}</td><td>${esc(p.email)}</td><td>${esc(p.course)}</td></tr>`).join('')}</tbody></table></div>`;
        } catch (e) {
          q('#cc-revenue-body', sec).textContent = e.message;
        }
      })();
    }

    if (!q('#cc-dbpay', main)) {
      const sec = document.createElement('section');
      sec.id = 'cc-dbpay';
      sec.className = 'cc-section-card';
      sec.hidden = true;
      let providers = null;
      try { providers = await api('/admin/payment-providers'); } catch { providers = null; }
      const mpesaOk = !!(providers && providers.mpesa && providers.mpesa.configured);
      const paystackOk = !!(providers && providers.paystack && providers.paystack.configured);
      sec.innerHTML = `<div class="cc-section-head"><h2>Database & payments</h2>
        <p>Provider status and database backup. Use a persistent disk on Render so data survives redeploys.</p></div>
        <div class="cc-metric-grid">
          <article class="cc-metric"><span>M-Pesa STK</span><strong class="${mpesaOk ? 'ok' : 'bad'}">${mpesaOk ? 'Ready' : 'Off'}</strong></article>
          <article class="cc-metric"><span>Paystack</span><strong class="${paystackOk ? 'ok' : 'bad'}">${paystackOk ? 'Ready' : 'Off'}</strong></article>
        </div>
        <div class="cc-form-card" style="margin-top:16px">
          <h3>Database backup</h3>
          <p class="muted">Writes a snapshot on the server. Copy it off-site regularly.</p>
          <button type="button" class="course-open" id="cc-backup-btn">Run backup now</button>
          <p id="cc-backup-msg" class="muted" role="status"></p>
        </div>
        <div class="cc-form-card" style="margin-top:16px">
          <h3>Persistent disk (Render)</h3>
          <ol class="cc-steps">
            <li>Render dashboard → your Web Service → <b>Disks</b></li>
            <li>Add disk, mount path <code>/var/data</code>, size 1 GB+</li>
            <li>Set env <code>DB_FILE=/var/data/skillora.db</code></li>
            <li>Redeploy</li>
          </ol>
          <p class="muted">Disks require a paid Render plan. On free tier, data may reset when the service redeploys.</p>
        </div>`;
      main.appendChild(sec);
      q('#cc-backup-btn', sec).onclick = async () => {
        const msg = q('#cc-backup-msg', sec);
        try {
          const r = await api('/admin/backup', 'POST', {});
          msg.textContent = r.message + (r.path ? ' Path: ' + r.path : '');
          toast('Backup completed.');
        } catch (e) {
          msg.textContent = e.message;
          toast(e.message, true);
        }
      };
    }
  }

  function rebindMovedForms(root) {
    qa('form[data-course-edit]', root).forEach((form) => {
      if (form.dataset.ccBound) return;
      form.dataset.ccBound = '1';
      form.onsubmit = async (e) => {
        e.preventDefault();
        const id = form.getAttribute('data-course-edit');
        const f = new FormData(form);
        try {
          await api('/admin/courses/' + id, 'PUT', {
            title: f.get('title'),
            slug: f.get('slug'),
            summary: f.get('summary'),
            price_kes: Number(f.get('price_kes')),
            published: f.get('published') === 'on' ? 1 : 0,
          });
          toast('Course saved.');
        } catch (ex) { toast(ex.message, true); }
      };
    });
  }

  const baseAdminDash = window.adminDash;
  window.adminDash = async function () {
    if (typeof baseAdminDash === 'function') await baseAdminDash.apply(this, arguments);
    try { await reorganize(); } catch (e) { console.error('Control Center layout failed:', e); }
  };

  const prevHeader = window.header;
  if (typeof prevHeader === 'function') {
    window.header = function () {
      prevHeader.apply(this, arguments);
      if (me && me.role === 'admin') {
        const nav = q('#nav');
        if (nav && !q('#nav-admin')) {
          const b = document.createElement('button');
          b.className = 'nav-btn nav-owner';
          b.id = 'nav-admin';
          b.textContent = 'Control Center';
          b.onclick = () => window.openControlCenter();
          nav.insertBefore(b, nav.firstChild);
        } else if (q('#nav-admin')) {
          q('#nav-admin').onclick = () => window.openControlCenter();
        }
      }
    };
  }

  showAnnouncement();
})();
