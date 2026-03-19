'use client'

import { useEffect, useRef } from 'react'

export default function Comments() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const script = document.createElement('script')
          script.src = 'https://giscus.app/client.js'
          script.setAttribute('data-repo', process.env.NEXT_PUBLIC_GISCUS_REPO || '')
          script.setAttribute('data-repo-id', process.env.NEXT_PUBLIC_GISCUS_REPO_ID || '')
          script.setAttribute('data-category', 'Announcements')
          script.setAttribute('data-category-id', process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || '')
          script.setAttribute('data-mapping', 'pathname')
          script.setAttribute('data-strict', '0')
          script.setAttribute('data-reactions-enabled', '1')
          script.setAttribute('data-emit-metadata', '0')
          script.setAttribute('data-input-position', 'top')
          script.setAttribute('data-theme', 'light')
          script.setAttribute('data-lang', 'zh-CN')
          script.crossOrigin = 'anonymous'
          script.async = true
          ref.current?.appendChild(script)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      <div className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-6">
        评论
      </div>
      <div ref={ref} />
    </div>
  )
}
