// ============================================================
// AUDIT LOGGER UTILITY — Track HMC Member Changes & Auto-Purge
// ============================================================

import { db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Log an action taken by an HMC member/admin.
 * @param {Object} opts
 * @param {string} opts.action - Short title of action (e.g. "Updated Mess Settings", "Saved Mess Menu")
 * @param {string} opts.department - Department name ("Mess", "Hostel", "Events", "Laundry", "Administration")
 * @param {string} opts.details - Detailed summary of changes made
 * @param {Object} [opts.user] - User object performing the action (uid, name, role, category)
 */
export async function logAction({ action, department = 'Administration', details = '', user = null }) {
  try {
    let userData = user;
    if (!userData) {
      try {
        const stored = localStorage.getItem('user');
        if (stored) userData = JSON.parse(stored);
      } catch (e) { /* ignore */ }
    }

    const logEntry = {
      action: action || 'Settings Updated',
      department: department || 'Administration',
      details: details || 'No additional details provided.',
      userId: userData?.uid || 'system',
      userName: userData?.name || userData?.displayName || 'HMC Member',
      userUniqueId: userData?.uniqueId || userData?.rollNo || '—',
      userRole: userData?.role || 'member',
      userCategory: userData?.category || userData?.department || 'HMC',
      timestamp: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    };

    await addDoc(collection(db, 'audit_logs'), logEntry);
    console.log('[AuditLogger] Logged:', action);
  } catch (err) {
    console.warn('[AuditLogger] Failed to log action:', err.message);
  }
}

/**
 * Auto-purge logs older than 14 days (2 weeks).
 * @returns {Promise<number>} Number of purged records.
 */
export async function autoPurgeOldLogs() {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    if (snap.empty) return 0;

    const twoWeeksAgoMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    let purgedCount = 0;

    const deletePromises = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      let logTimeMs = null;

      if (data.timestamp && data.timestamp.seconds) {
        logTimeMs = data.timestamp.seconds * 1000;
      } else if (data.createdAtIso) {
        logTimeMs = new Date(data.createdAtIso).getTime();
      }

      if (logTimeMs && logTimeMs < twoWeeksAgoMs) {
        deletePromises.push(deleteDoc(doc(db, 'audit_logs', docSnap.id)));
        purgedCount++;
      }
    });

    await Promise.all(deletePromises);
    if (purgedCount > 0) {
      console.log(`[AuditLogger] Auto-purged ${purgedCount} log entries older than 2 weeks.`);
    }
    return purgedCount;
  } catch (err) {
    console.warn('[AuditLogger] Error auto-purging logs:', err.message);
    return 0;
  }
}
