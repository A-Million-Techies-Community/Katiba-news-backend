import { useEffect, useState } from 'react'
import { newsFetch } from '../api'

/** Display private news images using the same authentication as the dashboard. */
export default function NewsImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState<{ src: string; url: string } | null>(null)
  const [failed, setFailed] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    if (!/^\/api\/news\/images\/[0-9a-f-]{36}\/$/.test(src)) return
    void newsFetch(src).then(response => response.blob()).then(blob => {
      if (active) {
        objectUrl = URL.createObjectURL(blob)
        setLoaded({ src, url: objectUrl })
      }
    }).catch(() => { if (active) setFailed(src) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  if (loaded?.src === src) return <img src={loaded.url} alt={alt} />
  return <span role="status">{failed === src ? 'Image unavailable. Check your access or sign in again.' : 'Loading image…'}</span>
}
