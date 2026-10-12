# Implementation Plan - Mess Committee Portal Fixes & Enhancements

Fix issues on Water TDS, Hygiene, and Events pages, and implement new features for event notification team reminders, festival event type, and Calendar-Events synchronization.

---

## User Review Required

> [!IMPORTANT]
> - **Firestore Rules Update**: Updating `firestore.rules` to include missing collections (`hostel_tds_sessions` & `hostel_hygiene_sessions`) which were causing permission errors on saving/completing Water TDS and Hygiene inspections.
> - **Default Event Categories**: The default categories (`Graphic Designing Team`, `Video Editing Team`, `Social Media`, `Content`, `Mess`) will be automatically pre-selected when creating an event, and reminders will be broadcast to members of those categories upon event creation.
> - **Suggested Events Workflow**: Selecting a suggested event from the new tab will switch directly to the Create Event wizard pre-filled with the event details.

---

## Proposed Changes

### Firestore Security Rules
#### [MODIFY] [firestore.rules](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/firestore.rules)
- Add security rules for `hostel_tds_sessions` and `hostel_hygiene_sessions` collections to allow read and write operations for authenticated HMC members.
- Ensure write permissions for `tds_assignments`, `hygiene_assignments`, `hostel_tds`, and `hostel_hygiene` match logged-in HMC member credentials.

---

### Water TDS & Hygiene Pages
#### [MODIFY] [water-tds.html](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/water-tds.html)
- Enhance error handling and feedback in `saveTdsSession` to log specific Firestore errors and provide actionable toast notifications.

#### [MODIFY] [hygiene-clean.html](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/hygiene-clean.html)
- Enhance error handling and feedback in `saveHygieneSession` to log specific Firestore errors and provide actionable toast notifications.

---

### Events Portal & Utilities
#### [MODIFY] [js/events.js](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/js/events.js)
- Update `eventTypeColor` helper to include support and vibrant styling for `festival` event type.
- Support storing `notificationCategories` in `createCampusEvent`.

#### [MODIFY] [events/events-portal.html](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/events/events-portal.html)
1. **Fix Share External Link Button**:
   - Rewrite `shareRequestLink(id)` to construct robust URLs using `new URL(...)`.
   - Add a fallback clipboard copying mechanism using a temporary textarea (`document.execCommand('copy')`) for environments without `navigator.clipboard` access.
2. **Add 'Festival' Option**:
   - Add `<option value="festival">Festival</option>` to the event type select dropdown (`#ev-type`).
3. **Send Notification & Category Selection**:
   - Add a category selection section in the Create Event wizard.
   - Automatically pre-select categories: `Graphic Designing Team`, `Video Editing Team`, `Social Media`, `Content`, `Mess`.
   - Allow user to select/unselect any categories.
   - On event creation, send an event reminder message tagging all members of selected categories in global chat / notifications.
4. **Suggested Events Tab & Calendar Sync**:
   - Add a new tab `Suggested Events` in the events portal tabs bar.
   - Render static festivals/holidays and calendar events inside this tab.
   - Add action "Create Event from Suggestion" which opens the Create Event wizard with pre-filled title, event type, dates, and description.

---

### Calendar Synchronization
#### [MODIFY] [js/calendar.js](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/js/calendar.js)
- Ensure all campus events from `campus_events` collection are fetched and accurately mapped to FullCalendar events with proper colors and details.

#### [MODIFY] [calendar.html](file:///c:/Users/priya/OneDrive/Desktop/Mess_Committee_win/Mess_Committee/calendar.html)
- Update FullCalendar legend to include `festival`, `cultural`, `sports`, `academic`, `hostel`, `technical`, `college`, and `holiday`.

---

## Verification Plan

### Manual Verification
1. **Water TDS & Hygiene**:
   - Open `water-tds.html`, enter PPM readings for hostel coolers, and click "Save (In Progress)" and "Mark as Complete". Verify data saves in Firestore and success toasts appear without permission errors.
   - Open `hygiene-clean.html`, enter ratings for hostel areas, and click "Save" and "Mark as Complete". Verify data saves cleanly.
2. **Events Page Share Link**:
   - Click the "Share external request link" button next to "Manage" on any event card. Verify the link is copied to clipboard and success toast appears.
3. **Create Event Page**:
   - Navigate to "Create Event" tab. Verify `Festival` is present in Event Type dropdown.
   - Check category selection options under "Send Notification". Verify `Graphic Designing Team`, `Video Editing Team`, `Social Media`, `Content`, and `Mess` are pre-selected by default and can be unselected or modified.
   - Submit event and verify reminder message is sent to global chat tagging selected categories.
4. **Calendar & Suggested Events Sync**:
   - Check `calendar.html` and verify created campus events and festivals appear on FullCalendar.
   - Open `events-portal.html`, switch to "Suggested Events" tab, click "Create Event" on a suggested festival (e.g. Diwali/Holi). Verify Create Event wizard opens with pre-filled title, type, dates, and description.
