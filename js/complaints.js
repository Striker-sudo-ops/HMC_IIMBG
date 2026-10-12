// ============================================================
// COMPLAINTS & FEEDBACK MODULE
// ============================================================

import { db, storage } from './firebase-config.js';
import {
  collection, doc, getDocs, addDoc, updateDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getCachedUser } from './auth.js';

// Lodge a complaint or feedback
export async function createComplaint({ type, category, description, imageFile = null }) {
  const user = getCachedUser();
  if (!user) throw new Error("User not authenticated.");

  // Save base complaint details first (without image)
  const complaintData = {
    type,
    category: category.toLowerCase().trim(),
    description,
    status: type === 'feedback' ? 'resolved' : 'unresolved', // Feedback defaults to resolved
    userUid: user.uid,
    userName: user.name || 'Anonymous',
    userRoll: user.uniqueId || user.roll || '—',
    userEmail: user.email,
    dateStr: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    createdAt: serverTimestamp()
  };

  const refDoc = await addDoc(collection(db, 'complaints'), complaintData);
  const complaintId = refDoc.id;

  // Attempt image upload separately — failure here does NOT cancel the complaint
  if (imageFile) {
    try {
      const storageRef = ref(storage, `complaint-images/${complaintId}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'complaints', complaintId), { imageUrl });
      complaintData.imageUrl = imageUrl;
    } catch (imgErr) {
      console.warn('[Complaints] Image upload failed (Storage may not be enabled):', imgErr.message);
      // Complaint is already saved — image is just omitted
    }
  }

  return { id: complaintId, ...complaintData };
}

// Retrieve all complaints
export async function getAllComplaints() {
  const snap = await getDocs(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Resolve a complaint
export async function resolveComplaint(complaintId) {
  await updateDoc(doc(db, 'complaints', complaintId), {
    status: 'resolved',
    resolvedAt: serverTimestamp()
  });
}
