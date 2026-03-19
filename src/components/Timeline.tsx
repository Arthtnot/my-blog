'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PostMeta } from '@/lib/posts'

interface TimelineProps {
  posts: PostMeta[]
  allTags: string[]
}

export default function Timeline({ posts, allTags }: TimelineProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts

  // Group by year
  const byYear = filtered.reduce<Record<string, PostMeta[]>>((acc, post) => {
    const year = post.date.slice(0, 4)
    if (!acc[year]) acc[year] = []
    acc[year].push(post)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div>
      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeTag === null
                ? 'bg-gray-900 text-white border-gray-900'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {years.length === 0 ? (
        <p className="text-gray-400 text-sm">暂无文章</p>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <div key={year}>
              <div className="text-xs font-bold text-gray-300 tracking-widest mb-4 uppercase">
                {year}
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                {byYear[year].map((post) => (
                  <div key={post.slug} className="flex items-baseline gap-4">
                    <span className="text-xs text-gray-300 min-w-[40px] font-mono">
                      {post.date.slice(5)}
                    </span>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-gray-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
