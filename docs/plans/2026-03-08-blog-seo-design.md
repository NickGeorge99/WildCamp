# WildCamp SEO Blog — Design

## Goal
SEO blog on `wildcamp.nickwontquit.com/blog` that drives organic traffic and funnels users to sign up and use WildCamp.

## Architecture
- Markdown files in `/blog/posts/` directory (e.g. `best-blm-camping-utah.md`)
- Vite plugin to parse markdown at build time
- React routes: `/blog` (index) and `/blog/:slug` (individual post)
- Frontmatter in each `.md` for title, description, date, tags, hero image, and meta tags

## Pages
- **Blog index** (`/blog`) — grid of post cards matching WildCamp's card style, sorted by date
- **Post page** (`/blog/:slug`) — full article with hero image, rendered markdown, and a CTA at the bottom ("Find spots like these on WildCamp" linking to the map/signup)

## SEO
- Each post gets its own `<title>`, `<meta description>`, and Open Graph tags from frontmatter
- Clean URLs (`/blog/best-blm-camping-utah`)
- Structured data (Article schema) for rich search results

## Seed Posts (5)
1. "Best Free Dispersed Camping in Utah"
2. "How to Find BLM Land for Camping"
3. "Dispersed Camping 101: A Beginner's Guide"
4. "Top National Forest Camping Spots in Colorado"
5. "Leave No Trace: The Dispersed Camper's Checklist"

## CTA Strategy
Every post ends with a WildCamp callout card — "Explore these spots on the map" button linking to the app with relevant filters.

## Style
Matches WildCamp's existing design — same colors, typography, map/outdoor aesthetic.
