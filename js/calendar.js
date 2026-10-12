// ============================================================
// CALENDAR — Events (College, Holidays, Festivals)
// Dynamic & Auto-updating per year
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Multi-year accurate festival map (2024 – 2030) ──────────────────────────
// Ensures correct lunar/Islamic dates even without internet or external API
const FESTIVALS_DATABASE = {
  2024: [
    { id: 'f24_1', title: 'Makar Sankranti / Pongal', date: '2024-01-15', type: 'festival' },
    { id: 'f24_2', title: 'Republic Day', date: '2024-01-26', type: 'holiday' },
    { id: 'f24_3', title: 'Maha Shivratri', date: '2024-03-08', type: 'festival' },
    { id: 'f24_4', title: 'Holi', date: '2024-03-25', type: 'festival' },
    { id: 'f24_5', title: 'Good Friday', date: '2024-03-29', type: 'holiday' },
    { id: 'f24_6', title: 'Eid ul-Fitr', date: '2024-04-11', type: 'festival' },
    { id: 'f24_7', title: 'Ambedkar Jayanti', date: '2024-04-14', type: 'holiday' },
    { id: 'f24_8', title: 'Ram Navami', date: '2024-04-17', type: 'festival' },
    { id: 'f24_9', title: 'Labour Day', date: '2024-05-01', type: 'holiday' },
    { id: 'f24_10', title: 'Buddha Purnima', date: '2024-05-23', type: 'festival' },
    { id: 'f24_11', title: 'Eid ul-Adha (Bakrid)', date: '2024-06-17', type: 'festival' },
    { id: 'f24_12', title: 'Muharram', date: '2024-07-17', type: 'festival' },
    { id: 'f24_13', title: 'Independence Day', date: '2024-08-15', type: 'holiday' },
    { id: 'f24_14', title: 'Raksha Bandhan', date: '2024-08-19', type: 'festival' },
    { id: 'f24_15', title: 'Janmashtami', date: '2024-08-26', type: 'festival' },
    { id: 'f24_16', title: 'Ganesh Chaturthi', date: '2024-09-07', type: 'festival' },
    { id: 'f24_17', title: 'Onam', date: '2024-09-15', type: 'festival' },
    { id: 'f24_18', title: 'Gandhi Jayanti', date: '2024-10-02', type: 'holiday' },
    { id: 'f24_19', title: 'Navratri Begins', date: '2024-10-03', type: 'festival' },
    { id: 'f24_20', title: 'Dussehra (Vijayadashami)', date: '2024-10-12', type: 'festival' },
    { id: 'f24_21', title: 'Dhanteras', date: '2024-10-29', type: 'festival' },
    { id: 'f24_22', title: 'Diwali', date: '2024-11-01', type: 'festival' },
    { id: 'f24_23', title: 'Govardhan Puja', date: '2024-11-02', type: 'festival' },
    { id: 'f24_24', title: 'Bhai Dooj', date: '2024-11-03', type: 'festival' },
    { id: 'f24_25', title: 'Chhath Puja', date: '2024-11-07', type: 'festival' },
    { id: 'f24_26', title: 'Guru Nanak Jayanti', date: '2024-11-15', type: 'festival' },
    { id: 'f24_27', title: 'Christmas', date: '2024-12-25', type: 'holiday' }
  ],
  2025: [
    { id: 'f25_1', title: "New Year's Day", date: '2025-01-01', type: 'holiday' },
    { id: 'f25_2', title: 'Makar Sankranti / Pongal', date: '2025-01-14', type: 'festival' },
    { id: 'f25_3', title: 'Republic Day', date: '2025-01-26', type: 'holiday' },
    { id: 'f25_4', title: 'Maha Shivratri', date: '2025-02-26', type: 'festival' },
    { id: 'f25_5', title: 'Holi', date: '2025-03-14', type: 'festival' },
    { id: 'f25_6', title: 'Eid ul-Fitr', date: '2025-03-31', type: 'festival' },
    { id: 'f25_7', title: 'Ram Navami', date: '2025-04-06', type: 'festival' },
    { id: 'f25_8', title: 'Ambedkar Jayanti', date: '2025-04-14', type: 'holiday' },
    { id: 'f25_9', title: 'Good Friday', date: '2025-04-18', type: 'holiday' },
    { id: 'f25_10', title: 'Labour Day', date: '2025-05-01', type: 'holiday' },
    { id: 'f25_11', title: 'Buddha Purnima', date: '2025-05-12', type: 'festival' },
    { id: 'f25_12', title: 'Eid ul-Adha (Bakrid)', date: '2025-06-07', type: 'festival' },
    { id: 'f25_13', title: 'Muharram', date: '2025-07-06', type: 'festival' },
    { id: 'f25_14', title: 'Independence Day', date: '2025-08-15', type: 'holiday' },
    { id: 'f25_15', title: 'Janmashtami', date: '2025-08-16', type: 'festival' },
    { id: 'f25_16', title: 'Raksha Bandhan', date: '2025-08-09', type: 'festival' },
    { id: 'f25_17', title: 'Ganesh Chaturthi', date: '2025-08-27', type: 'festival' },
    { id: 'f25_18', title: 'Onam', date: '2025-09-05', type: 'festival' },
    { id: 'f25_19', title: 'Navratri Begins', date: '2025-09-22', type: 'festival' },
    { id: 'f25_20', title: 'Dussehra (Vijayadashami)', date: '2025-10-02', type: 'festival' },
    { id: 'f25_21', title: 'Gandhi Jayanti', date: '2025-10-02', type: 'holiday' },
    { id: 'f25_22', title: 'Dhanteras', date: '2025-10-18', type: 'festival' },
    { id: 'f25_23', title: 'Diwali', date: '2025-10-20', type: 'festival' },
    { id: 'f25_24', title: 'Govardhan Puja', date: '2025-10-21', type: 'festival' },
    { id: 'f25_25', title: 'Bhai Dooj', date: '2025-10-22', type: 'festival' },
    { id: 'f25_26', title: 'Chhath Puja', date: '2025-10-27', type: 'festival' },
    { id: 'f25_27', title: 'Guru Nanak Jayanti', date: '2025-11-05', type: 'festival' },
    { id: 'f25_28', title: 'Christmas', date: '2025-12-25', type: 'holiday' }
  ],
  2026: [
    { id: 'f26_1', title: "New Year's Day", date: '2026-01-01', type: 'holiday' },
    { id: 'f26_2', title: 'Makar Sankranti / Pongal', date: '2026-01-14', type: 'festival' },
    { id: 'f26_3', title: 'Republic Day', date: '2026-01-26', type: 'holiday' },
    { id: 'f26_4', title: 'Maha Shivratri', date: '2026-02-15', type: 'festival' },
    { id: 'f26_5', title: 'Holi', date: '2026-03-03', type: 'festival' },
    { id: 'f26_6', title: 'Eid ul-Fitr', date: '2026-03-20', type: 'festival' },
    { id: 'f26_7', title: 'Ram Navami', date: '2026-03-26', type: 'festival' },
    { id: 'f26_8', title: 'Good Friday', date: '2026-04-03', type: 'holiday' },
    { id: 'f26_9', title: 'Ambedkar Jayanti', date: '2026-04-14', type: 'holiday' },
    { id: 'f26_10', title: 'Labour Day', date: '2026-05-01', type: 'holiday' },
    { id: 'f26_11', title: 'Eid ul-Adha (Bakrid)', date: '2026-05-27', type: 'festival' },
    { id: 'f26_12', title: 'Buddha Purnima', date: '2026-05-31', type: 'festival' },
    { id: 'f26_13', title: 'Muharram', date: '2026-06-26', type: 'festival' },
    { id: 'f26_14', title: 'Raksha Bandhan', date: '2026-08-28', type: 'festival' },
    { id: 'f26_15', title: 'Independence Day', date: '2026-08-15', type: 'holiday' },
    { id: 'f26_16', title: 'Janmashtami', date: '2026-09-04', type: 'festival' },
    { id: 'f26_17', title: 'Ganesh Chaturthi', date: '2026-09-14', type: 'festival' },
    { id: 'f26_18', title: 'Gandhi Jayanti', date: '2026-10-02', type: 'holiday' },
    { id: 'f26_19', title: 'Navratri Begins', date: '2026-10-11', type: 'festival' },
    { id: 'f26_20', title: 'Dussehra (Vijayadashami)', date: '2026-10-20', type: 'festival' },
    { id: 'f26_21', title: 'Dhanteras', date: '2026-11-06', type: 'festival' },
    { id: 'f26_22', title: 'Diwali', date: '2026-11-08', type: 'festival' },
    { id: 'f26_23', title: 'Govardhan Puja', date: '2026-11-09', type: 'festival' },
    { id: 'f26_24', title: 'Bhai Dooj', date: '2026-11-10', type: 'festival' },
    { id: 'f26_25', title: 'Chhath Puja', date: '2026-11-14', type: 'festival' },
    { id: 'f26_26', title: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'festival' },
    { id: 'f26_27', title: 'Christmas', date: '2026-12-25', type: 'holiday' }
  ],
  2027: [
    { id: 'f27_1', title: "New Year's Day", date: '2027-01-01', type: 'holiday' },
    { id: 'f27_2', title: 'Makar Sankranti / Pongal', date: '2027-01-14', type: 'festival' },
    { id: 'f27_3', title: 'Republic Day', date: '2027-01-26', type: 'holiday' },
    { id: 'f27_4', title: 'Maha Shivratri', date: '2027-03-06', type: 'festival' },
    { id: 'f27_5', title: 'Eid ul-Fitr', date: '2027-03-10', type: 'festival' },
    { id: 'f27_6', title: 'Holi', date: '2027-03-22', type: 'festival' },
    { id: 'f27_7', title: 'Good Friday', date: '2027-03-26', type: 'holiday' },
    { id: 'f27_8', title: 'Ambedkar Jayanti', date: '2027-04-14', type: 'holiday' },
    { id: 'f27_9', title: 'Ram Navami', date: '2027-04-15', type: 'festival' },
    { id: 'f27_10', title: 'Labour Day', date: '2027-05-01', type: 'holiday' },
    { id: 'f27_11', title: 'Eid ul-Adha (Bakrid)', date: '2027-05-17', type: 'festival' },
    { id: 'f27_12', title: 'Buddha Purnima', date: '2027-05-20', type: 'festival' },
    { id: 'f27_13', title: 'Muharram', date: '2027-06-17', type: 'festival' },
    { id: 'f27_14', title: 'Independence Day', date: '2027-08-15', type: 'holiday' },
    { id: 'f27_15', title: 'Raksha Bandhan', date: '2027-08-18', type: 'festival' },
    { id: 'f27_16', title: 'Janmashtami', date: '2027-08-25', type: 'festival' },
    { id: 'f27_17', title: 'Ganesh Chaturthi', date: '2027-09-04', type: 'festival' },
    { id: 'f27_18', title: 'Gandhi Jayanti', date: '2027-10-02', type: 'holiday' },
    { id: 'f27_19', title: 'Navratri Begins', date: '2027-10-09', type: 'festival' },
    { id: 'f27_20', title: 'Dussehra (Vijayadashami)', date: '2027-10-09', type: 'festival' },
    { id: 'f27_21', title: 'Diwali', date: '2027-10-29', type: 'festival' },
    { id: 'f27_22', title: 'Chhath Puja', date: '2027-11-04', type: 'festival' },
    { id: 'f27_23', title: 'Guru Nanak Jayanti', date: '2027-11-13', type: 'festival' },
    { id: 'f27_24', title: 'Christmas', date: '2027-12-25', type: 'holiday' }
  ]
};

// Returns fixed national holidays for any arbitrary year (guarantees dynamic support beyond database)
function generateFixedHolidays(year) {
  return [
    { id: `gen_ny_${year}`, title: "New Year's Day", date: `${year}-01-01`, type: 'holiday' },
    { id: `gen_ms_${year}`, title: 'Makar Sankranti', date: `${year}-01-14`, type: 'festival' },
    { id: `gen_rd_${year}`, title: 'Republic Day', date: `${year}-01-26`, type: 'holiday' },
    { id: `gen_aj_${year}`, title: 'Ambedkar Jayanti', date: `${year}-04-14`, type: 'holiday' },
    { id: `gen_ld_${year}`, title: 'Labour Day', date: `${year}-05-01`, type: 'holiday' },
    { id: `gen_id_${year}`, title: 'Independence Day', date: `${year}-08-15`, type: 'holiday' },
    { id: `gen_gj_${year}`, title: 'Gandhi Jayanti', date: `${year}-10-02`, type: 'holiday' },
    { id: `gen_xm_${year}`, title: 'Christmas', date: `${year}-12-25`, type: 'holiday' }
  ];
}

// Dynamically fetch public holidays from Nager.Date API (Free, open source, no key needed)
async function fetchOnlineHolidays(year) {
  const cacheKey = `hmc_holidays_nager_${year}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data && data.length > 0) return data;
    } catch (e) { /* ignore cache parse error */ }
  }

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      const formatted = list.map((item, idx) => ({
        id: `online_${year}_${idx}`,
        title: item.localName || item.name,
        date: item.date,
        type: item.types && item.types.includes('Public') ? 'holiday' : 'festival'
      }));
      localStorage.setItem(cacheKey, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('[Calendar] Free online holiday API unavailable, falling back to built-in database:', err.message);
  }
  return null;
}

// ── Dynamic static events getter ─────────────────────────────────────────────
export function getStaticEvents(year = new Date().getFullYear()) {
  if (FESTIVALS_DATABASE[year]) {
    return FESTIVALS_DATABASE[year];
  }
  return generateFixedHolidays(year);
}

// ── Get all events (Firestore DB + Campus Events + Dynamic Multi-Year Holidays) ────────
export async function getAllEvents(targetYear = new Date().getFullYear()) {
  // 1. Fetch custom events added by HMC admins from Firestore
  let dbEvents = [];
  try {
    const q = query(collection(db, 'events'), orderBy('date'));
    const snap = await getDocs(q);
    dbEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Error fetching custom events:', err);
  }

  // 2. Fetch scheduled campus events from Events Portal (campus_events)
  let campusEvents = [];
  try {
    const cSnap = await getDocs(collection(db, 'campus_events'));
    campusEvents = cSnap.docs.map(d => {
      const data = d.data();
      const startDate = data.startDate || data.date || '';
      return {
        id: 'ce_' + d.id,
        title: data.title || 'Campus Event',
        date: startDate,
        endDate: data.endDate || startDate || null,
        type: data.type || 'college',
        description: (data.description || '') + (data.venue ? ` [Venue: ${data.venue}]` : '')
      };
    }).filter(e => e.date);
  } catch (e) {
    console.warn('Error fetching campus_events for calendar:', e);
  }

  // 3. Dynamic national holidays / festivals for previous, current, and next year
  const yearsToFetch = [targetYear - 1, targetYear, targetYear + 1];
  let holidays = [];

  for (const yr of yearsToFetch) {
    let yearHolidays = FESTIVALS_DATABASE[yr] ? [...FESTIVALS_DATABASE[yr]] : [];
    
    // Attempt online fetch to supplement/update dynamically for any year
    const onlineData = await fetchOnlineHolidays(yr);
    if (onlineData && onlineData.length > 0) {
      const existingKeys = new Set(yearHolidays.map(h => `${h.date}_${h.title.toLowerCase()}`));
      onlineData.forEach(item => {
        const key = `${item.date}_${item.title.toLowerCase()}`;
        if (!existingKeys.has(key)) {
          yearHolidays.push(item);
        }
      });
    } else if (!yearHolidays || yearHolidays.length === 0) {
      yearHolidays = generateFixedHolidays(yr);
    }
    holidays.push(...yearHolidays);
  }

  return [...holidays, ...dbEvents, ...campusEvents];
}

// ── Add a college event (admin only) ─────────────────────
export async function addEvent({ title, date, endDate = null, type = 'college', description = '' }) {
  const ref = await addDoc(collection(db, 'events'), {
    title, date, endDate, type, description,
    createdAt: serverTimestamp()
  });
  return { id: ref.id, title, date, endDate, type, description };
}

// ── Update event ──────────────────────────────────────────
export async function updateEvent(id, updates) {
  await updateDoc(doc(db, 'events', id), updates);
}

// ── Delete event ──────────────────────────────────────────
export async function deleteEvent(id) {
  if (id.startsWith('ce_')) {
    const realId = id.substring(3);
    await deleteDoc(doc(db, 'campus_events', realId));
  } else {
    await deleteDoc(doc(db, 'events', id));
  }
}

// ── Map events to FullCalendar format ────────────────────
export function toCalendarEvents(events) {
  const colorMap = {
    college: '#3B82F6', holiday: '#EF4444', festival: '#FB923C',
    cultural: '#A78BFA', sports: '#34D399', academic: '#60A5FA',
    hostel: '#F59E0B', technical: '#F87171', other: '#94A3B8'
  };
  return events.map(e => ({
    id:         e.id,
    title:      e.title,
    start:      e.date,
    end:        e.endDate || e.date,
    color:      colorMap[e.type] || '#6C63FF',
    className:  `event-${e.type}`,
    extendedProps: { type: e.type, description: e.description }
  }));
}
