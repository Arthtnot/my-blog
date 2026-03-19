import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostMeta {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
}

export interface Post extends PostMeta {
  contentHtml: string
  readingTime: number // minutes
}

function calcReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export function getAllPostsMeta(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return []

  const fileNames = fs.readdirSync(postsDirectory)
  const allPosts = fileNames
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return {
        slug,
        title: data.title as string,
        date: data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : String(data.date),
        tags: (data.tags as string[]) || [],
        summary: (data.summary as string) || '',
      }
    })

  return allPosts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getAllTags(): string[] {
  const posts = getAllPostsMeta()
  const tagSet = new Set<string>()
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPostsMeta().filter((p) => p.tags.includes(tag))
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const fullPath = path.join(postsDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const processed = await remark()
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: 'github-light',
    })
    .use(rehypeStringify)
    .process(content)

  const contentHtml = processed.toString()

  return {
    slug,
    title: data.title as string,
    date: data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date),
    tags: (data.tags as string[]) || [],
    summary: (data.summary as string) || '',
    contentHtml,
    readingTime: calcReadingTime(content),
  }
}
