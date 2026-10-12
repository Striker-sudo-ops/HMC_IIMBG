// ============================================================
// EVENTS MODULE — Firestore CRUD for Events collection
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const EVENTS_COL = 'campus_events';

// ── Get all events ────────────────────────────────────────
export async function getAllCampusEvents() {
  const snap = await getDocs(query(collection(db, EVENTS_COL), orderBy('startDate', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Get single event ──────────────────────────────────────
export async function getCampusEvent(eventId) {
  const snap = await getDoc(doc(db, EVENTS_COL, eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── Create event ──────────────────────────────────────────
export async function createCampusEvent(data) {
  const ref = await addDoc(collection(db, EVENTS_COL), {
    ...data,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

// ── Update event ──────────────────────────────────────────
export async function updateCampusEvent(eventId, data) {
  await updateDoc(doc(db, EVENTS_COL, eventId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ── Delete event ──────────────────────────────────────────
export async function deleteCampusEvent(eventId) {
  await deleteDoc(doc(db, EVENTS_COL, eventId));
}

// ── Permission Templates ──────────────────────────────────
export async function getPermissionTemplates() {
  const snap = await getDocs(collection(db, 'event_permission_templates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function savePermissionTemplate(name, permissions) {
  const existing = await getDocs(
    query(collection(db, 'event_permission_templates'), where('name', '==', name))
  );
  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, { name, permissions, updatedAt: serverTimestamp() });
    return existing.docs[0].id;
  }
  const ref = await addDoc(collection(db, 'event_permission_templates'), {
    name, permissions, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function deletePermissionTemplate(templateId) {
  await deleteDoc(doc(db, 'event_permission_templates', templateId));
}

// ── Registrations ─────────────────────────────────────────
export async function getEventRegistrations(eventId) {
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, 'registrations'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function registerForEvent(eventId, userData) {
  await addDoc(collection(db, EVENTS_COL, eventId, 'registrations'), {
    ...userData,
    status: 'registered',
    registeredAt: serverTimestamp()
  });
}

// ── Equipment Requests ────────────────────────────────────
export async function getEquipmentRequests(eventId) {
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, 'equipment_requests'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addEquipmentRequest(eventId, data) {
  return await addDoc(collection(db, EVENTS_COL, eventId, 'equipment_requests'), {
    ...data,
    status: 'pending',
    requestedAt: serverTimestamp()
  });
}

export async function updateEquipmentRequest(eventId, reqId, data) {
  await updateDoc(doc(db, EVENTS_COL, eventId, 'equipment_requests', reqId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ── Gate / Meal Passes ────────────────────────────────────
export async function getEventPasses(eventId, type = 'gate') {
  const col = type === 'meal' ? 'meal_passes' : 'gate_passes';
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPass(eventId, type, data) {
  const col = type === 'meal' ? 'meal_passes' : 'gate_passes';
  return await addDoc(collection(db, EVENTS_COL, eventId, col), {
    ...data,
    used: false,
    createdAt: serverTimestamp()
  });
}

export async function markPassUsed(eventId, type, passId) {
  const col = type === 'meal' ? 'meal_passes' : 'gate_passes';
  await updateDoc(doc(db, EVENTS_COL, eventId, col, passId), {
    used: true,
    usedAt: serverTimestamp()
  });
}

// ── Stall Bookings ────────────────────────────────────────
export async function getStallBookings(eventId) {
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, 'stall_bookings'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function bookStall(eventId, data) {
  return await addDoc(collection(db, EVENTS_COL, eventId, 'stall_bookings'), {
    ...data,
    status: 'pending',
    bookedAt: serverTimestamp()
  });
}

export async function updateStallBooking(eventId, bookingId, data) {
  await updateDoc(doc(db, EVENTS_COL, eventId, 'stall_bookings', bookingId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ── Accommodation ─────────────────────────────────────────
export async function getAccommodationRequests(eventId) {
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, 'accommodation'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addAccommodationRequest(eventId, data) {
  return await addDoc(collection(db, EVENTS_COL, eventId, 'accommodation'), {
    ...data,
    status: 'pending',
    requestedAt: serverTimestamp()
  });
}

export async function updateAccommodation(eventId, reqId, data) {
  await updateDoc(doc(db, EVENTS_COL, eventId, 'accommodation', reqId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ── External Requests ─────────────────────────────────────
export async function getExternalRequests(eventId) {
  const snap = await getDocs(collection(db, EVENTS_COL, eventId, 'external_requests'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function submitExternalRequest(eventId, data) {
  const trackingId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
  const ref = await addDoc(collection(db, EVENTS_COL, eventId, 'external_requests'), {
    ...data,
    trackingId,
    status: 'pending',
    submittedAt: serverTimestamp()
  });
  return { id: ref.id, trackingId };
}

export async function updateExternalRequest(eventId, reqId, data) {
  await updateDoc(doc(db, EVENTS_COL, eventId, 'external_requests', reqId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function sendExternalRequestMessage(eventId, reqId, msgData) {
  return await addDoc(collection(db, EVENTS_COL, eventId, 'external_requests', reqId, 'messages'), {
    ...msgData,
    createdAt: serverTimestamp()
  });
}

export async function getExternalRequestMessages(eventId, reqId) {
  const snap = await getDocs(query(collection(db, EVENTS_COL, eventId, 'external_requests', reqId, 'messages'), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Helpers ───────────────────────────────────────────────
export function eventStatusBadge(status) {
  const map = {
    draft:    { label: 'Draft',    cls: 'badge-muted' },
    pending:  { label: 'Pending Approval', cls: 'badge-warning' },
    approved: { label: 'Approved', cls: 'badge-info' },
    live:     { label: 'Live',     cls: 'badge-success' },
    concluded:{ label: 'Concluded',cls: 'badge-muted' },
    cancelled:{ label: 'Cancelled',cls: 'badge-danger' }
  };
  return map[status] || { label: status, cls: 'badge-muted' };
}

export function eventTypeColor(type) {
  const map = {
    cultural: '#A78BFA', sports: '#34D399', academic: '#60A5FA',
    hostel: '#F59E0B', technical: '#F87171', festival: '#FB923C', other: '#94A3B8'
  };
  return map[type] || '#94A3B8';
}

export function formatEventDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
