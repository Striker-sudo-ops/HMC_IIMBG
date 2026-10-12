# IIM Bodhgaya HMC Portal — Setup Guide

> **Hostel & Mess Committee Management System**

---

## ✅ What's Built

| Feature | Status |
|---|---|
| `@iimbg.ac.in` only email validation | ✅ |
| HMC member login (admin-created only) | ✅ |
| Student self-registration | ✅ |
| Light / Dark mode toggle | ✅ |
| Admin creates HMC member accounts | ✅ |
| Admin deletes any account | ✅ |
| Different student dashboard | ✅ |
| HMC Committee public page | ✅ |
| Admin Committee Editor | ✅ |
| Calendar with holiday import (CSV/JSON) | ✅ |
| Tasks with doubts & star rating | ✅ |
| Chat using Unique IDs | ✅ |
| Unique ID format `#HMC_YY_XXX` | ✅ |
| Logo integration | ✅ |

---

## 🔥 Step 1 — Create a Firebase Project

1. Go to **[https://console.firebase.google.com](https://console.firebase.google.com)**
2. Click **Add Project** → name it `iimbg-hmc-portal`
3. Disable Google Analytics (optional) → **Create Project**

---

## 🔐 Step 2 — Enable Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** → Enable **Email/Password**
3. Save

---

## 🗄️ Step 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Select **Start in production mode** (we have our own rules)
3. Choose your region (e.g., `asia-south1` for India)

### Apply Security Rules
1. In Firestore → **Rules** tab
2. Delete the default rules
3. Copy-paste everything from **`firestore.rules`** file in this project
4. Click **Publish**

---

## 📦 Step 4 — Enable Storage

1. Firebase Console → **Storage** → **Get Started**
2. Production mode → Continue
3. Choose same region as Firestore

### Storage Rules (paste in Storage > Rules)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-pics/{uid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /committee/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## ⚙️ Step 5 — Get Your Firebase Config

1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **Your apps** → Click **`</>`** (Web)
3. Register app as `HMC Portal` → Continue
4. Copy the `firebaseConfig` object shown

---

## 📝 Step 6 — Paste Config Into Project

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

## 🚀 Step 7 — Run the App

You **must** use a local server (not just double-click the file). Options:

### Option A — VS Code Live Server (Easiest)
1. Install **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. App opens at `http://127.0.0.1:5500`

### Option B — Python
```bash
cd "C:\Users\priya\OneDrive\Desktop\Mess_Committee"
python -m http.server 8080
```
Then open: `http://localhost:8080`

---

## 👤 Step 8 — First-Time Setup (Create Admin Account)

1. Open `http://localhost:8080` (or Live Server URL)
2. A **"First-Time Portal Setup"** modal will appear automatically
3. Fill in:
   - **Admin Full Name**: e.g., `Rahul Sharma`
   - **Admin Email**: e.g., `rahul@iimbg.ac.in` *(must be @iimbg.ac.in)*
   - **Password**: min 8 characters
   - **Post**: e.g., `General Secretary`
   - **Graduation Year**: e.g., `2027`
4. Click **Create Admin Account & Launch Portal**
5. You'll get Unique ID: **`#HMC_27_001`**

---

## 🏫 Understanding the Two Portals

### HMC Members Dashboard (after HMC login)
- Dashboard with stats, tasks, chat, calendar
- Profile with Unique ID badge
- Admin tools: manage members, hierarchy, tasks

### Student Dashboard (after student login/register)
- Home with welcome + events preview
- **HMC Committee** page (read-only, with contact info)
- **Past Members** (historical records)
- **Calendar** (events + holidays)

---

## 👥 How to Add HMC Members (Important!)

> **HMC member accounts MUST be created by Admin only.**

1. Log in as Admin
2. Go to **Members** in the sidebar
3. Click **Add HMC Member**
4. Fill in their name, email (`@iimbg.ac.in`), password, post, graduation year
5. Click **Create Member**
6. System auto-generates their Unique ID (e.g., `#HMC_27_002`)

### If an HMC member registered themselves as a student:
1. Go to **Members** → **Student Accounts** tab
2. Find and **Delete** their student account
3. Now create their proper HMC account using **Add HMC Member**

---

## 🗓️ Importing Holiday Lists (Calendar)

1. Log in as Admin → Go to **Calendar**
2. Click **Import Holidays** button
3. Choose **CSV Upload** or **Paste JSON**

**CSV Format** (one event per line):
```
Republic Day, 2026-01-26, holiday
Holi, 2026-03-14, festival
Mid-Sem Exams, 2026-03-01, college
```

**JSON Format**:
```json
[
  {"title": "Republic Day", "date": "2026-01-26", "type": "holiday"},
  {"title": "Holi", "date": "2026-03-14", "type": "festival"}
]
```

---

## 🆔 Unique ID System

All HMC communication uses Unique IDs:
- Format: `#HMC_YY_XXX` (YY = last 2 digits of graduation year)
- Admin: `#HMC_27_001` (always fixed)
- Next member: `#HMC_27_002`, `#HMC_27_003`, etc.
- In chat: type `#HMC_27_001` to tag a member

---

## 🎨 Light / Dark Mode

Click the **☀️/🌙** button in the sidebar or top-right corner to toggle.
The preference is saved to your browser automatically.

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| "Firebase not configured" | Fill in `js/firebase-config.js` |
| Login fails for `@gmail.com` | Only `@iimbg.ac.in` is accepted |
| Setup modal doesn't appear | Clear browser storage and reload |
| Images don't load | Check Storage Rules in Firebase Console |
| Module error in console | Must run via local server, not file:// |

---

*IIM Bodhgaya HMC Portal — Built with Firebase + Vanilla JS*
