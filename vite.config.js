import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Root of the project
  root: '.',
  publicDir: 'assets',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Treat CDN URLs as external so they are not bundled into local files
      external: [
        /^https:\/\/www\.gstatic\.com\/.*/
      ],
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        studentDashboard: resolve(import.meta.dirname, 'student-dashboard.html'),
        laundry: resolve(import.meta.dirname, 'laundry.html'),
        menu: resolve(import.meta.dirname, 'menu.html'),
        foodTesting: resolve(import.meta.dirname, 'food-testing.html'),
        complaints: resolve(import.meta.dirname, 'complaints.html'),
        notices: resolve(import.meta.dirname, 'notices.html'),
        calendar: resolve(import.meta.dirname, 'calendar.html'),
        tasks: resolve(import.meta.dirname, 'tasks.html'),
        committee: resolve(import.meta.dirname, 'committee.html'),
        profile: resolve(import.meta.dirname, 'profile.html'),
        waterTds: resolve(import.meta.dirname, 'water-tds.html'),
        hygieneClean: resolve(import.meta.dirname, 'hygiene-clean.html'),
        electricity: resolve(import.meta.dirname, 'electricity.html'),
        verifySetup: resolve(import.meta.dirname, 'verify-setup.html'),
        
        // Admin Pages
        adminDepartments: resolve(import.meta.dirname, 'admin/departments.html'),
        adminManageHostels: resolve(import.meta.dirname, 'admin/manage-hostels.html'),
        adminManageMembers: resolve(import.meta.dirname, 'admin/manage-members.html'),
        adminMessSettings: resolve(import.meta.dirname, 'admin/mess-settings.html'),
        adminLaundrySettings: resolve(import.meta.dirname, 'admin/laundry-settings.html'),
        adminHostelSettings: resolve(import.meta.dirname, 'admin/hostel-settings.html'),
        adminEventSettings: resolve(import.meta.dirname, 'admin/event-settings.html'),
        adminTaskManager: resolve(import.meta.dirname, 'admin/task-manager.html'),
        adminLogs: resolve(import.meta.dirname, 'admin/logs.html'),
        adminBatchManagement: resolve(import.meta.dirname, 'admin/batch-management.html'),
        adminCategories: resolve(import.meta.dirname, 'admin/categories.html'),
        adminCommitteeEditor: resolve(import.meta.dirname, 'admin/committee-editor.html'),
        adminManageHierarchy: resolve(import.meta.dirname, 'admin/manage-hierarchy.html'),

        // Events Pages
        eventsPortal: resolve(import.meta.dirname, 'events/events-portal.html'),
        eventDetail: resolve(import.meta.dirname, 'events/event-detail.html'),
        eventRequest: resolve(import.meta.dirname, 'events/event-request.html'),
        eventScanner: resolve(import.meta.dirname, 'events/event-scanner.html')
      }
    }
  }
});
