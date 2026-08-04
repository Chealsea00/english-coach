'use client'
import { useState, useRef, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

interface TagEditorProps {
  tags: string[]
  /** If provided, tags are editable; if omitted, read-only display */
  onChange?: (tags: string[]) => void
}

/**
 * Inline tag chip editor.
 *
 * - Press Enter or comma to add a tag
 * - Press Backspace (on empty input) to remove the last tag
 * - Press Escape or blur to close the input
 * - Click × on a chip to remove it
 */
export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [editing, setEditing]       = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const name = raw.trim().toLowerCase().replace(/,/g, '').slice(0, 24)
    if (!name || tags.includes(name)) { setInputValue(''); return }
    onChange?.([...tags, name])
    setInputValue('')
  }

  const removeTag = (tag: string) => onChange?.(tags.filter(t => t !== tag))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setEditing(false)
      setInputValue('')
    }
  }

  if (!onChange && tags.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          background: 'rgba(167,139,250,0.11)',
          border: '1px solid rgba(167,139,250,0.28)',
          borderRadius: 5, padding: '1px 7px',
          fontSize: 11.5, color: '#a78bfa', fontWeight: 500,
        }}>
          #{tag}
          {onChange && (
            <button
              onClick={() => removeTag(tag)}
              title={`Remove tag "${tag}"`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(167,139,250,0.6)', padding: 0,
                display: 'flex', alignItems: 'center', marginLeft: 2,
              }}
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}

      {onChange && (
        editing ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue.trim()) addTag(inputValue); setEditing(false) }}
            placeholder="tag name…"
            autoFocus
            style={{
              border: '1px solid rgba(167,139,250,0.35)',
              borderRadius: 5, padding: '1px 7px', fontSize: 11.5,
              background: 'var(--surface)', color: 'var(--text)',
              outline: 'none', width: 90, minWidth: 0,
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Add a custom tag"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'none',
              border: '1px dashed rgba(167,139,250,0.28)',
              borderRadius: 5, padding: '1px 7px',
              fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer',
              fontWeight: 400,
            }}
          >
            <Plus size={9} /> tag
          </button>
        )
      )}
    </div>
  )
}
