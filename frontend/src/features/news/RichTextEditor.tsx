import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import NewsImage from './NewsImage'
import { uploadImage } from './api'

/** A native modal preserves the story selection while fields receive keyboard focus. */
function EditorDialog({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return createPortal(<dialog ref={dialog} className="nd-editor-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="nd-dialog-heading"><h2>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>×</button></div>
    {children}
  </dialog>, document.body)
}

/** Preview local image bytes before committing an upload. */
function LocalPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (image.current) image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={image} className="nd-upload-preview" alt="Image to insert" />
}

/** Show image metadata controls only when requested, keeping the story uncluttered. */
function ImageNode({ node, editor, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [editing, setEditing] = useState(false)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const editable = useEditorState({ editor, selector: ({ editor: current }) => current.isEditable })
  return <NodeViewWrapper className={`nd-inline-image ${selected ? 'nd-image-selected' : ''}`} contentEditable={false}>
    <figure data-drag-handle><NewsImage src={node.attrs.src} alt={node.attrs.alt || ''} />{node.attrs.caption && <figcaption>{node.attrs.caption}</figcaption>}</figure>
    {editable && <div className="nd-image-actions"><button type="button" onClick={() => { setAlt(node.attrs.alt || ''); setCaption(node.attrs.caption || ''); setEditing(true) }}>Edit image details</button><button type="button" onClick={deleteNode}>Remove image</button><span>Drag the image to move it</span></div>}
    {editing && editable && <EditorDialog title="Edit image details" onClose={() => setEditing(false)}>
      <NewsImage src={node.attrs.src} alt={alt} />
      <label>Image alt text<input maxLength={300} value={alt} onChange={event => setAlt(event.target.value)} /></label>
      <label>Image caption<input maxLength={500} value={caption} onChange={event => setCaption(event.target.value)} /></label>
      <button type="button" disabled={!alt.trim()} onClick={() => { updateAttributes({ alt: alt.trim(), caption }); setEditing(false) }}>Save image details</button>
    </EditorDialog>}
  </NodeViewWrapper>
}

/** Persist ordinary image figures and render private image bytes through React. */
const StoryImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: element => (element.querySelector('img') || element).getAttribute('src') },
      alt: { default: '', parseHTML: element => (element.querySelector('img') || element).getAttribute('alt') || '' },
      caption: { default: '', parseHTML: element => element.querySelector('figcaption')?.textContent || '' },
    }
  },
  parseHTML() { return [{ tag: 'figure', getAttrs: element => element.querySelector('img') ? null : false }, { tag: 'img[src]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['figure', ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt }], ['figcaption', {}, HTMLAttributes.caption || '']]
  },
  addNodeView() { return ReactNodeViewRenderer(ImageNode) },
})

function editorContent(content: string) {
  if (!/<\/?[a-z][\s\S]*>/i.test(content)) {
    return content.split('\n').map(text => `<p>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`).join('')
  }
  return content
}

/** Accept ordinary domains as well as complete web/email links, but no script URLs. */
function linkURL(input: string) {
  const trimmed = input.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  const href = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(href)
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) return null
    if (url.protocol === 'mailto:' && !url.pathname.includes('@')) return null
    return url.href
  } catch { return null }
}

type Props = { value: string; editable: boolean; disabled?: boolean; onChange?: (html: string) => void; onBusy?: (busy: boolean) => void }

/** Provide selection-aware links and image insertion for both newsroom roles. */
export default function RichTextEditor({ value, editable, disabled = false, onChange, onBusy }: Props) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState('')
  const [linkText, setLinkText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [linkRange, setLinkRange] = useState({ from: 1, to: 1, text: '', href: '' })
  const imagePosition = useRef(1)
  const canEdit = useRef(editable && !disabled)
  useEffect(() => { canEdit.current = editable && !disabled && !uploading }, [editable, disabled, uploading])

  function chooseImage(file: File, position: number) {
    if (!canEdit.current) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPEG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Use an image smaller than 5 MB.'); return }
    imagePosition.current = position
    setImageFile(file); setAlt(''); setCaption(''); setError('')
  }

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: { openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } } }), StoryImage],
    content: editorContent(value), editable,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Story content', 'aria-multiline': 'true' },
      handleClick(view, _position, event) {
        const anchor = (event.target as HTMLElement).closest('a')
        if (anchor && (!view.editable || event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          const href = linkURL(anchor.getAttribute('href') || '')
          if (href) window.open(href, '_blank', 'noopener,noreferrer')
          return true
        }
        return false
      },
      handleKeyDown(_view, event) {
        if (canEdit.current && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault(); openLink(); return true
        }
        return false
      },
      handlePaste(view, event) {
        const file = event.clipboardData?.files[0]
        if (!file || !canEdit.current) return false
        event.preventDefault(); chooseImage(file, view.state.selection.to); return true
      },
      handleDrop(view, event, _slice, moved) {
        const file = event.dataTransfer?.files[0]
        if (moved || !file || !canEdit.current) return false
        event.preventDefault()
        chooseImage(file, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.to)
        return true
      },
    },
    onUpdate: ({ editor: current }) => onChange?.(current.getHTML()),
  })
  useEffect(() => { editor?.setEditable(editable && !disabled && !uploading, false) }, [editor, editable, disabled, uploading])
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive('bold'), italic: current?.isActive('italic'), underline: current?.isActive('underline'),
    heading2: current?.isActive('heading', { level: 2 }), heading3: current?.isActive('heading', { level: 3 }),
    bullet: current?.isActive('bulletList'), ordered: current?.isActive('orderedList'), quote: current?.isActive('blockquote'), link: current?.isActive('link'),
  }) })

  function openLink() {
    if (!editor || !canEdit.current) return
    if (editor.isActive('link')) editor.commands.extendMarkRange('link')
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')
    const href = editor.getAttributes('link').href || ''
    setLinkRange({ from, to, text, href })
    setLink(href); setLinkText(text); setError(''); setLinkOpen(true)
  }

  function applyLink() {
    if (!editor) return
    const href = linkURL(link)
    if (!href) { setError('Enter a valid website or email link, such as example.com or mailto:editor@example.com.'); return }
    const { from, to, text } = linkRange
    const label = linkText.trim() || href
    if (from !== to && label === text) {
      editor.chain().focus().setTextSelection({ from, to }).setLink({ href }).setTextSelection(to).unsetMark('link').run()
    } else {
      editor.chain().focus().insertContentAt({ from, to }, { type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] }).unsetMark('link').run()
    }
    setLinkOpen(false); setError('')
  }

  function removeLink() {
    if (!editor) return
    const { from, to } = linkRange
    editor.chain().focus().setTextSelection({ from, to }).unsetLink().run()
    setLinkOpen(false); setError('')
  }

  async function insertImage() {
    if (!imageFile || !editor || !alt.trim()) return
    setUploading(true); onBusy?.(true); setError('')
    try {
      const image = await uploadImage(imageFile)
      editor.chain().focus().insertContentAt(imagePosition.current, [{ type: 'image', attrs: { src: image.url, alt: alt.trim(), caption } }, { type: 'paragraph' }]).run()
      setImageFile(null); setAlt(''); setCaption('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed.') }
    finally { setUploading(false); onBusy?.(false) }
  }

  if (!editor) return <p>Loading editor…</p>
  return <div className={`nd-rich-editor ${editable ? '' : 'nd-rich-readonly'}`}>
    {editable && <>
      <fieldset className="nd-format-toolbar" role="toolbar" aria-label="Story formatting" disabled={disabled || uploading}>
        <button type="button" aria-label="Bold" aria-pressed={!!state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button type="button" aria-label="Italic" aria-pressed={!!state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" aria-label="Underline" aria-pressed={!!state?.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button type="button" aria-label="Heading 2" aria-pressed={!!state?.heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" aria-label="Heading 3" aria-pressed={!!state?.heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" aria-label="Bullet list" aria-pressed={!!state?.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" aria-label="Numbered list" aria-pressed={!!state?.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" aria-label="Block quote" aria-pressed={!!state?.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“ Quote</button>
        <button type="button" aria-pressed={!!state?.link} onClick={openLink}>Link</button>
        <button type="button" onClick={() => { imagePosition.current = editor.state.selection.to; input.current?.click() }}>Insert image</button>
        <button type="button" aria-label="Undo" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" aria-label="Redo" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
      </fieldset>
      <p className="nd-image-drop-hint">Drop or paste an image into your story, or choose Insert image. Use Ctrl/Cmd + click to open links while editing.</p>
      <input ref={input} type="file" hidden aria-label="Inline image file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) chooseImage(file, imagePosition.current); event.target.value = '' }} />
      {linkOpen && <EditorDialog title={linkRange.href ? 'Edit link' : 'Insert link'} onClose={() => { setLinkOpen(false); setError('') }}>
        <label>Text to display<input value={linkText} onChange={event => setLinkText(event.target.value)} placeholder="The website address is used if left blank" /></label>
        <label>Link URL<input type="text" value={link} onChange={event => setLink(event.target.value)} placeholder="example.com or https://…" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }} /></label>
        {error && <p className="nd-error" role="alert">{error}</p>}
        <div className="nd-actions"><button type="button" onClick={applyLink}>Apply link</button>{linkRange.href && <button type="button" onClick={removeLink}>Remove link</button>}{linkURL(link) && <a href={linkURL(link)!} target="_blank" rel="noopener noreferrer">Open link ↗</a>}</div>
      </EditorDialog>}
      {imageFile && <EditorDialog title="Insert image" busy={uploading} onClose={() => { setImageFile(null); setError('') }}>
        <LocalPreview file={imageFile} /><p>{imageFile.name}</p>
        <label>Alt text (required)<input disabled={uploading} maxLength={300} value={alt} onChange={event => setAlt(event.target.value)} placeholder="Describe what the image shows" /></label>
        <label>Caption<input disabled={uploading} maxLength={500} value={caption} onChange={event => setCaption(event.target.value)} /></label>
        {error && <p className="nd-error" role="alert">{error}</p>}
        <div className="nd-actions"><button type="button" disabled={uploading || !alt.trim()} onClick={() => void insertImage()}>{uploading ? 'Uploading…' : 'Upload and insert'}</button><button type="button" disabled={uploading} onClick={() => input.current?.click()}>Choose another image</button><button type="button" disabled={uploading} onClick={() => setImageFile(null)}>Cancel image</button></div>
      </EditorDialog>}
    </>}
    {error && !linkOpen && !imageFile && <p className="nd-error" role="alert">{error}</p>}
    <EditorContent editor={editor} />
  </div>
}
