'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 250}px, ${e.clientY - 250}px)`
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      ref={glowRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147,197,253,0.10) 0%, transparent 68%)',
        pointerEvents: 'none',
        zIndex: 1,
        willChange: 'transform',
        transition: 'transform 0.18s ease-out',
      }}
    />
  )
}
