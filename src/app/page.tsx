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
