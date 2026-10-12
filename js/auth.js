// ============================================================
// AUTH — Login / Logout / Role Guard / Current User
// ============================================================

export const ALLOWED_DOMAIN = 'iimbg.ac.in';

export function validateEmailDomain(email) {
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Only @${ALLOWED_DOMAIN} email addresses are accepted.`);
  }
}

import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc,
  collection, query, where, getDocs, limit, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast, showLoading, hideLoading } from './utils.js';
import { logAction } from './audit-logger.js';

// ── Current user cache ────────────────────────────────────
let _currentUser = null;

export function getCachedUser() { return _currentUser; }
export function getCurrentUser() { return _currentUser; }

export async function fetchUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return { uid, ...snap.data() };

    // Fallback: check pending_users (e.g. if newly verified and not yet migrated)
    const pendingSnap = await getDoc(doc(db, 'pending_users', uid));
    if (pendingSnap.exists()) {
      const data = pendingSnap.data();
      await setDoc(doc(db, 'users', uid), data).catch(() => {});
      await deleteDoc(doc(db, 'pending_users', uid)).catch(() => {});
      return { uid, ...data };
    }
  } catch (err) {
    console.warn('fetchUserProfile error:', err.message);
  }
  return null;
}

// ── Auth state listener ───────────────────────────────────
export function initAuthGuard(options = {}) {
  showLoading();
  const {
    requireLogin = true,
    requireRoles = [],   // e.g. ['admin'] to restrict page
    onReady = null
  } = options;

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      hideLoading();
      if (requireLogin) {
        window.location.href = '/index.html';
      }
      return;
    }

    const profile = await fetchUserProfile(firebaseUser.uid);
    if (!profile) {
      await signOut(auth);
      window.location.href = '/index.html';
      return;
    }

    _currentUser = profile;

    // Check if account access has been revoked (Past HMC member only, not students)
    if (profile.role !== 'student' && (profile.role === 'past_member' || profile.accessRevoked === true || (profile.isCurrent === false && profile.role !== 'laundry_worker'))) {
      hideLoading();
      showToast('Your HMC member access has been revoked.', 'error');
      await signOut(auth);
      window.location.href = '/index.html';
      return;
    }

    // Self-repair: if a student account was incorrectly marked accessRevoked, clear it
    if (profile.role === 'student' && profile.accessRevoked === true) {
      updateDoc(doc(db, 'users', profile.uid), { accessRevoked: false }).catch(() => {});
      profile.accessRevoked = false;
    }

    // ── Graduation Year Auto-Freeze ──────────────────────────────
    // Non-admin, non-student HMC member accounts are frozen from June of their graduation year onwards.
    // Students are NOT subject to this freeze (they have separate isCurrent logic).
    if (profile.role !== 'admin' && profile.role !== 'student') {
      let gradYear = profile.graduationYear || null;
      // Fallback: parse from email local-part (e.g. name.s2027@iimbg.ac.in)
      if (!gradYear && profile.email) {
        const m = profile.email.split('@')[0].match(/(20\d{2})/);
        if (m) gradYear = parseInt(m[1]);
      }
      if (gradYear) {
        const now = new Date();
        const currentYear  = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-indexed
        if (currentYear > gradYear || (currentYear === gradYear && currentMonth >= 6)) {
          // Auto-migrate committee member to Past Member status upon graduation
          if (profile.role === 'member') {
            updateDoc(doc(db, 'users', profile.uid), { role: 'past_member', isCurrent: false, accessRevoked: true }).catch(() => {});
          } else if (!profile.accessRevoked) {
            updateDoc(doc(db, 'users', profile.uid), { accessRevoked: true }).catch(() => {});
          }
          hideLoading();
          showToast(`Your batch (Class of ${gradYear}) access has been frozen as of June ${gradYear}. Contact the admin for queries.`, 'error');
          await signOut(auth);
          window.location.href = '/index.html';
          return;
        }
      }
    }


    // Realtime unread messages listener for sidebar & dashboard
    onSnapshot(doc(db, 'users', profile.uid), (snap) => {
      if (!snap.exists()) return;
      const count = snap.data().unreadMessages || 0;
      const badge = document.getElementById('nav-msg-badge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.toggle('hidden', count <= 0);
      }
      const statMsg = document.getElementById('stat-messages');
      if (statMsg) {
        statMsg.textContent = count;
      }
    });

    // Background self-healing check to repair meta/setup if missing
    checkAdminExists().catch(() => {});

    // Sync hostel name & room no from hostel_students database automatically
    syncHostelRoomForUser(profile).catch(() => {});

    // Smart role-based redirect guard
    const rawPath = window.location.pathname.toLowerCase();
    const cleanPath = rawPath.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
    const isStudentPage = cleanPath.includes('student-dashboard');
    const isAdminPage   = cleanPath.startsWith('admin') || cleanPath.includes('/admin');

    // Strict Freeze / Revocation check
    if (profile.accessRevoked === true) {
      await signOut(auth);
      alert("Your account access has been frozen or revoked by the administrator. Please contact the admin.");
      window.location.href = '/index.html';
      return;
    }

    // Strict Laundry Worker redirect guard
    if (profile.role === 'laundry_worker') {
      const isAllowedForWorker = cleanPath.includes('laundry') || cleanPath.includes('profile');
      if (!isAllowedForWorker) {
        window.location.href = '/laundry.html';
        return;
      }
    }

    const isChiefWarden = profile.role === 'chief_warden';
    const isHostelWarden = profile.role === 'hostel_warden';
    const isHostelSupervisor = profile.role === 'hostel_supervisor';
    const isHostelAuthority = isChiefWarden || isHostelWarden || isHostelSupervisor;

    // Wardens (Chief Warden & Hostel Warden) do not have task pages
    if ((isChiefWarden || isHostelWarden) && cleanPath.includes('task')) {
      window.location.href = '/dashboard.html';
      return;
    }

    const allowedStudentPages = [
      'student-dashboard', 'dashboard', 'profile', 'committee',
      'complaints', 'menu', 'laundry', 'notices', 'calendar'
    ];
    const isAllowedForStudent = allowedStudentPages.some(page => cleanPath.endsWith(page) || cleanPath === page || cleanPath.includes(page));

    if (profile.role === 'student' && !isAllowedForStudent) {
      // Redirect students trying to access restricted HMC/Admin pages back to dashboard
      if (!isStudentPage) {
        window.location.href = '/student-dashboard.html';
      }
      return;
    }
    if (profile.role !== 'student' && profile.role !== 'laundry_worker' && isStudentPage) {
      // HMC members and authorities don't belong on student dashboard
      window.location.href = '/dashboard.html';
      return;
    }

    // Role check for restricted pages
    if (requireRoles.length && !requireRoles.includes(profile.role)) {
      // Allow hostel authorities to access manage-hostels
      if (cleanPath.includes('manage-hostels') && isHostelAuthority) {
        // Allowed
      } else if (profile.role === 'student') {
        if (!isStudentPage) window.location.href = '/student-dashboard.html';
        return;
      } else {
        if (!cleanPath.includes('dashboard')) window.location.href = '/dashboard.html';
        return;
      }
    }

    // Log login event once per browser session (sessionStorage resets on tab/window close)
    const sessionKey = 'hmc_session_uid';
    const existingSessionUid = sessionStorage.getItem(sessionKey);
    if (!existingSessionUid || existingSessionUid !== profile.uid) {
      sessionStorage.setItem(sessionKey, profile.uid);
      // Only log for HMC members (non-students)
      if (profile.role !== 'student') {
        logAction({
          action: 'Member Login',
          department: profile.category || 'Administration',
          details: `${profile.name || 'HMC Member'} (${profile.uniqueId || '—'}) logged into the HMC Portal. Role: ${profile.role}. Category: ${profile.category || 'N/A'}.`,
          user: profile
        }).catch(() => {});
      }
    }

    hideLoading();
    if (onReady) onReady(profile);
  });
}

// ── Auto-sync Hostel Name & Room No from hostel_students ─────────
export async function syncHostelRoomForUser(user) {
  if (!user || !user.email) return user;
  try {
    const userEmailClean = user.email.toLowerCase().trim();
    const emailVariations = [
      user.email.trim(),
      user.email.toLowerCase().trim(),
      user.email.toUpperCase().trim()
    ];
    const uniqueVariations = [...new Set(emailVariations)].filter(Boolean);

    const snap = await getDocs(query(
      collection(db, 'hostel_students'),
      where('email', 'in', uniqueVariations)
    ));
    let matchedData = null;
    if (!snap.empty) {
      matchedData = snap.docs[0].data();
    } else {
      const allSnap = await getDocs(collection(db, 'hostel_students'));
      allSnap.forEach(d => {
        const data = d.data();
        if (data.email && data.email.toLowerCase().trim() === userEmailClean) {
          matchedData = data;
        }
      });
    }

    if (matchedData) {
      const hName = matchedData.hostelName || '—';
      const rawRoom = matchedData.roomNo || '—';
      const slot = matchedData.slot ? ` (${matchedData.slot})` : '';
      const rNo = rawRoom !== '—' && matchedData.slot && !rawRoom.includes(matchedData.slot) ? `${rawRoom}${slot}` : rawRoom;
      if (user.hostelName !== hName || user.roomNo !== rNo || user.slot !== (matchedData.slot || null)) {
        await updateDoc(doc(db, 'users', user.uid), {
          hostelName: hName,
          roomNo: rNo,
          roomSlot: matchedData.slot || null,
          hostelId: matchedData.hostelId || null
        });
        user.hostelName = hName;
        user.roomNo = rNo;
        user.roomSlot = matchedData.slot || null;
        user.hostelId = matchedData.hostelId || null;
      }
    } else {
      // Clear if currently allocated but no student record found
      if ((user.hostelName && user.hostelName !== 'Not Allocated' && user.hostelName !== '—') || (user.roomNo && user.roomNo !== '—')) {
        await updateDoc(doc(db, 'users', user.uid), {
          hostelName: 'Not Allocated',
          roomNo: '—',
          hostelId: null
        });
        user.hostelName = 'Not Allocated';
        user.roomNo = '—';
        user.hostelId = null;
      }
    }
  } catch (err) {
    console.warn('Could not sync hostel room:', err.message);
  }
  return user;
}

// ── Login ─────────────────────────────────────────────────
// rememberMe: true → browserLocalPersistence (survives browser close)
//             false → browserSessionPersistence (cleared when tab/browser closes)
export async function loginUser(email, password, rememberMe = false) {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchUserProfile(cred.user.uid);
  return profile;
}

// ── Logout ────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  window.location.href = '/index.html';
}

// ── Populate sidebar user info ────────────────────────────
export function populateSidebarUser(user) {
  const nameEl = document.getElementById('sidebar-user-name');
  const idEl   = document.getElementById('sidebar-user-id');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl)   nameEl.textContent = user.name || 'Member';
  if (idEl)     idEl.textContent   = user.uniqueId || '';
  if (avatarEl) {
    if (user.profilePicUrl) {
      avatarEl.innerHTML = `<img src="${user.profilePicUrl}" class="avatar avatar-sm" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border-normal)" alt="${user.name || 'User'}">`;
    } else {
      const parts = (user.name || 'U').split(' ');
      const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : parts[0][0];
      avatarEl.innerHTML = `<div class="avatar-placeholder avatar-sm" style="width:36px;height:36px;font-size:12px">${initials.toUpperCase()}</div>`;
    }
  }

  // Show/hide nav items based on role
  if (user.role === 'laundry_worker') {
    // Workers see only Laundry & My Profile
    document.querySelectorAll('.student-laundry-section, .laundry-only').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.hmc-only, .mess-only, .hostel-only, .events-only, .admin-section-wrap, .student-menu-section, .student-events-section, .non-worker-only').forEach(el => el.classList.add('hidden'));
    const dashNav = document.querySelector('.nav-item[data-page="dashboard.html"]');
    if (dashNav) dashNav.style.display = 'none';
    const complaintsNav = document.querySelector('.nav-item[data-page="complaints.html"]');
    if (complaintsNav) complaintsNav.style.display = 'none';
    const committeeNav = document.querySelector('.nav-item[data-page="committee.html"]');
    if (committeeNav) committeeNav.style.display = 'none';
  } else if (user.role && user.role !== 'student') {
    document.querySelectorAll('.hmc-only').forEach(el => el.classList.remove('hidden'));
  } else if (user.role === 'student') {
    // For regular students, reveal Mess Menu and Laundry
    document.querySelectorAll('.student-menu-section, .student-laundry-section').forEach(el => el.classList.remove('hidden'));
    const dashNav = document.querySelector('.nav-item[data-page="dashboard.html"]');
    if (dashNav) dashNav.href = '/student-dashboard.html';
  }
  // Shared lowercase helpers — safe even if field is undefined
  const userTitleLower  = (user.title    || '').toLowerCase().trim();
  const userPostLower   = (user.post     || '').toLowerCase().trim();
  const userCatLower    = (user.category || '').toLowerCase().trim();

  const isPureAdmin = user.role === 'admin';
  const isChiefWarden = user.role === 'chief_warden';
  const isHostelWarden = user.role === 'hostel_warden';
  const isHostelSupervisor = user.role === 'hostel_supervisor';
  const isHostelAuthority = isChiefWarden || isHostelWarden || isHostelSupervisor;

  // Category visibility check calculations (for non-admin department members/heads)
  const isMessCategory    = !isPureAdmin && user.role !== 'student' && userCatLower === 'mess';
  const isHostelCategory  = !isPureAdmin && user.role !== 'student' && (userCatLower === 'hostel' || isHostelAuthority);
  const isLaundryCategory = !isPureAdmin && user.role !== 'student' && ['laundry', 'laundary'].includes(userCatLower);
  const isEventCategory   = !isPureAdmin && user.role !== 'student' && ['events', 'event'].includes(userCatLower);

  // Mess Head specific visibility
  const isMessHead = !isPureAdmin && (
                       userTitleLower.includes('mess head') || 
                       userPostLower.includes('mess head') || 
                       userPostLower.includes('mess committee head') || 
                       userPostLower.includes('mess coordinator') ||
                       (userCatLower === 'mess' && (user.post === 'Head' || user.role === 'subadmin'))
                     );

  // Hostel Head specific visibility
  const isHostelHead = !isPureAdmin && (
                        isHostelAuthority ||
                        userTitleLower.includes('hostel head') || 
                        userPostLower.includes('hostel head') || 
                        userPostLower.includes('hostel committee head') || 
                        (userCatLower === 'hostel' && (user.post === 'Head' || user.role === 'subadmin'))
                      );

  // Laundry Head specific visibility
  const isLaundryHead = !isPureAdmin && (
                         userTitleLower.includes('laundry head') || 
                         userTitleLower.includes('laundary head') || 
                         userPostLower.includes('laundry head') || 
                         userPostLower.includes('laundary head') || 
                         userPostLower.includes('laundry committee head') || 
                         userPostLower.includes('laundary committee head') || 
                         (['laundry', 'laundary'].includes(userCatLower) && (user.post === 'Head' || user.role === 'subadmin'))
                       );

  // Event Head / POC specific visibility
  const isEventHead = !isPureAdmin && (
                        userTitleLower.includes('event head') ||
                        userTitleLower.includes('events head') ||
                        userPostLower.includes('event head') ||
                        userPostLower.includes('events head') ||
                        (isEventCategory && ['head', 'poc', 'coordinator', 'lead'].includes(userPostLower))
                      );

  const isAnyHead = isMessHead || isHostelHead || isLaundryHead || isEventHead;

  // Set Visibility
  if (isMessCategory || isMessHead) {
    document.querySelectorAll('.mess-only').forEach(el => el.classList.remove('hidden'));
  }

  if (isHostelCategory || isHostelHead || isHostelAuthority) {
    document.querySelectorAll('.hostel-only').forEach(el => el.classList.remove('hidden'));
  }

  const hasLaundryManageAccess = isPureAdmin || isLaundryCategory || isLaundryHead;

  if (hasLaundryManageAccess) {
    document.querySelectorAll('.normal-laundry-link').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.my-laundry-link').forEach(el => el.classList.remove('hidden'));
  } else {
    document.querySelectorAll('.normal-laundry-link').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.my-laundry-link').forEach(el => el.classList.add('hidden'));
  }

  if (isEventCategory || isEventHead) {
    document.querySelectorAll('.events-only').forEach(el => el.classList.remove('hidden'));
  }

  if (isMessHead) {
    document.querySelectorAll('.mess-head-only').forEach(el => el.classList.remove('hidden'));
  }
  if (isHostelHead) {
    document.querySelectorAll('.hostel-head-only').forEach(el => el.classList.remove('hidden'));
  }
  if (isLaundryHead) {
    document.querySelectorAll('.laundry-head-only').forEach(el => el.classList.remove('hidden'));
  }
  if (isEventHead) {
    document.querySelectorAll('.events-head-only').forEach(el => el.classList.remove('hidden'));
  }

  // Wardens (Chief Warden & Hostel Warden) do NOT have task page/controls
  if (isChiefWarden || isHostelWarden) {
    document.querySelectorAll('a[data-page="tasks.html"], #nav-task-badge').forEach(el => el.style.display = 'none');
  }

  if (isPureAdmin || isAnyHead) {
    document.querySelectorAll('.admin-section-wrap').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.head-or-admin-only').forEach(el => el.classList.remove('hidden'));
  }

  if (isPureAdmin) {
    document.querySelectorAll('.superadmin-only').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }



  // Highlight active nav item (supports both cleanUrls and .html)
  const currentPageRaw = window.location.pathname.split('/').pop() || 'dashboard.html';
  const currentPageClean = currentPageRaw.replace(/\.html$/, '');
  const isPersonalView = window.location.search.includes('view=personal');
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    const itemPage = (item.dataset.page || '').replace(/\.html$/, '');
    if (isPersonalView && itemPage === 'laundry-personal') {
      item.classList.add('active');
    } else if (!isPersonalView && itemPage === currentPageClean) {
      item.classList.add('active');
    } else if (user.role === 'student' && itemPage === 'student-dashboard' && (currentPageClean === 'dashboard' || currentPageClean === 'student-dashboard')) {
      item.classList.add('active');
    }
  });
}

// ── First-run admin seed ──────────────────────────────────
// Checks if an admin account has been created.
// The meta/setup document is publicly readable (no auth needed).
// The users collection fallback is only attempted when authenticated.
export async function checkAdminExists() {
  // Primary check: meta/setup document (publicly readable — no auth required)
  try {
    const snap = await getDoc(doc(db, 'meta', 'setup'));
    if (snap.exists() && snap.data().adminCreated) return true;
  } catch (err) {
    console.warn('checkAdminExists meta read error:', err.message);
  }

  // Fallback: query users collection for any admin — only when authenticated
  // (Firestore rules require login for /users reads)
  if (auth.currentUser) {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        limit(1)
      );
      const snap2 = await getDocs(q);
      if (!snap2.empty) {
        // Repair the meta document if it somehow got lost
        await setDoc(doc(db, 'meta', 'setup'), {
          adminCreated: true,
          adminUid: snap2.docs[0].id
        }, { merge: true }).catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn('checkAdminExists users query error:', err.message);
    }
  }

  return false;
}

export async function seedAdmin(name, email, password, graduationYear = 2027, post = 'Admin') {
  validateEmailDomain(email);

  const { createUserWithEmailAndPassword } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
  );

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;
  const yr   = String(graduationYear).slice(-2);
  const uniqueId = `#HMC_${yr}_001`;

  // Write profile, uniqueId index, counter, and meta setup document concurrently to prevent partial/interrupted setup
  await Promise.all([
    setDoc(doc(db, 'users', uid), {
      uniqueId,
      name,
      email,
      role: 'admin',
      graduationYear,
      post,
      profilePicUrl: null,
      supervisorId: null,
      trackRecord: { assigned: 0, completed: 0, avgRating: 0, ratings: [] },
      createdAt: serverTimestamp()
    }),
    setDoc(doc(db, 'uniqueIds', uniqueId), { uid, name }),
    setDoc(doc(db, 'counters', String(graduationYear)), { count: 1 }),
    setDoc(doc(db, 'meta', 'setup'), { adminCreated: true, adminUid: uid })
  ]);

  return { uid, uniqueId };
}

// ── Delete own account ────────────────────────────────────
// Deletes the Firestore user document and the Firebase Auth account.
// Requires the user to have signed in recently (re-authentication may
// be needed for accounts that haven't signed in in a while).
export async function deleteAccount(currentUser) {
  if (!currentUser) throw new Error('No user logged in.');

  // 1. Delete Firestore user document
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid));
  } catch (err) {
    console.warn('Could not delete Firestore user doc:', err.message);
  }

  // 2. Delete Firebase Auth account
  const { deleteUser } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
  );
  await deleteUser(auth.currentUser);

  // 3. Redirect to login
  window.location.href = '/index.html';
}
