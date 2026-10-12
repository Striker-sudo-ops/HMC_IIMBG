// ============================================================
// COMMITTEE — HMC Committee Members (public page data)
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Get all committee members ─────────────────────────────
export async function getCommitteeMembers() {
  const q = query(collection(db, 'committee'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Add a committee member (admin) ────────────────────────
export async function addCommitteeMember({
  name, designation, contactNumber, email,
  associatedProfessor, profilePicUrl = null,
  batch = '', order = 999, isCurrent = true
}) {
  const ref = await addDoc(collection(db, 'committee'), {
    name, designation, contactNumber, email,
    associatedProfessor, profilePicUrl,
    batch, order, isCurrent,
    createdAt: serverTimestamp()
  });
  return { id: ref.id, name, designation, contactNumber, email, associatedProfessor, isCurrent };
}

// ── Update committee member ───────────────────────────────
export async function updateCommitteeMember(id, updates) {
  await updateDoc(doc(db, 'committee', id), updates);
}

// ── Remove committee member ───────────────────────────────
export async function removeCommitteeMember(id) {
  await deleteDoc(doc(db, 'committee', id));
}

// ── Mark as past/current ──────────────────────────────────
export async function setMemberCurrentStatus(id, isCurrent) {
  await updateDoc(doc(db, 'committee', id), { isCurrent });
}
