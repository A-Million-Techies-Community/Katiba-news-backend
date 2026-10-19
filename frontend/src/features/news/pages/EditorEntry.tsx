import { useEffect } from 'react'

/** Legacy staff entry; all accounts now use the shared workspace sign-in. */
export default function EditorEntry() {
  useEffect(() => { window.location.replace('/workspace') }, [])
  return <p role="status">Opening staff workspace…</p>
}
