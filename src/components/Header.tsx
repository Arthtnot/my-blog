'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SearchModal from './SearchModal'

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K / Ctrl+K: open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
            My Blog
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">文章</Link>
            <Link href="/about" className="hover:text-gray-900 transition-colors">关于</Link>
            <button
              onClick={() => setSearchOpen(true)}
              className="hover:text-gray-900 transition-colors"
              aria-label="搜索 (Cmd+K)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </nav>
        </div>
      </header>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  )
}
