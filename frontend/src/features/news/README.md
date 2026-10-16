# News frontend

- `pages/`: dashboard entry points and workspace orchestration.
- `components/`: story editor, images, content manager, and editorial desk.
- `api/`: authenticated news requests, image uploads, and pagination.

Shared dashboard UI lives in `src/dashboard/`: `DashboardLayout`,
`Sidebar`, `ThemeToggle`, and `dashboard.css`. Author, writer, and editor
workspaces use this layout with their own navigation items and handlers.
Role permissions remain in the feature page.

`src/dashboard/hooks/useDashboardTheme.ts` owns the persisted light/dark preference.
