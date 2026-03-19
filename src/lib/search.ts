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
