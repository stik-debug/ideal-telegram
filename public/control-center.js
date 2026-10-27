/* Skillora Owner Control Center enhancements + site announcement banner.
   Loaded after app.js (shares its globals: me, api, esc, setView, auth, header). Server enforces admin-only access. */
(function () {
  'use strict';
  const q = (s, r = document) => r.querySelector(s);
  const isAdminPath = () => location.pathname === '/admin' || location.pathname === '/control-center';
  const toast = (msg, bad) => { const el = q('#cc-toast'); if (!el) return; el.textContent = msg; el.className = 'cc-toast' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => { el.textContent = ''; el.className = 'cc-toast'; }, 5000); };
  const fmt = (n) => Number(n || 0).toLocaleString();

  // ---------- Public announcement banner ----------
  async function showAnnouncement() {
    try {
      const a = await fetch('/api/announcement', { credentials: 'same-origin' }).then(r => r.json());
      if (!a || !a.message) return;
      let dismissed = ''; try { dismissed = sessionStorage.getItem('skillora.announcement') || ''; } catch { }
      if (dismissed === String(a.id)) return;
      const bar = document.createElement('div');
      bar.className = 'announce announce-' + esc(a.level); bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>${esc(a.message)}</span><button type="button" aria-label="Dismiss announcement">×</button>`;
      bar.querySelector('button').onclick = () => { bar.remove(); try { sessionStorage.setItem('skillora.announcement', String(a.id)); } catch { } };
      document.body.insertBefore(bar, document.body.firstChild.nextSibling || document.body.firstChild);
      const skip = q('.skip-link'); if (skip) document.body.insertBefore(skip, document.body.firstChild);
    } catch { /* banner is optional */ }
  }

  // ---------- Entry points ----------
  window.openControlCenter = async function () {
    if (!me) {
      auth();
      const card = q('.auth-card');
      if (card) card.insertAdjacentHTML('afterbegin', '<p class="cc-signin-note" role="status"><b>Owner sign-in.</b> Sign in with your owner/admin account to open the Control Center.</p>');
      return;
    }
    if (me.role !== 'admin') {
      setView('<section class="view-shell"><div class="view-head"><h1>Control Center</h1><p>This account (' + esc(me.email) + ') does not have owner/admin access. Sign out and sign in with the owner account, or ask an existing admin to grant access.</p></div></section>');
      return;
    }
    return window.adminDash();
  };

  // ---------- Control Center enhancement ----------
  const baseAdminDash = window.adminDash;
  window.adminDash = async function () {
    await baseAdminDash.apply(this, arguments);
    try { await enhance(); } catch (e) { console.error('Control Center enhancement failed:', e); }
  };

  const SECTIONS = [
    ['Payment oversight', 'cc-payments', 'Payments'], ['Course completion health', 'cc-health', 'Completion'], ['Recent audit activity', 'cc-audit', 'Audit log'],
    ['Course management', 'cc-courses', 'Courses'], ['Students & enrolments', 'cc-students', 'Students'], ['Assignment reviews', 'cc-assignments', 'Assignments'],
    ['Support tickets', 'cc-support', 'Support'], ['Certificates issued', 'cc-certs', 'Certificates']
  ];

  async function enhance() {
    const shell = q('#main .view-shell'); if (!shell || shell.dataset.ccReady) return; shell.dataset.ccReady = '1';
    // Give existing panels stable ids so the jump bar and attention tiles can link to them.
    shell.querySelectorAll('.panel > h2').forEach(h => { const s = SECTIONS.find(x => h.textContent.trim().startsWith(x[0])); if (s) h.parentElement.id = s[1]; });
    const head = q('.view-head', shell);
    const [health, ann, users, cohorts, outcomes, courseList] = await Promise.all([api('/admin/health'), api('/admin/announcement'), api('/admin/users'), api('/admin/cohorts').catch(() => []), api('/admin/outcomes').catch(() => []), api('/courses').catch(() => [])]);

    const att = health.attention, tiles = [
      ['Assignments to review', att.pending_assignments, 'cc-assignments'], ['Open support tickets', att.open_tickets, 'cc-support'],
      ['Gigs awaiting approval', att.pending_gigs, 'cc-moderation'], ['Employers to verify', att.pending_employers, 'cc-moderation'],
      ['Instructor applications', att.pending_instructors, 'cc-moderation'], ['Scholarship requests', att.pending_scholarships, 'cc-tools'],
      ['Open safety reports', att.open_reports, 'cc-tools'], ['Membership requests', att.pending_memberships, 'cc-moderation']
    ];
    const total = tiles.reduce((a, t) => a + t[1], 0);
    const jump = `<nav class="cc-jump" aria-label="Control Center sections"><a href="#cc-top">Overview</a><a href="#cc-tools">Owner tools</a><a href="#cc-community">Community</a>${SECTIONS.map(s => `<a href="#${s[1]}">${s[2]}</a>`).join('')}</nav>`;
    const attention = `<section class="panel cc-attention" id="cc-top" aria-labelledby="cc-att-h"><div class="cc-row"><h2 id="cc-att-h">Needs your attention <span class="cc-pill ${total ? 'warn' : 'ok'}">${total ? total + ' item' + (total === 1 ? '' : 's') : 'All clear'}</span></h2><button type="button" class="course-open" id="cc-refresh">↻ Refresh</button></div><div class="cc-tiles">${tiles.map(t => `<a class="cc-tile ${t[1] ? 'has' : ''}" href="#${t[2]}"><b>${fmt(t[1])}</b><span>${esc(t[0])}</span></a>`).join('')}</div><p class="muted">New learners: ${fmt(health.signups_7d)} in the last 7 days · ${fmt(health.signups_30d)} in the last 30 days.</p><div id="cc-toast" class="cc-toast" role="status" aria-live="polite"></div></section>`;

    const exportsHtml = ['students', 'payments', 'enrolments', 'certificates', 'audit'].map(k => `<a class="course-open cc-btn" href="/api/admin/export/${k}" download>⇩ ${k[0].toUpperCase() + k.slice(1)} CSV</a>`).join('');
    const checks = health.checks.map(c => `<li class="${c.ok ? 'ok' : 'warn'}"><span aria-hidden="true">${c.ok ? '✓' : '!'}</span><div><b>${esc(c.label)}</b> — ${c.ok ? 'OK' : 'Needs attention'}${c.ok ? '' : `<small>${esc(c.fix)}</small>`}</div></li>`).join('');
    const a = ann || { message: '', level: 'info', active: 0 };
    const tools = `<section class="panel cc-tools" id="cc-tools" aria-labelledby="cc-tools-h"><h2 id="cc-tools-h">Owner tools</h2>
      <div class="cc-grid">
        <article class="cc-card"><h3>Site announcement</h3><p class="muted">Shows a dismissible banner at the top of every page. Keep it short.</p>
          <form id="cc-ann-form"><label>Message<textarea name="message" maxlength="300" rows="2">${esc(a.message)}</textarea></label>
          <label>Style<select name="level"><option value="info" ${a.level === 'info' ? 'selected' : ''}>Information</option><option value="success" ${a.level === 'success' ? 'selected' : ''}>Good news</option><option value="warning" ${a.level === 'warning' ? 'selected' : ''}>Important notice</option></select></label>
          <label class="cc-check"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}> Show banner to visitors</label>
          <button class="btn-solid" type="submit">Save announcement</button></form></article>
        <article class="cc-card"><h3>Export data (CSV)</h3><p class="muted">Download records for bookkeeping or backup. Exports are logged in the audit trail.</p><div class="cc-btns">${exportsHtml}</div></article>
        <article class="cc-card"><h3>System health</h3><ul class="cc-checks">${checks}</ul><p class="muted">Server uptime ${fmt(health.uptime_minutes)} min · Node ${esc(health.node)} · Database ${health.database_ok ? 'responding' : 'NOT responding'} (${health.database_mb} MB${health.in_memory ? ', in-memory' : ''}).</p></article>
      </div>
<article class="cc-card" style="margin-top:16px;max-width:420px"><h3>Change my password</h3><p class="muted">Signs you out on every other device.</p><form id="cc-pw-form"><label>Current password<input type="password" name="current_password" autocomplete="current-password" required></label><label>New password (10+ characters)<input type="password" name="new_password" autocomplete="new-password" minlength="10" required></label><button class="btn-solid" type="submit">Update password</button></form></article>
            <h3 style="margin-top:22px">Users & admin access</h3><p class="muted">Grant or remove owner/admin access. You cannot remove your own access, and one admin must always remain.</p>
      <label class="cc-search">Search users<input id="cc-user-search" type="search" placeholder="Name or email…" autocomplete="off"></label>
      <div class="cc-table-wrap"><table class="cc-table"><caption class="sr-only">All user accounts</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Courses</th><th scope="col">Lessons</th><th scope="col">Role</th></tr></thead><tbody id="cc-users"></tbody></table></div><p id="cc-user-count" class="muted" role="status"></p></section>`;

    const pendingOutcomes = outcomes.filter(o => o.status === 'pending').length;
    const community = `<section class="panel" id="cc-community" aria-labelledby="cc-comm-h"><h2 id="cc-comm-h">Community & outcomes${pendingOutcomes ? ` <span class="cc-pill warn">${pendingOutcomes} to verify</span>` : ''}</h2>
      <div class="cc-grid">
        <article class="cc-card"><h3>New cohort</h3><form id="cc-cohort-form"><label>Title<input name="title" required minlength="3" maxlength="120"></label><label>Course (optional)<select name="course_id"><option value="">Any topic</option>${(Array.isArray(courseList) ? courseList : []).map(c => `<option value="${Number(c.id)}">${esc(c.title)}</option>`).join('')}</select></label><label>Starts<input type="date" name="starts_on" required></label><label>Ends<input type="date" name="ends_on" required></label><label>Capacity<input type="number" name="capacity" min="2" max="500" value="30" required></label><label>Description<textarea name="description" maxlength="1000" rows="2"></textarea></label><button class="btn-solid" type="submit">Create cohort</button><p id="cc-cohort-msg" class="cc-toast" role="status"></p></form></article>
        <article class="cc-card"><h3>New mentor clinic</h3><form id="cc-clinic-form"><label>Title<input name="title" required maxlength="160"></label><label>Mentor name<input name="mentor_name" required maxlength="120"></label><label>Date and time<input type="datetime-local" name="starts_at" required></label><label>Seats<input type="number" name="capacity" min="1" max="500" value="20" required></label><label>What will be covered<textarea name="description" required maxlength="2000" rows="2"></textarea></label><button class="btn-solid" type="submit">Publish clinic</button><p id="cc-clinic-msg" class="cc-toast" role="status"></p></form></article>
      </div>
      <h3 style="margin-top:22px">Cohorts</h3>${cohorts.length ? `<div class="cc-table-wrap"><table class="cc-table"><caption class="sr-only">Cohorts</caption><thead><tr><th scope="col">Title</th><th scope="col">Dates</th><th scope="col">Joined</th><th scope="col">Status</th></tr></thead><tbody>${cohorts.map(h => `<tr><td>${esc(h.title)}</td><td>${esc(h.starts_on)} → ${esc(h.ends_on)}</td><td>${h.members}/${h.capacity}</td><td><label class="sr-only" for="co-${h.id}">Status of ${esc(h.title)}</label><select id="co-${h.id}" data-cohort="${h.id}"><option ${h.status === 'open' ? 'selected' : ''} value="open">Open</option><option ${h.status === 'closed' ? 'selected' : ''} value="closed">Closed</option><option ${h.status === 'cancelled' ? 'selected' : ''} value="cancelled">Cancelled</option></select></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No cohorts yet.</p>'}
      <h3 style="margin-top:22px">Learner outcome reports</h3><p class="muted">Only reports you verify are counted in the public results on the home page. Check the evidence link where one is given.</p>${outcomes.length ? `<div class="cc-table-wrap"><table class="cc-table"><caption class="sr-only">Outcome reports</caption><thead><tr><th scope="col">Learner</th><th scope="col">Outcome</th><th scope="col">Details</th><th scope="col">Status</th></tr></thead><tbody>${outcomes.map(o => `<tr><td>${esc(o.name)}<br><small>${esc(o.email)}</small></td><td>${esc(o.label)}</td><td>${esc(o.note)}${o.evidence_url ? `<br><a href="${esc(o.evidence_url)}" target="_blank" rel="noopener noreferrer">evidence</a>` : ''}</td><td>${o.status === 'pending' ? `<button class="course-open" data-oc="${o.id}" data-st="verified">Verify</button> <button class="course-open" data-oc="${o.id}" data-st="rejected">Reject</button>` : esc(o.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No reports yet.</p>'}</section>`;
    head.insertAdjacentHTML('afterend', jump + attention + tools + community);
    // Anchor for the moderation block the base view appends (marketplace moderation / membership requests).
    const mod = [...shell.querySelectorAll('.panel')].find(p => /moderation|membership/i.test((p.querySelector('h2,h3') || {}).textContent || '')); if (mod) mod.id = 'cc-moderation';

    // Users table with search + role changes
    const render = () => {
      const term = (q('#cc-user-search').value || '').trim().toLowerCase();
      const list = users.filter(u => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      q('#cc-users').innerHTML = list.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.courses}</td><td>${u.lessons_done}</td><td><label class="sr-only" for="role-${u.id}">Role for ${esc(u.email)}</label><select id="role-${u.id}" data-role-user="${u.id}" ${u.id === me.id ? 'disabled title="You cannot change your own role"' : ''}><option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin / owner</option></select></td></tr>`).join('') || '<tr><td colspan="5">No matching users.</td></tr>';
      q('#cc-user-count').textContent = `Showing ${list.length} of ${users.length} account${users.length === 1 ? '' : 's'}.`;
    };
    render(); q('#cc-user-search').addEventListener('input', render);
    q('#cc-users').addEventListener('change', async e => {
      const sel = e.target.closest('[data-role-user]'); if (!sel) return; const u = users.find(x => x.id === Number(sel.dataset.roleUser));
      if (sel.value === 'admin' && !confirm(`Give ${u.email} full owner/admin access to learner data and payments?`)) { sel.value = u.role; return; }
      try { await api(`/admin/users/${u.id}/role`, 'PUT', { role: sel.value }); u.role = sel.value; toast(`${u.email} is now ${sel.value === 'admin' ? 'an admin' : 'a student'}.`); }
      catch (ex) { sel.value = u.role; toast(ex.message, true); }
    });
    q('#cc-ann-form').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      try { await api('/admin/announcement', 'PUT', { message: f.get('message'), level: f.get('level'), active: f.get('active') === 'on' }); toast(f.get('active') === 'on' ? 'Announcement published.' : 'Announcement hidden.'); }
      catch (ex) { toast(ex.message, true); }
    };
    q('#cc-pw-form').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await api('/account/password', 'POST', { current_password: f.get('current_password'), new_password: f.get('new_password') }); e.target.reset(); toast('Password updated. Other devices were signed out.'); } catch (ex) { toast(ex.message, true); } };
    q('#cc-cohort-form').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.capacity = Number(f.capacity); f.course_id = f.course_id ? Number(f.course_id) : null; try { await api('/admin/cohorts', 'POST', f); window.adminDash(); } catch (ex) { const m = q('#cc-cohort-msg'); m.textContent = ex.message; m.className = 'cc-toast bad'; } };
    q('#cc-clinic-form').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.capacity = Number(f.capacity); f.starts_at = new Date(f.starts_at).toISOString(); const m = q('#cc-clinic-msg'); try { await api('/admin/mentor-clinics', 'POST', f); e.target.reset(); m.textContent = 'Clinic published. Learners can book it now.'; m.className = 'cc-toast'; } catch (ex) { m.textContent = ex.message; m.className = 'cc-toast bad'; } };
    shell.querySelectorAll('[data-cohort]').forEach(sel => sel.addEventListener('change', async () => { try { await api('/admin/cohorts/' + sel.dataset.cohort, 'PUT', { status: sel.value }); toast('Cohort updated.'); } catch (ex) { toast(ex.message, true); } }));
    shell.querySelectorAll('[data-oc]').forEach(b => b.addEventListener('click', async () => { try { await api('/admin/outcomes/' + b.dataset.oc, 'PUT', { status: b.dataset.st }); window.adminDash(); } catch (ex) { toast(ex.message, true); } }));
    q('#cc-refresh').onclick = () => window.adminDash();

    // Student/enrolment search on the existing panel
    const sp = q('#cc-students');
    if (sp) {
      const rows = [...sp.querySelectorAll(':scope > p')];
      sp.querySelector('h2').insertAdjacentHTML('afterend', '<label class="cc-search">Filter students and enrolments<input id="cc-stu-search" type="search" placeholder="Name, email or course…" autocomplete="off"></label>');
      q('#cc-stu-search').addEventListener('input', e => { const t = e.target.value.trim().toLowerCase(); rows.forEach(r => { r.hidden = !!t && !r.textContent.toLowerCase().includes(t); }); });
    }
    // Back to top + keep jump links smooth without breaking hash routing
    shell.querySelectorAll('a[href^="#cc-"]').forEach(l => l.addEventListener('click', e => { const t = q(l.getAttribute('href')); if (t) { e.preventDefault(); e.stopPropagation(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }, true));
    window.scrollTo({ top: 0 });
    const h1 = q('h1', shell); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  // Keyboard shortcut for the owner: Alt+Shift+A
  document.addEventListener('keydown', e => { if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'a' && typeof me !== 'undefined' && me && me.role === 'admin') { e.preventDefault(); window.adminDash(); } });
  showAnnouncement();
})();
