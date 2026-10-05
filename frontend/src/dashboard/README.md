# Shared dashboard foundation

All dashboards import reusable UI from `src/dashboard/index.ts`.

- `components/`: shared layout, sidebar, theme toggle, and theme context.
- `hooks/`: persisted dashboard theme behavior.
- `styles/`: common dashboard theme and workspace styles.

Keep feature pages, feature components, and API calls under
`src/features/<feature>/`. Pass navigation items and callbacks to
`DashboardLayout` so each workspace uses the same UI with its own actions.

```tsx
import { DashboardLayout, ThemeToggle } from './dashboard'
```
