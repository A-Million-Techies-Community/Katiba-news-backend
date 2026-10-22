import { lazy, Suspense } from 'react'

const NewsDashboard = lazy(() => import('./NewsDashboard'))

/** Load newsroom editing tools only when someone opens the news dashboard. */
export default function NewsDashboardPage() {
  return <Suspense fallback={<p className="workspace-loading" role="status">Loading newsroom…</p>}><NewsDashboard /></Suspense>
}
