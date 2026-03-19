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
        <main className="w-full lg:w-[80vw] mx-auto px-6 py-10 relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
