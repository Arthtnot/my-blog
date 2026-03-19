export const dynamic = 'force-static'

import { getAllPostsMeta } from '@/lib/posts'
import { Feed } from 'feed'

export function GET() {
  const posts = getAllPostsMeta()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-blog.vercel.app'

  const feed = new Feed({
    title: 'My Blog',
    description: '记录技术与思考',
    id: siteUrl,
    link: siteUrl,
    language: 'zh-CN',
    copyright: `© ${new Date().getFullYear()} My Blog`,
    updated: posts[0] ? new Date(posts[0].date) : new Date(),
  })

  posts.slice(0, 20).forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/posts/${post.slug}`,
      link: `${siteUrl}/posts/${post.slug}`,
      description: post.summary,
      date: new Date(post.date),
    })
  })

  return new Response(feed.rss2(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
