import matter from 'gray-matter'

const postFiles = import.meta.glob('./posts/*.md', { query: '?raw', import: 'default', eager: true })

export function getAllPosts() {
  const posts = Object.entries(postFiles).map(([filepath, content]) => {
    const { data, content: body } = matter(content)
    return { ...data, body }
  })
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getPostBySlug(slug) {
  return getAllPosts().find(post => post.slug === slug) || null
}
