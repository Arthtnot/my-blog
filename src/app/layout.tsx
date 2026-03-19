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
        <main className="max-w-3xl mx-auto px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
