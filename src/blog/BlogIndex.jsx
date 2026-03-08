import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { getAllPosts } from './loadPosts'

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Helmet>
        <title>WildCamp Blog — Free Dispersed Camping Guides</title>
        <meta
          name="description"
          content="Guides, tips, and resources for free dispersed camping on public land across the United States."
        />
      </Helmet>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
        >
          &larr; Back to Map
        </Link>
        <h1 className="text-4xl font-bold mt-4">WildCamp Blog</h1>
        <p className="text-gray-400 mt-2 text-lg">
          Guides, tips, and resources for free dispersed camping.
        </p>
      </header>

      {/* Card Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-orange-500 hover:-translate-y-1 transition-all duration-200"
            >
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm mb-4">{post.description}</p>
              <time className="text-gray-500 text-xs">
                {new Date(post.date + 'T00:00:00').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-700 text-orange-500 text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
