const postFiles = import.meta.glob('./posts/*.md', { query: '?raw', import: 'default', eager: true })

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)/)
  if (!match) return { data: {}, content: raw }
  const frontmatter = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let value = line.slice(colonIdx + 1).trim()
    // Parse arrays like ["a", "b"]
    if (value.startsWith('[')) {
      try { value = JSON.parse(value) } catch { /* keep as string */ }
    }
    // Strip surrounding quotes
    else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }
  return { data: frontmatter, content: match[2] }
}

export function getAllPosts() {
  const posts = Object.entries(postFiles).map(([filepath, raw]) => {
    const { data, content } = parseFrontmatter(raw)
    return { ...data, body: content }
  })
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getPostBySlug(slug) {
  return getAllPosts().find(post => post.slug === slug) || null
}
