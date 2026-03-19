'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { SearchDoc } from '@/lib/search'

interface SearchModalProps {
  onClose: () => void
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchDoc[]>([])
  const [docs, setDocs] = useState<SearchDoc[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load index on mount
  useEffect(() => {
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((data: SearchDoc[]) => setDocs(data))
      .catch((err) => console.error('Failed to load search index:', err))
    inputRef.current?.focus()
  }, [])

  // Cmd+K / Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Simple client-side search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const q = query.toLowerCase()
    const matched = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    )
    setResults(matched.slice(0, 8))
  }, [query, docs])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-4">
          <svg className="text-gray-400 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章..."
            className="flex-1 px-3 py-4 text-sm outline-none"
          />
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
            ESC
          </button>
        </div>

        {results.length > 0 && (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {results.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/posts/${r.slug}`}
                  onClick={onClose}
                  className="flex flex-col px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{r.title}</span>
                  {r.summary && (
                    <span className="text-xs text-gray-400 mt-0.5 truncate">{r.summary}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            没有找到 "{query}" 相关文章
          </div>
        )}
      </div>
    </div>
  )
}
