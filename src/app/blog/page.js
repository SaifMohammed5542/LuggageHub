import Link from 'next/link';
import './blog-list.css'; // optional CSS (see below)

const blogPosts = [
  {
    slug: 'luggage-storage-southern-cross',
    title: '🧳 Luggage Storage Near Southern Cross Station',
    excerpt: 'Discover convenient and secure luggage storage just minutes from Southern Cross Station...',
  },
  {
    slug: 'melbourne-airport',
    title: '✈️ Luggage Storage at Melbourne Airport',
    excerpt: 'Flying in or out of MEL? Here’s where to leave your bags and explore stress-free...',
  },
  {
    slug: 'melbourne-events-luggage-storage',
    title: '🏎️ Melbourne Events – Grand Prix, NYE, MCG & More',
    excerpt: 'Attending an event in Melbourne? Learn where to store your bags safely during...',
  },

  {
    slug: 'store-luggage-near-southern-cross',
    title: '👉 Book Luggage Storage Near Southern Cross',
    excerpt: 'Looking for luggage storage near Southern Cross Station...',
  },
  // Add more blogs here
];

export const metadata = {
  title: 'Travel Blogs | Luggage Terminal',
  description: 'Helpful travel guides, luggage storage tips, and local insights around Australia.',
};

export default function BlogListingPage() {
  return (
    <main className="blog-list-main">
      <h1 className="blog-list-title">📰 Travel & Luggage Tips</h1>
      <div className="blog-card-container">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="blog-card"
          >
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <span className="read-more">Read more →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
