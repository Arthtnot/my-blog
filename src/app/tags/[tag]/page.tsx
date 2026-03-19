import { getAllTags, getPostsByTag } from '@/lib/posts'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { tag: string }
}

export async function generateStaticParams() {
  const tags = getAllTags()
  return tags.map((tag) => ({ tag: encodeURIComponent(tag) }))
}

export default function TagPage({ params }: Props) {
  const tag = decodeURIComponent(params.tag)
  const posts = getPostsByTag(tag)
  if (posts.length === 0) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-sm text-gray-400 mb-2">
        <Link href="/" className="hover:text-gray-700">首页</Link>
        <span className="mx-2">→</span>
        <span>标签：{tag}</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-8">#{tag}</h1>

      <div className="space-y-3 pl-4 border-l-2 border-gray-100">
        {posts.map((post) => (
          <div key={post.slug} className="flex items-baseline gap-4">
            <span className="text-xs text-gray-300 min-w-[80px] font-mono">
              {post.date}
            </span>
            <Link
              href={`/posts/${post.slug}`}
              className="text-gray-800 hover:text-blue-600 transition-colors"
            >
              {post.title}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
