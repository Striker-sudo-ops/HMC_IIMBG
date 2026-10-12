// ============================================================
// TASKS — Create, Read, Update, Status, Doubts, Rating
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, runTransaction, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { updateTrackRecord, incrementAssigned } from './members.js';
import { logAction } from './audit-logger.js';

// ── Generate Task ID ──────────────────────────────────────
async function generateTaskId() {
  const counterRef = doc(db, 'counters', 'tasks');
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? snap.data().count : 0) + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    return `#T_${String(next).padStart(3, '0')}`;
  });
}

// ── Create a task ─────────────────────────────────────────
export async function createTask({
  category, assignedByUid, assignedByName, assignedByUniqueId,
  assignedToUid, assignedToName, assignedToUniqueId,
  description, deadline, isDaily = false
}) {
  let taskId;
  try {
    taskId = await generateTaskId();
  } catch (e) {
    console.error("generateTaskId failed, using fallback:", e);
  }
  if (!taskId || taskId === 'undefined' || taskId === '[object Object]') {
    taskId = `#T_${Math.floor(100 + Math.random() * 900)}`;
  }

  const taskData = {
    taskId,
    category,
    assignedByUid,
    assignedByName,
    assignedByUniqueId,
    assignedToUid,
    assignedToName,
    assignedToUniqueId,
    description,
    deadline,
    isDaily: !!isDaily,
    status: 'assigned',
    assignedDate: serverTimestamp(),
    completedDate: null,
    qualityRating: null,
    doubts: []
  };

  const ref = await addDoc(collection(db, 'tasks'), taskData);

  // Increment assignee track record
  await incrementAssigned(assignedToUid);

  logAction({
    action: 'Created Task',
    department: 'Administration',
    details: `Task ${taskId} assigned to ${assignedToName} (${assignedToUniqueId}) by ${assignedByName}. Category: ${category || 'General'}.`
  });

  return { id: ref.id, ...taskData };
}

// Helper to sort tasks in descending order of assignedDate (handles Timestamp and Date strings)
function sortTasksDescending(tasks) {
  return tasks.sort((a, b) => {
    let aTime = 0;
    let bTime = 0;

    if (a.assignedDate) {
      if (typeof a.assignedDate.toDate === 'function') {
        aTime = a.assignedDate.toDate().getTime();
      } else if (a.assignedDate.seconds) {
        aTime = a.assignedDate.seconds * 1000;
      } else {
        aTime = new Date(a.assignedDate).getTime() || 0;
      }
    }

    if (b.assignedDate) {
      if (typeof b.assignedDate.toDate === 'function') {
        bTime = b.assignedDate.toDate().getTime();
      } else if (b.assignedDate.seconds) {
        bTime = b.assignedDate.seconds * 1000;
      } else {
        bTime = new Date(b.assignedDate).getTime() || 0;
      }
    }

    return bTime - aTime;
  });
}

// ── Purge System Automator tasks from Firestore ───────────
export async function purgeSystemAutomatorTasks() {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    const deletePromises = [];
    snap.docs.forEach(d => {
      const data = d.data();
      const isSys = data.assignedByUid === 'SYSTEM' ||
                    data.assignedByName === 'System Automator' ||
                    data.assignedByUniqueId === 'SYSTEM' ||
                    (data.taskId && String(data.taskId).startsWith('#SYS_')) ||
                    data.type === 'mess_head_assignment';
      if (isSys) {
        deletePromises.push(deleteDoc(doc(db, 'tasks', d.id)));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[Tasks] Purged ${deletePromises.length} system automator tasks.`);
    }
  } catch (err) {
    console.warn('[Tasks] System task purge error:', err);
  }
}

function filterSystemTasks(tasks) {
  return tasks.filter(t => 
    t.assignedByUid !== 'SYSTEM' &&
    t.assignedByName !== 'System Automator' &&
    t.assignedByUniqueId !== 'SYSTEM' &&
    !(t.taskId && String(t.taskId).startsWith('#SYS_')) &&
    t.type !== 'mess_head_assignment'
  );
}

// ── Get all tasks ─────────────────────────────────────────
export async function getAllTasks() {
  purgeSystemAutomatorTasks().catch(() => {});
  const snap = await getDocs(collection(db, 'tasks'));
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortTasksDescending(filterSystemTasks(tasks));
}

// ── Get tasks assigned TO a user ──────────────────────────
export async function getTasksForUser(uid) {
  purgeSystemAutomatorTasks().catch(() => {});
  const q = query(
    collection(db, 'tasks'),
    where('assignedToUid', '==', uid)
  );
  const snap = await getDocs(q);
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortTasksDescending(filterSystemTasks(tasks));
}

// ── Get tasks assigned BY a user ──────────────────────────
export async function getTasksAssignedBy(uid) {
  purgeSystemAutomatorTasks().catch(() => {});
  const q = query(
    collection(db, 'tasks'),
    where('assignedByUid', '==', uid)
  );
  const snap = await getDocs(q);
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortTasksDescending(filterSystemTasks(tasks));
}

// ── Submit task for verification (Assignee action) ───────
export async function submitTaskForVerification(taskDocId, submissionNotes = '') {
  const taskRef = doc(db, 'tasks', taskDocId);
  const note = submissionNotes.trim() || 'Work completed, ready for verification.';
  await updateDoc(taskRef, {
    status: 'pending_verification',
    submissionNotes: note,
    submittedAt: serverTimestamp()
  });

  logAction({
    action: 'Task Marked Complete (Awaiting Verification)',
    department: 'Administration',
    details: `Task ID ${taskDocId} submitted for assigner verification. Notes: ${note}`
  });
}

// ── Verify & Complete task (Assigner/Admin action) ────────
export async function verifyAndCompleteTask(taskDocId, assignedToUid, qualityRating = null, verificationNotes = '') {
  const taskRef = doc(db, 'tasks', taskDocId);
  const snap = await getDoc(taskRef);
  const taskData = snap.exists() ? snap.data() : {};

  const updates = {
    status: 'completed',
    completedDate: serverTimestamp(),
    verifiedAt: serverTimestamp()
  };
  if (qualityRating) updates.qualityRating = qualityRating;
  if (verificationNotes) updates.verificationNotes = verificationNotes;

  await updateDoc(taskRef, updates);
  await updateTrackRecord(assignedToUid, { completed: true, rating: qualityRating });

  logAction({
    action: 'Task Verified & Completed',
    department: 'Administration',
    details: `Task ${taskData.taskId || taskDocId} verified and completed. Rating: ${qualityRating ? qualityRating + '/5' : 'None'}.`
  });

  // If this is a daily recurring task, auto-schedule next instance for tomorrow (preserving original assigner)
  if (taskData.isDaily) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await createTask({
        category: taskData.category,
        assignedByUid: taskData.assignedByUid,
        assignedByName: taskData.assignedByName,
        assignedByUniqueId: taskData.assignedByUniqueId,
        assignedToUid: taskData.assignedToUid,
        assignedToName: taskData.assignedToName,
        assignedToUniqueId: taskData.assignedToUniqueId,
        description: taskData.description,
        deadline: tomorrowStr,
        isDaily: true
      });
    } catch (e) {
      console.warn("Daily auto-reschedule error:", e);
    }
  }
}

// ── Transfer task to another member (Assigner/Admin action) ──
export async function transferTask(taskDocId, { newAssigneeUid, newAssigneeName, newAssigneeUniqueId, transferredByUid, transferredByName, reason = '' }) {
  const taskRef = doc(db, 'tasks', taskDocId);
  await updateDoc(taskRef, {
    assignedToUid: newAssigneeUid,
    assignedToName: newAssigneeName,
    assignedToUniqueId: newAssigneeUniqueId || '—',
    status: 'assigned',
    submissionNotes: null,
    transferRequested: false,
    transferredAt: serverTimestamp()
  });

  // Log transfer in doubts/history
  const note = `Task transferred to ${newAssigneeName} by ${transferredByName}.${reason ? ' Reason: ' + reason : ''}`;
  await postDoubt(taskDocId, {
    senderUid: transferredByUid,
    senderName: transferredByName,
    senderUniqueId: 'SYSTEM',
    text: note
  });

  // Increment new assignee's track record
  await incrementAssigned(newAssigneeUid);

  logAction({
    action: 'Task Transferred',
    department: 'Administration',
    details: `Task ID ${taskDocId} transferred to ${newAssigneeName} by ${transferredByName}.${reason ? ' Reason: ' + reason : ''}`
  });
}

// ── Request task transfer (Assignee action) ────────────────
export async function requestTaskTransfer(taskDocId, { senderUid, senderName, senderUniqueId, reason }) {
  const taskRef = doc(db, 'tasks', taskDocId);
  await updateDoc(taskRef, {
    transferRequested: true,
    transferReason: reason
  });

  await postDoubt(taskDocId, {
    senderUid,
    senderName,
    senderUniqueId,
    text: `Requested task transfer: ${reason}`
  });

  logAction({
    action: 'Task Transfer Requested',
    department: 'Administration',
    details: `${senderName} requested transfer for task ID ${taskDocId}. Reason: ${reason}`
  });
}

// Legacy alias for backward compatibility
export async function completeTask(taskDocId, assignedToUid) {
  return await verifyAndCompleteTask(taskDocId, assignedToUid);
}
export async function acceptTask(taskDocId) {
  return await submitTaskForVerification(taskDocId, 'Task marked as done.');
}

// ── Rate task quality ─────────────────────────────────────
export async function rateTask(taskDocId, assignedToUid, rating) {
  await updateDoc(doc(db, 'tasks', taskDocId), { qualityRating: rating });
  await updateTrackRecord(assignedToUid, { rating });
}

// ── Post a doubt ──────────────────────────────────────────
export async function postDoubt(taskDocId, { senderUid, senderName, senderUniqueId, text }) {
  const doubt = {
    id: Date.now().toString(),
    senderUid,
    senderName,
    senderUniqueId,
    text,
    timestamp: new Date().toISOString(),
    reply: null
  };
  await updateDoc(doc(db, 'tasks', taskDocId), {
    doubts: arrayUnion(doubt)
  });
  return doubt;
}

// ── Reply to a doubt (by assigner) ───────────────────────
export async function replyToDoubt(taskDocId, doubtId, replyText, replierName) {
  const taskRef = doc(db, 'tasks', taskDocId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;

  const doubts = (snap.data().doubts || []).map(d => {
    if (d.id === doubtId) {
      return { ...d, reply: { text: replyText, replierName, timestamp: new Date().toISOString() } };
    }
    return d;
  });

  await updateDoc(taskRef, { doubts });
}

// ── Delete task ───────────────────────────────────────────
export async function deleteTask(taskDocId) {
  await deleteDoc(doc(db, 'tasks', taskDocId));
}

// ── Get categories ────────────────────────────────────────
export async function getCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  if (snap.empty) return getDefaultCategories();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Default categories (seeded on first use) ──────────────
export function getDefaultCategories() {
  return [
    { id: 'maintenance',   name: 'Maintenance',      color: '#3B82F6' },
    { id: 'events',        name: 'Events & Fest',    color: '#8B5CF6' },
    { id: 'finance',       name: 'Finance',          color: '#10B981' },
    { id: 'procurement',   name: 'Procurement',      color: '#F59E0B' },
    { id: 'housekeeping',  name: 'Housekeeping',     color: '#06B6D4' },
    { id: 'mess_ops',      name: 'Mess Operations',  color: '#EF4444' },
    { id: 'general',       name: 'General',          color: '#6B7280' },
    { id: 'urgent',        name: 'Urgent',           color: '#DC2626' }
  ];
}

export async function addCategory({ name, color }) {
  const ref = await addDoc(collection(db, 'categories'), { name, color });
  return { id: ref.id, name, color };
}

export async function updateCategory(id, updates) {
  await updateDoc(doc(db, 'categories', id), updates);
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id));
}

// ── Seed default categories if none exist ─────────────────
export async function seedCategoriesIfNeeded() {
  const snap = await getDocs(collection(db, 'categories'));
  if (!snap.empty) return;
  const defaults = getDefaultCategories();
  for (const cat of defaults) {
    await addDoc(collection(db, 'categories'), { name: cat.name, color: cat.color });
  }
}
