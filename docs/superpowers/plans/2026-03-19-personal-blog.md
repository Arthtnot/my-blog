# Personal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个极简风格的 Next.js 个人博客，支持 Markdown 写作、时间轴归档、标签筛选、全文搜索、RSS、评论和阅读进度条，部署至 Vercel。

**Architecture:** Next.js 14 App Router 静态生成。文章以 Markdown 文件存储在 `posts/`，构建时通过 `gray-matter` + `remark` 解析渲染为 HTML，`generateStaticParams` 预生成所有页面。搜索索引在构建时生成写入 `public/search-index.json`，客户端加载。评论使用 Giscus（GitHub Discussions）。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, gray-matter, remark, rehype, rehype-pretty-code, flexsearch, feed, Giscus

---

## 文件结构总览

| 文件路径 | 职责 |
|----------|------|
| `posts/*.md` | Markdown 文章内容 |
| `content/about.md` | 关于页内容 |
| `src/lib/posts.ts` | 文章读取、解析、排序、分类工具函数 |
| `src/lib/search.ts` | 构建时生成 flexsearch 索引并写入 `public/search-index.json` |
| `src/app/layout.tsx` | 全局布局（Header、ReadingProgress） |
| `src/app/globals.css` | 全局样式、Tailwind 配置 |
| `src/app/page.tsx` | 首页（时间轴 + 标签筛选） |
| `src/app/posts/[slug]/page.tsx` | 文章详情页（TOC + 评论） |
| `src/app/about/page.tsx` | 关于页 |
| `src/app/tags/[tag]/page.tsx` | 标签筛选页 |
| `src/app/api/feed.xml/route.ts` | RSS 输出（静态） |
| `src/components/Header.tsx` | 导航栏 + 搜索触发 |
| `src/components/Timeline.tsx` | 按年分组的文章列表（含标签过滤） |
| `src/components/TableOfContents.tsx` | 右侧浮动目录，IntersectionObserver 高亮 |
| `src/components/ReadingProgress.tsx` | 顶部阅读进度条 |
| `src/components/SearchModal.tsx` | 全文搜索弹窗 |
| `src/components/Comments.tsx` | Giscus 评论组件（懒加载） |

---

## Task 1: 初始化项目

**Files:**
- Create: `blogger/` (Next.js project root)
- Create: `posts/2026-03-19-hello-world.md` (示例文章)
- Create: `content/about.md`

- [ ] **Step 1: 创建 Next.js 项目**

```bash
cd /Users/admin/Documents
npx create-next-app@14 blogger \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-experimental-app
cd blogger
```

- [ ] **Step 2: 安装依赖**

```bash
npm install gray-matter remark remark-rehype rehype-stringify rehype-pretty-code shiki feed flexsearch
npm install -D @types/flexsearch
```

- [ ] **Step 3: 创建示例文章**

创建 `posts/2026-03-19-hello-world.md`：

```markdown
---
title: 你好，世界
date: 2026-03-19
tags: [随笔]
summary: 第一篇博客文章，关于为什么开始写博客。
---

## 为什么写博客

记录是一种思考的延伸。

## 关于这个博客

这里会有技术文章和个人随笔。

### 代码示例

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Blog!")
}
```

写作是思考的外化。
```

- [ ] **Step 4: 创建关于页内容**

创建 `content/about.md`：

```markdown
## 关于我

你好，我是一名软件工程师，热爱技术与阅读。

这个博客用于记录我的思考与学习，涵盖技术文章和个人随笔。

## 联系方式

- GitHub: [your-username](https://github.com/your-username)
- Email: your@email.com
```

- [ ] **Step 5: 验证项目启动**

```bash
npm run dev
```

打开 http://localhost:3000，确认 Next.js 默认页面正常显示。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js blog project with dependencies"
```

---

## Task 2: 实现文章读取库 (`lib/posts.ts`)

**Files:**
- Create: `src/lib/posts.ts`

- [ ] **Step 1: 创建 `src/lib/posts.ts`**

```typescript
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
```

- [ ] **Step 2: 验证无 TypeScript 错误**

```bash
npx tsc --noEmit
```

Expected: 无错误输出。

- [ ] **Step 3: Commit**

```bash
git add src/lib/posts.ts
git commit -m "feat: add posts library for markdown parsing"
```

---

## Task 3: 实现搜索索引构建 (`lib/search.ts` + build script)

**Files:**
- Create: `src/lib/search.ts`
- Modify: `package.json` (prebuild script)

- [ ] **Step 1: 创建 `src/lib/search.ts`**

```typescript
import fs from 'fs'
import path from 'path'
import { getAllPostsMeta } from './posts'

export interface SearchDoc {
  slug: string
  title: string
  tags: string[]
  summary: string
}

export function buildSearchIndex(): void {
  const posts = getAllPostsMeta()
  const docs: SearchDoc[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    tags: p.tags,
    summary: p.summary,
  }))

  const outputPath = path.join(process.cwd(), 'public', 'search-index.json')
  fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2), 'utf8')
  console.log(`Search index written: ${docs.length} posts`)
}
```

- [ ] **Step 2: 创建构建脚本 `scripts/build-search.ts`**

```typescript
// scripts/build-search.ts
import { buildSearchIndex } from '../src/lib/search'
buildSearchIndex()
```

- [ ] **Step 3: 安装 tsx 并在 `package.json` 中添加 prebuild 脚本**

```bash
npm install -D tsx
```

在 `package.json` 的 `scripts` 中添加：

```json
"prebuild": "tsx scripts/build-search.ts",
"predev": "tsx scripts/build-search.ts"
```

> `tsx` 可直接运行 `.ts` 文件，无需额外配置，比 `ts-node` 更简单可靠。

- [ ] **Step 4: 手动触发验证**

```bash
npx tsx scripts/build-search.ts
```

Expected: `public/search-index.json` 文件被创建，包含文章数组。

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts scripts/build-search.ts package.json
git commit -m "feat: add search index builder"
```

---

## Task 4: 全局样式与布局 (`globals.css`, `layout.tsx`)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ReadingProgress.tsx`
- Create: `src/components/Header.tsx`

- [ ] **Step 1: 更新 `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: Georgia, 'Noto Serif SC', serif;
    color: #1a1a1a;
    background: #ffffff;
  }

  body {
    line-height: 1.8;
  }

  /* Prose styles for article content */
  .prose h2 {
    @apply text-xl font-bold mt-10 mb-4 text-gray-900;
  }
  .prose h3 {
    @apply text-lg font-semibold mt-8 mb-3 text-gray-800;
  }
  .prose p {
    @apply mb-5 text-gray-700;
  }
  .prose a {
    @apply text-blue-600 hover:underline;
  }
  .prose ul {
    @apply list-disc list-inside mb-5 text-gray-700;
  }
  .prose ol {
    @apply list-decimal list-inside mb-5 text-gray-700;
  }
  .prose blockquote {
    @apply border-l-4 border-gray-300 pl-4 italic text-gray-600 my-6;
  }
  .prose pre {
    @apply rounded-md overflow-x-auto my-6 text-sm;
  }
  .prose code:not(pre code) {
    @apply bg-gray-100 rounded px-1 py-0.5 text-sm font-mono text-gray-800;
  }
}
```

- [ ] **Step 2: 创建 `src/components/ReadingProgress.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div
      className="fixed top-0 left-0 z-50 h-0.5 bg-blue-500 transition-all duration-100"
      style={{ width: `${progress}%` }}
    />
  )
}
```

- [ ] **Step 3: 创建 `src/components/Header.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SearchModal from './SearchModal'

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K / Ctrl+K to open search
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
```

- [ ] **Step 4: 更新 `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import ReadingProgress from '@/components/ReadingProgress'

export const metadata: Metadata = {
  title: 'My Blog',
  description: '记录技术与思考',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ReadingProgress />
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ReadingProgress.tsx src/components/Header.tsx
git commit -m "feat: add global styles, layout, header and reading progress"
```

---

## Task 5: 首页时间轴组件 (`Timeline.tsx` + `page.tsx`)

**Files:**
- Create: `src/components/Timeline.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 创建 `src/components/Timeline.tsx`**

```typescript
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
```

- [ ] **Step 2: 更新 `src/app/page.tsx`**

```typescript
import { getAllPostsMeta, getAllTags } from '@/lib/posts'
import Timeline from '@/components/Timeline'

export default function HomePage() {
  const posts = getAllPostsMeta()
  const allTags = getAllTags()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Blog</h1>
        <p className="text-gray-500">记录技术与思考</p>
      </div>
      <Timeline posts={posts} allTags={allTags} />
    </div>
  )
}
```

- [ ] **Step 3: 验证首页渲染**

```bash
npm run dev
```

访问 http://localhost:3000，确认：
- 显示文章时间轴
- 标签过滤按钮可点击
- 文章标题可点击跳转（会 404，下一任务实现）

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.tsx src/app/page.tsx
git commit -m "feat: add homepage with timeline and tag filter"
```

---

## Task 6: 文章详情页 (`TableOfContents.tsx` + `posts/[slug]/page.tsx`)

**Files:**
- Create: `src/components/TableOfContents.tsx`
- Create: `src/app/posts/[slug]/page.tsx`

- [ ] **Step 1: 创建 `src/components/TableOfContents.tsx`**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  headings: Heading[]
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -60% 0px' }
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.current?.observe(el)
    })

    return () => observer.current?.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="hidden lg:block sticky top-24 w-52 shrink-0 text-sm">
      <div className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-4">
        目录
      </div>
      <ul className="space-y-2">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? '12px' : '0' }}>
            <a
              href={`#${h.id}`}
              className={`block transition-colors hover:text-blue-600 ${
                activeId === h.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: 创建 `src/app/posts/[slug]/page.tsx`**

```typescript
import { getAllPostsMeta, getPostBySlug } from '@/lib/posts'
import TableOfContents from '@/components/TableOfContents'
import Comments from '@/components/Comments'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

function extractHeadings(html: string) {
  const matches = [...html.matchAll(/<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/g)]
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
```

> **注意：** `rehype-pretty-code` 需要为标题元素添加 `id` 属性才能使 TOC 正常工作。在 `lib/posts.ts` 中添加 `rehype-slug` 插件（`npm install rehype-slug`），并在 `remark().use(remarkRehype).use(rehypeSlug).use(rehypePrettyCode)...` 中加入。

- [ ] **Step 3: 安装 rehype-slug**

```bash
npm install rehype-slug
```

在 `src/lib/posts.ts` 中，在 `remarkRehype` 后添加 `rehypeSlug`：

```typescript
import rehypeSlug from 'rehype-slug'
// ...
const processed = await remark()
  .use(remarkRehype)
  .use(rehypeSlug)       // ← 添加这行
  .use(rehypePrettyCode, { theme: 'github-light' })
  .use(rehypeStringify)
  .process(content)
```

- [ ] **Step 4: 验证文章详情页**

```bash
npm run dev
```

访问 http://localhost:3000/posts/2026-03-19-hello-world，确认：
- 标题、日期、标签正常显示
- 正文 Markdown 渲染正确，代码有语法高亮
- 右侧目录显示（需要 h2/h3 标题）
- 上一篇/下一篇导航

- [ ] **Step 5: Commit**

```bash
git add src/components/TableOfContents.tsx src/app/posts/ src/lib/posts.ts package.json package-lock.json
git commit -m "feat: add post detail page with TOC and prev/next navigation"
```

---

## Task 7: 搜索弹窗 (`SearchModal.tsx`)

**Files:**
- Create: `src/components/SearchModal.tsx`

- [ ] **Step 1: 创建 `src/components/SearchModal.tsx`**

```typescript
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
      .catch(() => {})
    inputRef.current?.focus()
  }, [])

  // Cmd+K / Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
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
```

- [ ] **Step 2: 验证搜索功能**

先生成搜索索引：

```bash
npx tsx scripts/build-search.ts
npm run dev
```

点击 Header 中的搜索图标，确认：
- 弹窗打开，输入框自动聚焦
- 输入关键词后显示匹配文章
- 点击结果跳转文章页
- ESC 或点击遮罩关闭弹窗
- Cmd+K 触发（在 Header 中已绑定）

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchModal.tsx
git commit -m "feat: add search modal with client-side filtering"
```

---

## Task 8: 评论组件 (`Comments.tsx`)

**Files:**
- Create: `src/components/Comments.tsx`

- [ ] **Step 1: 准备 Giscus 配置**

访问 https://giscus.app/ ，按照说明：
1. 将你的 GitHub 仓库设为 Public
2. 在仓库 Settings → Features 开启 Discussions
3. 安装 Giscus App：https://github.com/apps/giscus
4. 在 giscus.app 填入仓库名，获取配置参数（`data-repo`、`data-repo-id`、`data-category-id`）

- [ ] **Step 2: 创建 `src/components/Comments.tsx`**

将 Giscus 参数通过环境变量注入，避免硬编码到源码中。在 `.env.local` 中添加（本地开发），在 Vercel 控制台设置（生产）：

```bash
NEXT_PUBLIC_GISCUS_REPO=your-username/your-repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxxxxxxxx
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxxxxx
```

```typescript
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
```

- [ ] **Step 3: 验证评论区加载**

```bash
npm run dev
```

访问文章详情页，滚动到底部，确认 Giscus 评论框加载（需要配置真实的仓库信息才能完整工作）。

- [ ] **Step 4: Commit**

```bash
git add src/components/Comments.tsx
git commit -m "feat: add Giscus comments with lazy loading"
```

---

## Task 9: 关于页 + 标签页 + RSS

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/tags/[tag]/page.tsx`
- Create: `src/app/api/feed.xml/route.ts`

- [ ] **Step 1: 创建关于页 `src/app/about/page.tsx`**

```typescript
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import fs from 'fs'
import path from 'path'

async function getAboutContent(): Promise<string> {
  const filePath = path.join(process.cwd(), 'content', 'about.md')
  const content = fs.readFileSync(filePath, 'utf8')
  const processed = await remark()
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(content)
  return processed.toString()
}

export default async function AboutPage() {
  const contentHtml = await getAboutContent()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">关于</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  )
}
```

- [ ] **Step 2: 创建标签页 `src/app/tags/[tag]/page.tsx`**

```typescript
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
```

- [ ] **Step 3: 创建 RSS Route `src/app/api/feed.xml/route.ts`**

```typescript
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
```

- [ ] **Step 4: 验证三个页面**

```bash
npm run dev
```

- http://localhost:3000/about — 关于页内容
- http://localhost:3000/tags/随笔 — 标签筛选列表
- http://localhost:3000/api/feed.xml — RSS XML 输出

- [ ] **Step 5: Commit**

```bash
git add src/app/about/ src/app/tags/ src/app/api/
git commit -m "feat: add about page, tag page, and RSS feed"
```

---

## Task 10: 全量构建验证与部署准备

**Files:**
- Create: `.env.local` (本地环境变量，不提交)

- [ ] **Step 1: 生成搜索索引并执行完整构建**

```bash
npx tsx scripts/build-search.ts
npm run build
```

Expected: 构建成功，无错误。输出应包含所有页面的静态生成日志。

- [ ] **Step 2: 本地预览生产构建**

```bash
npm run start
```

访问 http://localhost:3000，验证所有功能正常。

- [ ] **Step 3: 创建 `.env.local.example`**

```bash
# 博客站点 URL（用于 RSS 绝对链接）
NEXT_PUBLIC_SITE_URL=https://your-blog.vercel.app
```

- [ ] **Step 4: 确认 `.gitignore` 包含敏感文件**

确认 `.gitignore` 中包含：
```
.env.local
.env*.local
```

- [ ] **Step 5: 部署至 Vercel**

```bash
# 安装 Vercel CLI（如未安装）
npm i -g vercel

# 登录并部署
vercel

# 按提示选择：
# - Link to existing project? → No
# - Project name → my-blog（自定义）
# - Which directory? → ./
# - Override settings? → No
```

在 Vercel 控制台设置环境变量 `NEXT_PUBLIC_SITE_URL` 为你的实际域名。

- [ ] **Step 6: 验证线上部署**

访问 Vercel 分配的 URL，确认：
- 首页文章时间轴正常
- 文章详情页、目录、进度条正常
- 搜索弹窗正常（需确认 `search-index.json` 在构建时生成）
- RSS 地址可访问

- [ ] **Step 7: Final commit**

```bash
git add .env.local.example
git commit -m "feat: add env example and complete blog implementation"
```

---

## 完成标准

- [ ] 所有页面在 `npm run build` 后无错误静态生成
- [ ] 首页时间轴 + 标签过滤正常
- [ ] 文章详情页 Markdown 渲染、代码高亮、TOC 高亮、阅读进度条正常
- [ ] 搜索弹窗可搜索文章
- [ ] RSS `/api/feed.xml` 输出正确 XML
- [ ] 关于页、标签页正常
- [ ] Vercel 部署成功，线上可访问
