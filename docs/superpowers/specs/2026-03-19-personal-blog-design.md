# 个人博客网站设计文档

**日期：** 2026-03-19
**技术栈：** Next.js + Markdown + Vercel

---

## 一、项目概述

一个极简风格的个人博客网站，以文字为核心。内容为技术文章与个人随笔混合，主要用于个人知识沉淀与记录。通过 Markdown 文件管理内容，Git 版本控制，部署至 Vercel 静态托管。

---

## 二、技术架构

### 技术选型

| 技术 | 用途 |
|------|------|
| Next.js 14（App Router） | 框架，静态生成 |
| TypeScript | 类型安全 |
| Tailwind CSS | 样式 |
| gray-matter | 解析 Markdown frontmatter |
| remark + rehype + rehype-pretty-code | Markdown 渲染 + 代码语法高亮（基于 shiki） |
| flexsearch | 客户端全文搜索索引 |
| feed | 生成 RSS |
| Giscus | 基于 GitHub Discussions 的评论系统 |

### 项目结构

```
blogger/
├── posts/                        # Markdown 文章
│   └── YYYY-MM-DD-slug.md
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页（时间轴）
│   │   ├── posts/[slug]/
│   │   │   └── page.tsx          # 文章详情页
│   │   ├── about/
│   │   │   └── page.tsx          # 关于页
│   │   ├── tags/[tag]/
│   │   │   └── page.tsx          # 标签筛选页
│   │   └── api/feed.xml/
│   │       └── route.ts          # RSS 输出
│   ├── components/
│   │   ├── Header.tsx            # 导航栏
│   │   ├── Timeline.tsx          # 时间轴文章列表
│   │   ├── TableOfContents.tsx   # 右侧浮动目录
│   │   ├── ReadingProgress.tsx   # 顶部阅读进度条
│   │   ├── SearchModal.tsx       # 全文搜索弹窗
│   │   └── Comments.tsx          # Giscus 评论组件
│   └── lib/
│       ├── posts.ts              # 文章读取与解析
│       └── search.ts             # 搜索索引构建
├── content/
│   └── about.md                  # 关于页内容
└── public/
```

---

## 三、页面设计

### 3.1 首页 `/`

**布局：** 时间轴归档，按年份分组

**内容：**
- 顶部：博客名称 + 简短介绍（一句话）
- 标签筛选栏：显示所有标签，点击过滤
- 文章列表：按年分组，每条显示 `MM-DD 文章标题`，右侧显示标签
- 点击文章标题跳转详情页

**交互：**
- 标签筛选为前端过滤，无需跳转页面
- 无分页，全部文章一次展示（适合早期内容量少）

### 3.2 文章详情页 `/posts/[slug]`

**布局：** 正文居中 + 右侧浮动目录

**内容：**
- 顶部：阅读进度条（页面最顶端，细线条）
- 文章头部：标题、日期、标签、预计阅读时长
- 正文：Markdown 渲染，代码块语法高亮
- 右侧：目录（TOC），滚动时高亮当前章节，在小屏幕上隐藏
- 底部：上一篇 / 下一篇导航
- 底部：Giscus 评论区

### 3.3 关于页 `/about`

- 单栏居中布局
- 内容来自 `content/about.md`，支持 Markdown

### 3.4 标签页 `/tags/[tag]`

- 显示该标签下所有文章的时间轴列表
- 面包屑导航：首页 → 标签：[tag]

### 3.5 RSS `/api/feed.xml`

- 构建时通过 Next.js Route Handler 生成
- 包含最近 20 篇文章的标题、摘要、链接

---

## 四、组件设计

### Header

- 左侧：博客名称（链接到首页）
- 右侧：文章、关于、搜索图标
- 搜索图标点击打开 SearchModal

### TableOfContents

- 解析文章 HTML 中的 h2/h3 标签生成目录
- 使用 IntersectionObserver 监听章节进入视口，高亮当前章节
- 宽度固定，`position: sticky` 跟随滚动
- 在 `lg` 断点以下隐藏

### ReadingProgress

- `position: fixed`，页面最顶部
- 监听 `window.scrollY` 计算阅读进度百分比
- 极细线条（2px），颜色为主题色

### SearchModal

- 快捷键 `Cmd+K` / `Ctrl+K` 触发
- 构建时在 `lib/search.ts` 中生成 flexsearch 索引数据，序列化为 `public/search-index.json`，客户端启动时 fetch 加载
- 索引覆盖标题、标签、正文摘要
- 实时搜索，结果高亮匹配词

### Comments（Giscus）

- 懒加载，滚动到评论区再初始化
- 需配置：GitHub 仓库名、Discussions category

---

## 五、Markdown 文章格式

```yaml
---
title: 文章标题
date: 2024-03-15
tags: [Go, 并发]
summary: 一句话摘要，用于首页列表和 RSS
---

正文内容...
```

**文件命名规范：** `YYYY-MM-DD-url-slug.md`

---

## 六、数据流

```
posts/*.md
  → gray-matter 解析 frontmatter + 正文
  → remark 将 Markdown 转换为 HTML
  → Next.js generateStaticParams 构建时生成所有静态页
  → flexsearch 索引构建，打包进客户端 JS
  → Vercel 托管静态文件
```

构建产物全为静态文件，无运行时服务器依赖。

---

## 七、部署

- **平台：** Vercel（免费 Hobby 计划）
- **流程：** 推送到 GitHub main 分支 → Vercel 自动触发构建部署
- **自定义域名：** 可选，在 Vercel 控制台配置
- **RSS 静态化：** `/api/feed.xml` Route Handler 需添加 `export const dynamic = 'force-static'`，确保构建时预渲染为静态文件而非运行时 Server Function

---

## 八、设计风格

- **字体：** 正文使用衬线字体（Georgia 或 Noto Serif SC），代码使用等宽字体
- **配色：** 白底黑字，极少装饰色（仅用于链接、标签、进度条）
- **间距：** 大量留白，行高 1.8
- **响应式：** 移动端隐藏右侧目录，其余布局自适应

---

## 九、后续可扩展

以下功能暂不实现，未来可按需添加：
- 文章阅读量统计（Umami / Plausible）
- 暗色模式
- 多语言支持
- 文章系列（Series）分组
