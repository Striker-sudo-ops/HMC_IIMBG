// ============================================================
// UTILITIES & SECURITY SANITIZERS
// ============================================================

/** Escape HTML characters to prevent XSS and HTML injection */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/** Sanitize input strings by removing dangerous characters, null bytes, and inline scripts */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\0/g, '') // remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script tags
    .trim();
}

/** Securely format error messages to prevent technology disclosure & info leakage */
export function formatSecureErrorMessage(err, fallback = "An unexpected error occurred. Please try again.") {
  if (!err) return fallback;
  
  const code = err.code || '';
  const msg  = (typeof err === 'string' ? err : err.message) || '';

  // 1. Authentication errors -> generic messages to prevent user enumeration & tech leakage
  if (code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-email')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code.includes('email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in.';
  }
  if (code.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code.includes('network-request-failed') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
    return 'Connection issue. Please check your internet connection and try again.';
  }

  // 2. Domain / validation errors (custom user messages)
  if (msg.includes('@iimbg.ac.in') || msg.includes('accepted') || msg.includes('profile not found') || msg.includes('revoked')) {
    return msg;
  }

  // 3. Filter out technical keywords (Firebase, Firestore, Storage, gapi, HTTP error codes)
  if (/firebase|firestore|storage|gapi|auth\/|http|500|403|404|eval|stack|exception/i.test(msg)) {
    return fallback;
  }

  return msg || fallback;
}

/** Show a toast notification */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { 
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>', 
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', 
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>', 
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' 
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size:1.1rem;flex-shrink:0">${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Open a modal by id — works regardless of which CSS class pattern the page uses */
export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('open', 'show');
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/** Close a modal by id */
export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('hidden');
  m.classList.remove('open', 'show');
  m.style.display = 'none';
  document.body.style.overflow = '';
}

/** Format a Firestore Timestamp or Date to readable string */
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return formatDate(ts);
}

/** Generate avatar initials placeholder HTML */
export function avatarPlaceholder(name, size = 'md') {
  const parts = (name || 'User').split(' ');
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (parts[0][0] || 'U');
  const sizes = { sm: 32, md: 44, lg: 64, xl: 96, xxl: 128 };
  const px = sizes[size] || 44;
  const fontSize = px * 0.35;
  return `<div class="avatar-placeholder avatar-${size}" style="width:${px}px;height:${px}px;font-size:${fontSize}px">
    ${initials.toUpperCase()}
  </div>`;
}

/** Render avatar (img or placeholder) */
export function renderAvatar(user, size = 'md') {
  if (user?.profilePicUrl) {
    // Do NOT embed the base64 string in onerror — it causes visible text on screen.
    // Use a wrapper with a hidden fallback sibling instead.
    const sizes = { sm: 32, md: 44, lg: 64, xl: 96, xxl: 128 };
    const px = sizes[size] || 44;
    const fallback = avatarPlaceholder(user?.name || 'User', size);
    return `<span style="display:inline-flex;position:relative;width:${px}px;height:${px}px;flex-shrink:0">
      <img src="${user.profilePicUrl}" class="avatar avatar-${size}" 
           style="display:block;width:${px}px;height:${px}px;border-radius:50%;object-fit:cover;position:absolute;inset:0" 
           alt="${user?.name || 'User'}" 
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span style="display:none;width:${px}px;height:${px}px;position:absolute;inset:0">${fallback}</span>
    </span>`;
  }
  return avatarPlaceholder(user?.name || 'User', size);
}

/** Stars display HTML */
export function starsHTML(rating) {
  if (!rating) return '<span class="text-muted" style="font-size:0.8rem">Not rated</span>';
  const rounded = Math.round(rating);
  let s = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rounded;
    s += `<svg width="14" height="14" viewBox="0 0 24 24" fill="${filled ? '#fbbf24' : 'none'}" stroke="#fbbf24" stroke-width="1.5" style="display:inline;vertical-align:middle"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  return `<span style="display:inline-flex;gap:2px;align-items:center">${s}</span> <span class="text-muted text-sm">(${Number(rating).toFixed(1)})</span>`;
}

/** Parse message text for @POST and #Name / #ID tags */
export function parseMessageTags(text) {
  if (!text) return '';
  // @POST tags
  let parsed = text.replace(/@([A-Za-z0-9_\s]+)/g, (match, tag) =>
    `<span class="tag-post">${match}</span>`
  );
  // #Name or #HMC_YY_XXX tags
  parsed = parsed.replace(/#([A-Za-z0-9_]+)/g, (match, id) =>
    `<span class="tag-id">${match}</span>`
  );
  return parsed;
}

/** Debounce */
export function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/** Redirect if not logged in */
export function requireAuth(redirectTo = '/index.html') {
  // handled in auth.js
}

/** Calculate age from date string (YYYY-MM-DD) */
export function calcAge(dob) {
  if (!dob) return '—';
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** Days until deadline */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = d - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Deadline class helper */
export function deadlineClass(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days < 0)  return 'deadline-overdue';
  if (days <= 2) return 'deadline-soon';
  return '';
}

/** Loading overlay */
export function showLoading(msg = 'Loading…') {
  let el = document.getElementById('_loading_overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = '_loading_overlay';
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="spinner"></div><p style="color:var(--text-secondary);font-size:0.9rem">${msg}</p>`;
    document.body.appendChild(el);
  }
}
export function hideLoading() {
  const el = document.getElementById('_loading_overlay');
  if (el) el.remove();
}

/** Upload a file to Firebase Storage, return download URL */
export async function uploadFile(file, path) {
  const { storage } = await import('./firebase-config.js');
  const { ref, uploadBytes, getDownloadURL } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
  );
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
