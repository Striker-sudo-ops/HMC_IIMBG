// ============================================================
// MEMBERS — Create, Read, Update, Delete HMC Members
// ============================================================

import { auth, db, storage, firebaseConfig } from './firebase-config.js';
import { validateEmailDomain } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, serverTimestamp, runTransaction, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  createUserWithEmailAndPassword, deleteUser, getAuth, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast } from './utils.js';

// Initialize secondary Firebase app to create members without signing out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// ── Generate unique ID ────────────────────────────────────
// Format: #HMC_YY_XXX  (YY = last 2 digits of graduation year)
export async function generateUniqueId(graduationYear) {
  const yr = String(graduationYear).slice(-2);
  const counterRef = doc(db, 'counters', String(graduationYear));

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? snap.data().count : 0;
    const next = current + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    const seq = String(next).padStart(3, '0');
    return `#HMC_${yr}_${seq}`;
  });
}

// ── Create new HMC member ─────────────────────────────────
export async function createMember({
  name, email, password, post, dob, contact,
  graduationYear, supervisorId = null, role = 'member',
  profilePicFile = null, isCurrent = true
}) {
  // Validate domain
  validateEmailDomain(email);

  // 1. Create Firebase Auth user using secondary Auth instance
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid  = cred.user.uid;

  // 2. Generate unique ID
  const uniqueId = await generateUniqueId(graduationYear);

  // 3. Upload profile pic if provided
  let profilePicUrl = null;
  if (profilePicFile) {
    profilePicUrl = await uploadProfilePic(uid, profilePicFile);
  }

  // 4. Write user document (using primary db reference authenticated as the admin)
  const userData = {
    uniqueId,
    name,
    email,
    post,
    dob,
    contact,
    graduationYear: Number(graduationYear),
    supervisorId,
    role,
    profilePicUrl,
    isCurrent: isCurrent !== false,
    trackRecord: { assigned: 0, completed: 0, avgRating: 0, ratings: [] },
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', uid), userData);

  // 5. Create uniqueId index for fast lookup
  await setDoc(doc(db, 'uniqueIds', uniqueId), { uid, name });

  // 6. Sign out the newly created user from the secondary auth instance
  await signOut(secondaryAuth);

  return { uid, uniqueId, ...userData };
}

// ── Compress image file → base64 data URL (stored in Firestore) ──────────
// Bypasses Firebase Storage entirely — no CORS issues, works on localhost/IP/production.
export function compressImageToBase64(file, maxSize = 300, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        // Scale down so the longest side ≤ maxSize
        if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
        else        { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Upload profile picture ────────────────────────────────
// Kept for backward compat; now just wraps compressImageToBase64
export async function uploadProfilePic(uid, file) {
  return await compressImageToBase64(file);
}

// ── Get all members ───────────────────────────────────────────
export async function getAllMembers() {
  const q = query(collection(db, 'users'),
    where('role', 'in', ['admin', 'subadmin', 'member', 'past_member'])
  );
  const snap = await getDocs(q);
  const members = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  // Sort client-side by createdAt to avoid requiring a composite Firestore index
  return members.sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return aTime - bTime;
  });
}

// ── Get member by UID ─────────────────────────────────────
export async function getMemberByUid(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return { uid, ...snap.data() };
  return null;
}

// ── Get member by uniqueId ────────────────────────────────
export async function getMemberByUniqueId(uniqueId) {
  const snap = await getDoc(doc(db, 'uniqueIds', uniqueId));
  if (!snap.exists()) return null;
  return getMemberByUid(snap.data().uid);
}

// ── Get members under a supervisor ───────────────────────
export async function getMembersUnder(supervisorUid) {
  const q = query(collection(db, 'users'), where('supervisorId', '==', supervisorUid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Update member profile ─────────────────────────────────
export async function updateMember(uid, updates, profilePicFile = null) {
  if (profilePicFile) {
    updates.profilePicUrl = await uploadProfilePic(uid, profilePicFile);
  }
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });

  // Update uniqueId index if name changed
  if (updates.name) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const { uniqueId } = snap.data();
      if (uniqueId) await updateDoc(doc(db, 'uniqueIds', uniqueId), { name: updates.name });
    }
  }
}

// ── Update member role ────────────────────────────────────
export async function setMemberRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ── Assign member under sub-admin ─────────────────────────
export async function assignSupervisor(memberUid, supervisorUid) {
  await updateDoc(doc(db, 'users', memberUid), {
    supervisorId: supervisorUid
  });
}

// ── Delete member ─────────────────────────────────────────
export async function deleteMember(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const { uniqueId } = snap.data();

  await deleteDoc(doc(db, 'users', uid));
  if (uniqueId) await deleteDoc(doc(db, 'uniqueIds', uniqueId));
}

// ── Update track record after task completion ─────────────
export async function updateTrackRecord(uid, { completed = false, rating = null }) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const tr = snap.data().trackRecord || { assigned: 0, completed: 0, avgRating: 0, ratings: [] };

  const updates = {};
  if (completed) {
    tr.completed = (tr.completed || 0) + 1;
    updates['trackRecord.completed'] = tr.completed;
  }
  if (rating !== null && rating !== undefined) {
    const numRating = Number(rating);
    if (!isNaN(numRating) && numRating >= 1 && numRating <= 5) {
      const cleanRatings = [...(tr.ratings || []).map(r => Number(r)), numRating]
        .filter(r => !isNaN(r) && r >= 1 && r <= 5);
      const avg = cleanRatings.length ? (cleanRatings.reduce((a, b) => a + b, 0) / cleanRatings.length) : 0;
      tr.ratings = cleanRatings;
      tr.avgRating = Number(avg.toFixed(2));
      updates['trackRecord.ratings']   = tr.ratings;
      updates['trackRecord.avgRating'] = tr.avgRating;
    }
  }
  if (Object.keys(updates).length) {
    await updateDoc(doc(db, 'users', uid), updates);
  }
}

export async function incrementAssigned(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const current = (snap.data().trackRecord?.assigned || 0) + 1;
  await updateDoc(doc(db, 'users', uid), { 'trackRecord.assigned': current });
}

// ── Get all students ──────────────────────────────────────
export async function getAllStudents() {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Get all hostel authorities ────────────────────────────
export async function getAllHostelAuthorities() {
  const q = query(collection(db, 'users'), where('role', 'in', ['chief_warden', 'hostel_warden', 'hostel_supervisor']));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Create Hostel Authority (Chief Warden / Hostel Warden / Supervisor) ──
// Created by admin directly using secondary auth — no email verification needed
export async function createHostelAuthority({
  name, email, password, role, post, contact,
  assignedHostels = [], assignedHostel = '', profilePicFile = null
}) {
  validateEmailDomain(email);

  // 1. Create Firebase Auth user with secondary auth instance
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;

  // 2. Generate unique ID based on role
  const counterRef = doc(db, 'counters', role);
  const uniqueId = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? snap.data().count : 0;
    const next = current + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    const seq = String(next).padStart(2, '0');
    if (role === 'chief_warden') return `#CW_${seq}`;
    if (role === 'hostel_warden') return `#HW_${seq}`;
    if (role === 'hostel_supervisor') return `#HS_${seq}`;
    return `#HA_${seq}`;
  });

  // 3. Upload profile pic if provided
  let profilePicUrl = null;
  if (profilePicFile) {
    profilePicUrl = await uploadProfilePic(uid, profilePicFile);
  }

  // 4. Normalise assigned hostels
  let hostelsList = Array.isArray(assignedHostels) ? assignedHostels : (assignedHostel ? [assignedHostel] : []);
  if (role === 'chief_warden') {
    hostelsList = ['ALL'];
  }

  const defaultPost = role === 'chief_warden' ? 'Chief Warden' : role === 'hostel_warden' ? 'Hostel Warden' : 'Hostel Supervisor';

  const userData = {
    uniqueId,
    name,
    email,
    role, // 'chief_warden' | 'hostel_warden' | 'hostel_supervisor'
    post: post || defaultPost,
    title: post || defaultPost,
    contact: contact || '',
    category: 'hostel',
    assignedHostels: hostelsList,
    assignedHostel: assignedHostel || (hostelsList.length === 1 ? hostelsList[0] : (role === 'chief_warden' ? 'ALL' : '')),
    profilePicUrl,
    isCurrent: true,
    accessRevoked: false,
    trackRecord: { assigned: 0, completed: 0, avgRating: 0, ratings: [] },
    createdAt: serverTimestamp()
  };

  await setDoc(doc(db, 'users', uid), userData);
  await setDoc(doc(db, 'uniqueIds', uniqueId), { uid, name, role });
  await signOut(secondaryAuth);

  return { uid, uniqueId, ...userData };
}

// ── Update Hostel Authority ───────────────────────────────
export async function updateHostelAuthority(uid, updates) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
}

// ── Freeze / Unfreeze user account ─────────────────────────
export async function toggleAccountFreeze(uid, freezeState) {
  await updateDoc(doc(db, 'users', uid), {
    accessRevoked: !!freezeState
  });
}

// ── Delete student account ────────────────────────────────
export async function deleteStudentAccount(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

// ── Get members for tagging (all HMC + used in chat) ─────
export async function getMembersForTaggingList() {
  return getAllMembers();
}
