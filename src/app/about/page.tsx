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
