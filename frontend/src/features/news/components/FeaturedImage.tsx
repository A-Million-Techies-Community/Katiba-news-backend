import { useState } from 'react'
import NewsImage from './NewsImage'
import { uploadImage } from '../api'
import type { UploadedImage } from '../api'

/** Upload and describe the featured image without changing the story until Save. */
export default function FeaturedImage({ image, alt, caption, editable, onImage, onAlt, onCaption, onBusy }: {
  image: UploadedImage | null; alt: string; caption: string; editable: boolean
  onImage: (image: UploadedImage | null) => void; onAlt: (text: string) => void
  onCaption: (text: string) => void; onBusy: (busy: boolean) => void
}) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  async function upload(file: File) {
    setError(''); setUploading(true); onBusy(true)
    try { onImage(await uploadImage(file)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed.') }
    finally { setUploading(false); onBusy(false) }
  }
  return <section className="nd-featured-image">
    <h3>Featured image</h3>
    {image && <figure><NewsImage src={image.url} alt={alt} />{caption && <figcaption>{caption}</figcaption>}</figure>}
    {editable && <label>{image ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} /></label>}
    {uploading && <p role="status">Uploading image…</p>}
    {error && <p role="alert" className="nd-error">{error}</p>}
    {editable && <p className="nd-hint">JPEG, PNG or WebP · Up to 5 MB and 20 megapixels</p>}
    {image && editable && <div className="nd-image-details"><label>Featured image alt text (required)<input required maxLength={300} value={alt} onChange={event => onAlt(event.target.value)} placeholder="Describe the image for readers who cannot see it" /></label><label>Featured image caption<input maxLength={500} value={caption} onChange={event => onCaption(event.target.value)} /></label><button type="button" disabled={uploading} onClick={() => onImage(null)}>Remove featured image</button></div>}
  </section>
}
