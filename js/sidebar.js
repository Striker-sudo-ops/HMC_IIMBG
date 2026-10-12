// ============================================================
// SHARED SIDEBAR COMPONENT — injected into every page
// ============================================================

export function renderSidebar(activePage = '') {
  // Apply initial collapse state immediately to avoid layout flashes
  if (localStorage.getItem('sidebar_hidden') === 'true') {
    document.body.classList.add('sidebar-hidden');
  }

  // Inject collapse styles if not already present
  if (!document.getElementById('sidebar-collapse-styles')) {
    const style = document.createElement('style');
    style.id = 'sidebar-collapse-styles';
    style.innerHTML = `
      body.sidebar-hidden .sidebar {
        transform: translateX(-100%);
      }
      body.sidebar-hidden .main-content {
        margin-left: 0 !important;
      }
      body.sidebar-hidden .page-header,
      body.sidebar-hidden .page-body {
        padding-left: 80px !important;
        transition: padding-left var(--transition-fast);
      }
      .desktop-sidebar-show-btn {
        position: fixed;
        top: 22px;
        left: 24px;
        z-index: 999;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        color: var(--text-normal);
        border-radius: var(--radius-md);
        width: 38px;
        height: 38px;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        transition: var(--transition-fast);
        box-shadow: var(--shadow-sm);
      }
      .desktop-sidebar-show-btn:hover {
        background: var(--border-subtle);
        transform: scale(1.05);
      }
      body.sidebar-hidden .desktop-sidebar-show-btn {
        display: flex !important;
      }
      
      /* Globally fix mobile nav toggle display on desktop to prevent duplicate burger icons */
      .mobile-nav-toggle {
        display: none !important;
      }
      
      @media (max-width: 768px) {
        body.sidebar-hidden .desktop-sidebar-show-btn {
          display: none !important;
        }
        .mobile-nav-toggle {
          display: flex !important;
          position: fixed !important;
          top: var(--sp-4) !important;
          left: var(--sp-4) !important;
          z-index: 9999 !important;
          background: var(--bg-elevated) !important;
          border: 1px solid var(--border-normal) !important;
          border-radius: var(--radius-md) !important;
          padding: 8px !important;
          cursor: pointer !important;
          color: var(--text-primary) !important;
          box-shadow: var(--shadow-md) !important;
          align-items: center !important;
          justify-content: center !important;
          width: 38px !important;
          height: 38px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Ensure show button exists on body
  setTimeout(() => {
    if (!document.getElementById('desktop-sidebar-show-btn')) {
      const showBtn = document.createElement('button');
      showBtn.id = 'desktop-sidebar-show-btn';
      showBtn.className = 'desktop-sidebar-show-btn';
      showBtn.title = 'Show Sidebar';
      showBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
      showBtn.onclick = () => {
        document.body.classList.remove('sidebar-hidden');
        localStorage.setItem('sidebar_hidden', 'false');
      };
      document.body.appendChild(showBtn);
    }
  }, 100);

  // Global window toggle function for brand button
  window.toggleSidebarHide = function() {
    document.body.classList.add('sidebar-hidden');
    localStorage.setItem('sidebar_hidden', 'true');
  };

  return `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand" style="display:flex; flex-direction:column; gap:var(--sp-3); align-items:stretch; padding:var(--sp-4) var(--sp-5)">
      <div style="display:flex; align-items:center; gap:var(--sp-3)">
        <img src="/assets/hmc-logo.jpg" alt="HMC Logo"
          style="width:40px;height:40px;object-fit:contain;border-radius:50%;border:2px solid var(--border-normal);background:#ffffff;padding:2px;mix-blend-mode:normal;flex-shrink:0"
          onerror="this.src='/assets/hmc-logo.png';this.onerror=function(){this.outerHTML='<div class=\\'sidebar-brand-logo\\'>HMC</div>'}">
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-name" style="white-space:nowrap;font-size:0.95rem;font-weight:800">HMC Portal</span>
          <span class="sidebar-brand-sub" style="white-space:nowrap;font-size:0.75rem">IIM Bodhgaya</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:var(--sp-2); border-top:1px solid var(--border-subtle); padding-top:var(--sp-3); margin-top:4px">
        <span style="font-size:0.75rem; color:var(--text-muted)">Preferences</span>
        <div style="display:flex; gap:6px; margin-left:auto">
          <button class="theme-toggle" id="sidebar-theme-toggle" title="Toggle Light/Dark" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);background:transparent;color:var(--text-normal);cursor:pointer"></button>
          <button class="theme-toggle" id="sidebar-collapse-toggle" onclick="toggleSidebarHide()" title="Hide Sidebar" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);background:transparent;color:var(--text-normal);cursor:pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-label">Main</div>
        <a href="/dashboard.html" class="nav-item" data-page="dashboard.html">
          ${icon('grid')}
          <span>Dashboard</span>
        </a>
        <a href="/profile.html" class="nav-item" data-page="profile.html">
          ${icon('user')}
          <span>My Profile</span>
        </a>
        <a href="/chat.html" class="nav-item hmc-only hidden" data-page="chat.html">
          ${icon('message-circle')}
          <span>Messages</span>
          <span class="nav-badge hidden" id="nav-msg-badge">0</span>
        </a>
        <a href="/tasks.html" class="nav-item hmc-only hidden" data-page="tasks.html">
          ${icon('check-square')}
          <span>Tasks</span>
          <span class="nav-badge hidden" id="nav-task-badge">0</span>
        </a>
        <a href="/calendar.html" class="nav-item non-worker-only" data-page="calendar.html">
          ${icon('calendar')}
          <span>Calendar</span>
        </a>
        <a href="/notices.html" class="nav-item" data-page="notices.html">
          ${icon('bell')}
          <span>Notice Board</span>
        </a>
        <a href="/complaints.html" class="nav-item non-worker-only" data-page="complaints.html">
          ${icon('alert-circle')}
          <span>Complaints & Feedback</span>
        </a>
        <a href="/committee.html" class="nav-item non-worker-only" data-page="committee.html">
          ${icon('users')}
          <span>HMC Committee</span>
        </a>
      </div>

      <div class="nav-section student-menu-section mess-only dept-member-only hidden">
        <div class="nav-section-label">Mess Operations</div>
        <a href="/menu.html" class="nav-item student-menu-link" data-page="menu.html">
          ${icon('menu-book')}
          <span>Mess Menu</span>
        </a>
        <a href="/food-testing.html" class="nav-item hmc-only hidden" data-page="food-testing.html">
          ${icon('food-testing')}
          <span>Food Quality Testing</span>
        </a>
        <a href="/admin/mess-settings.html" class="nav-item mess-head-only hidden" data-page="mess-settings.html">
          ${icon('settings')}
          <span>Mess Settings</span>
        </a>
      </div>

      <div class="nav-section hostel-only dept-member-only hidden">
        <div class="nav-section-label">Hostel & Infrastructure</div>
        <a href="/admin/manage-hostels.html" class="nav-item hostel-only hidden" data-page="manage-hostels.html">
          ${icon('home')}
          <span>Manage Hostels</span>
        </a>
        <a href="/water-tds.html" class="nav-item hostel-only hidden" data-page="water-tds.html">
          ${icon('water')}
          <span>Water TDS Logs</span>
        </a>
        <a href="/hygiene-clean.html" class="nav-item hostel-only hidden" data-page="hygiene-clean.html">
          ${icon('food-testing')}
          <span>Cleanliness & Hygiene</span>
        </a>
        <a href="/electricity.html" class="nav-item hostel-only hidden" data-page="electricity.html">
          ${icon('zap')}
          <span>Electricity Logs</span>
        </a>
        <a href="/admin/hostel-settings.html" class="nav-item hostel-head-only hidden" data-page="hostel-settings.html">
          ${icon('settings')}
          <span>Hostel Settings</span>
        </a>
      </div>

      <div class="nav-section student-laundry-section laundry-nav-section">
        <div class="nav-section-label">Laundry</div>
        <!-- Standard track laundry link for normal students and other HMC members -->
        <a href="/laundry.html" class="nav-item normal-laundry-link" data-page="laundry.html">
          ${icon('shirt')}
          <span>Laundry</span>
        </a>
        <!-- MY LAUNDRY to track own laundry for Admin and Laundry Head/Staff -->
        <a href="/laundry.html?view=personal" class="nav-item my-laundry-link laundry-personal-only hidden" data-page="laundry-personal">
          ${icon('shirt')}
          <span>My Laundry</span>
        </a>
        <a href="/admin/laundry-settings.html" class="nav-item laundry-head-only hidden" data-page="laundry-settings.html">
          ${icon('settings')}
          <span>Laundry Settings</span>
        </a>
      </div>

      <div class="nav-section events-only dept-member-only hidden">
        <div class="nav-section-label">Events & Fests</div>
        <a href="/events/events-portal.html" class="nav-item" data-page="events-portal.html">
          ${icon('calendar')}
          <span>Campus Events</span>
        </a>
        <a href="/admin/event-settings.html" class="nav-item events-head-only hidden" data-page="event-settings.html">
          ${icon('settings')}
          <span>Event Settings</span>
        </a>
      </div>

      <div class="nav-section admin-section-wrap hidden">
        <div class="nav-section-label">Administration</div>
        <a href="/admin/departments.html" class="nav-item superadmin-only hidden" data-page="departments.html">
          ${icon('layers')}
          <span>Departments</span>
        </a>
        <a href="/admin/task-manager.html" class="nav-item head-or-admin-only hidden" data-page="task-manager.html">
          ${icon('clipboard')}
          <span>Task Manager</span>
        </a>
        <a href="/admin/logs.html" class="nav-item admin-only hidden" data-page="logs.html">
          ${icon('file-text')}
          <span>Logs</span>
        </a>
        <a href="/admin/batch-management.html" class="nav-item admin-only hidden" data-page="batch-management.html">
          ${icon('archive')}
          <span>Batch Management</span>
        </a>
      </div>
    </nav>

    <div class="sidebar-user">
      <div id="sidebar-user-avatar"></div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="sidebar-user-name">Loading…</div>
        <div class="sidebar-user-id"  id="sidebar-user-id"></div>
      </div>
      <button class="btn-icon" onclick="import('/js/auth.js').then(m=>m.logoutUser())" title="Logout">
        ${icon('log-out')}
      </button>
    </div>
  </aside>

  <!-- Mobile toggle -->
  <button class="mobile-nav-toggle" id="mobile-toggle" onclick="toggleMobileSidebar()">
    ${icon('menu')}
  </button>
  `;
}

function icon(name) {
  const icons = {
    'alert-circle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    'bell':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'grid':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'user':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'user-plus':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    'message-circle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    'check-square': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    'calendar':     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'menu-book':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    'food-testing': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11 2 2 4-4"/></svg>`,
    'users':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'git-branch':   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
    'clipboard':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    'tag':          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    'edit':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    'settings':     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    'log-out':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    'menu':         `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    'water':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>`,
    'trash-2':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    'zap':          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    'archive':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    'shirt':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 6.05V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3.05L3.62 3.46a1 1 0 0 0-1.37.37l-1 1.73a1 1 0 0 0 .37 1.37L5 8.76V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.76l3.38-1.93a1 1 0 0 0 .37-1.37l-1-1.73a1 1 0 0 0-1.37-.37z"/><path d="M12 2v4"/></svg>`,
    'star':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'package':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    'map-pin':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'shield':       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    'home':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'qr-code':      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="16" y="16" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/></svg>`,
    'dollar-sign':  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    'layers':       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    'send':         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    'check-circle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'x-circle':     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    'file-text':    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    'globe':        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  };
  return icons[name] || '';
}

window.toggleMobileSidebar = function() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  sb.classList.toggle('open');

  let backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-sidebar-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:none;transition:opacity 0.2s ease;';
    backdrop.onclick = () => {
      sb.classList.remove('open');
      backdrop.style.display = 'none';
    };
    // Append inside .layout so it shares the same stacking context as the sidebar
    // This fixes the issue where backdrop (body z-index 9999) covered the sidebar (layout z-index 1)
    const layout = document.querySelector('.layout') || document.body;
    layout.appendChild(backdrop);
  }

  if (sb.classList.contains('open')) {
    backdrop.style.display = 'block';
  } else {
    backdrop.style.display = 'none';
  }
};

// Auto close sidebar when clicking links on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    const link = e.target.closest('.sidebar-nav a, .nav-item');
    if (link) {
      const sb = document.getElementById('sidebar');
      const backdrop = document.getElementById('mobile-sidebar-backdrop');
      if (sb) sb.classList.remove('open');
      if (backdrop) backdrop.style.display = 'none';
    }
  }
});

// Initialize theme toggle in sidebar
export function initSidebarTheme() {
  import('/js/theme.js').then(({ getTheme, toggleTheme }) => {
    const btn = document.getElementById('sidebar-theme-toggle');
    if (!btn) return;
    const sunIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const update = (t) => { btn.innerHTML = t === 'dark' ? sunIcon : moonIcon; btn.title = t === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'; };
    update(getTheme());
    btn.onclick = () => { const next = toggleTheme(); update(next); };
  });
}
