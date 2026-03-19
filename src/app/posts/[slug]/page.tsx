import { getAllPostsMeta, getPostBySlug } from '@/lib/posts'
import TableOfContents from '@/components/TableOfContents'
import Comments from '@/components/Comments'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

function extractHeadings(html: string) {
  const matches = Array.from(html.matchAll(/<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/g))
  return matches.map((m) => ({
    level: Number(m[1]),
    id: m[2],
    text: m[3].replace(/<[^>]+>/g, ''),
  }))
}

export async function generateStaticParams() {
  const posts = getAllPostsMeta()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const post = await getPostBySlug(params.slug).catch(() => null)
  if (!post) return {}
  return { title: post.title, description: post.summary }
}

export default async function PostPage({ params }: Props) {
  let post
  try {
    post = await getPostBySlug(params.slug)
  } catch {
    notFound()
  }

  const allPosts = getAllPostsMeta()
  const currentIndex = allPosts.findIndex((p) => p.slug === params.slug)
  const prev = allPosts[currentIndex + 1] || null
  const next = allPosts[currentIndex - 1] || null
  const headings = extractHeadings(post.contentHtml)

  return (
    <div className="flex gap-12">
      <article className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-400 mb-3">
            {post.date} · {post.readingTime} 分钟阅读
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="text-xs text-blue-600 hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>

        <hr className="border-gray-100 mb-8" />

        {/* Content */}
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <hr className="border-gray-100 my-10" />

        {/* Prev / Next */}
        <div className="flex justify-between text-sm text-gray-400">
          {prev ? (
            <Link href={`/posts/${prev.slug}`} className="hover:text-gray-700 transition-colors">
              ← {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/posts/${next.slug}`} className="hover:text-gray-700 transition-colors">
              {next.title} →
            </Link>
          ) : <span />}
        </div>

        <div className="mt-12">
          <Comments />
        </div>
      </article>

      <TableOfContents headings={headings} />
    </div>
  )
}
