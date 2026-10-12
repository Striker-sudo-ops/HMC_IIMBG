// ============================================================
// CHAT — Real-time messaging via Firestore
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp, where,
  arrayUnion, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Get or create chat rooms ──────────────────────────────
export async function getChatRooms(currentUser) {
  const rooms = [];

  // 1. My Inbox (tagged mentions / team reminders)
  rooms.push({ id: 'inbox', name: 'My Inbox / Mentions', type: 'inbox', icon: 'inbox' });

  // 2. Global room (all HMC members untagged broadcasts)
  rooms.push({ id: 'global', name: 'HMC Global', type: 'global', icon: 'global' });

  // 3. Sub-admin group room (if user has a supervisorId or is a sub-admin)
  if (currentUser.role === 'subadmin') {
    const roomId = `group_${currentUser.uid}`;
    await setDoc(doc(db, 'chatRooms', roomId), {
      name: `${currentUser.name}'s Team`,
      type: 'group',
      supervisorUid: currentUser.uid
    }, { merge: true });
    rooms.push({ id: roomId, name: `${currentUser.name}'s Team`, type: 'group', icon: 'team' });
  } else if (currentUser.supervisorId) {
    const supSnap = await getDoc(doc(db, 'users', currentUser.supervisorId));
    if (supSnap.exists()) {
      const sup = supSnap.data();
      const roomId = `group_${currentUser.supervisorId}`;
      rooms.push({ id: roomId, name: `${sup.name}'s Team`, type: 'group', icon: 'team' });
    }
  }

  return rooms;
}

// ── Listen to messages in a room ──────────────────────────
export function listenToMessages(roomId, currentUser, callback) {
  // If callback is passed as 2nd arg for backwards compatibility
  if (typeof currentUser === 'function') {
    callback = currentUser;
    currentUser = null;
  }

  const targetCollectionId = roomId === 'inbox' ? 'global' : roomId;
  const q = query(
    collection(db, 'chatRooms', targetCollectionId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    let messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (roomId === 'global') {
      // Global feed: untagged general broadcast messages for all members
      messages = messages.filter(m => !m.hasTags);
    } else if (roomId === 'inbox') {
      // My Inbox: messages where current user is tagged or sender of a tagged message
      messages = messages.filter(m => {
        if (!m.hasTags) return false;
        if (m.senderUid === currentUser?.uid) return true;
        if (Array.isArray(m.targetUids) && m.targetUids.includes(currentUser?.uid)) return true;
        return false;
      });
    }

    callback(messages);
  });
}

// ── Send a message ────────────────────────────────────────
export async function sendMessage(roomId, { senderUid, senderName, senderUniqueId, senderPicUrl, content }) {
  const targetCollectionId = roomId === 'inbox' ? 'global' : roomId;
  const targetUids = new Set();
  
  // Tag detection syntactically: does it contain @word or #word?
  const hasAnyTag = /@[A-Za-z0-9_]+|#[A-Za-z0-9_]+/i.test(content);

  try {
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'subadmin', 'member']));
    const snap = await getDocs(q);
    const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    const categories = ['Mess', 'Hostel', 'Events', 'Sports', 'Cleanliness', 'Water TDS', 'Electricity', 'Laundry', 'Food Testing', 'HMC', 'Security', 'Administration'];

    // 1. Resolve @ mentions for specific members or roles
    allUsers.forEach(u => {
      const name = u.name || '';
      const uniqueId = u.uniqueId || '';

      if (name) {
        const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const nameRegex = new RegExp(`@${escapedName}\\b`, 'i');
        if (nameRegex.test(content)) {
          targetUids.add(u.uid);
        }
      }

      if (uniqueId) {
        const cleanId = uniqueId.replace('#', '');
        const idRegex = new RegExp(`#?${cleanId}\\b`, 'i');
        if (idRegex.test(content)) {
          targetUids.add(u.uid);
        }
      }
    });

    // 2. Resolve @ mentions for categories and heads
    categories.forEach(cat => {
      const headRegex = new RegExp(`@${cat}\\s+Head\\b`, 'i');
      if (headRegex.test(content)) {
        allUsers.forEach(u => {
          const uCat = (u.category || '').toLowerCase().trim();
          const uTitle = (u.title || '').toLowerCase().trim();
          const uPost = (u.post || '').toLowerCase().trim();
          if (uCat === cat.toLowerCase() && (uPost.includes('head') || uTitle.includes('head'))) {
            targetUids.add(u.uid);
          }
        });
      }

      const catRegex = new RegExp(`@${cat}\\b`, 'i');
      if (catRegex.test(content)) {
        allUsers.forEach(u => {
          const uCat = (u.category || '').toLowerCase().trim();
          if (uCat === cat.toLowerCase()) {
            targetUids.add(u.uid);
          }
        });
      }
    });

    const targetUidsArray = Array.from(targetUids);

    // Write message doc
    await addDoc(collection(db, 'chatRooms', targetCollectionId, 'messages'), {
      senderUid,
      senderName,
      senderUniqueId,
      senderPicUrl: senderPicUrl || null,
      content,
      hasTags: hasAnyTag,
      targetUids: targetUidsArray,
      timestamp: serverTimestamp()
    });

    // Update room's last message preview
    await setDoc(doc(db, 'chatRooms', targetCollectionId), {
      lastMessage: content.slice(0, 60),
      lastMessageTime: serverTimestamp(),
      lastSender: senderName
    }, { merge: true });

    // Update unread counts
    const notifyUids = hasAnyTag
      ? targetUidsArray.filter(id => id !== senderUid)
      : allUsers.filter(u => u.uid !== senderUid).map(u => u.uid);

    const batchPromises = notifyUids.map(uid =>
      updateDoc(doc(db, 'users', uid), { unreadMessages: increment(1) }).catch(() => {})
    );
    await Promise.all(batchPromises);
  } catch (e) {
    console.warn("Error sending chat message:", e);
  }
}

// ── Clear unread messages for user ─────────────────────────
export async function clearUnreadMessages(uid) {
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), { unreadMessages: 0 });
  } catch (e) {
    console.warn("Clear unread error:", e);
  }
}

// ── Get all members for tag autocomplete ──────────────────
export async function getMembersForTagging() {
  const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'subadmin', 'member']));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    uid: d.id,
    name: d.data().name,
    uniqueId: d.data().uniqueId,
    post: d.data().post,
    category: d.data().category,
    title: d.data().title,
    profilePicUrl: d.data().profilePicUrl
  }));
}

// ── Parse tags from message text ──────────────────────────
export function parseTags(text, members) {
  const tags = [];

  // @POST / @CATEGORY tags — match members by category, post, or title
  const postMatches = text.matchAll(/@(\w[\w\s]*)/g);
  for (const match of postMatches) {
    const postQuery = match[1].toLowerCase().trim();
    const matched = members.filter(m =>
      m.post?.toLowerCase().includes(postQuery) ||
      m.category?.toLowerCase().includes(postQuery) ||
      m.title?.toLowerCase().includes(postQuery) ||
      m.name?.toLowerCase().includes(postQuery)
    );
    matched.forEach(m => tags.push({ type: 'post', value: match[1], uid: m.uid }));
  }

  // #ID tags
  const idMatches = text.matchAll(/#(HMC_\d{2}_\d{3})/g);
  for (const match of idMatches) {
    const member = members.find(m => m.uniqueId === `#${match[1]}`);
    if (member) tags.push({ type: 'id', value: `#${match[1]}`, uid: member.uid });
  }

  return tags;
}
