import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getPostBySlug } from './loadPosts'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPostBySlug(slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
        <p className="text-gray-400 mb-6">
          The blog post you are looking for does not exist.
        </p>
        <Link
          to="/blog"
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Back to Blog
        </Link>
      </div>
    )
  }

  const formattedDate = new Date(post.date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: 'WildCamp',
    },
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Helmet>
        <title>{post.title} — WildCamp Blog</title>
        <meta name="description" content={post.description} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          to="/blog"
          className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
        >
          &larr; Back to Blog
        </Link>

        {/* Title */}
        <h1 className="text-4xl font-bold mt-6 mb-4">{post.title}</h1>

        {/* Date and tags */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <time className="text-gray-500 text-sm">{formattedDate}</time>
          {post.tags &&
            post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-700 text-orange-500 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
        </div>

        {/* Markdown content */}
        <div className="blog-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body}
          </ReactMarkdown>
        </div>

        {/* CTA Card */}
        <div className="mt-12 bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="w-12 h-1 bg-orange-500 mx-auto mb-6 rounded-full" />
          <h2 className="text-2xl font-bold mb-3">
            Explore Free Camping Spots
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Use WildCamp's interactive map to discover free dispersed camping
            spots on BLM land, national forests, and more across the United
            States.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Open the Map
          </Link>
        </div>
      </article>
    </div>
  )
}
