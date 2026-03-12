// app/blog/page.js
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from './blog.module.css';

const CATEGORY_LABELS = {
  'storage-keywords': '🧳 Luggage Storage',
  'activity-guides':  '🗺️ Activity Guides',
  'suburb-guides':    '📍 Suburb Guides',
  'awareness':        '💡 Tips & Info',
};

async function getBlogs() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.luggageterminal.com'}/api/blog/list`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return data.blogs || [];
  } catch { return []; }
}

export const metadata = {
  title: 'Travel Guides & Luggage Storage Tips | Luggage Terminal',
  description: 'Helpful travel guides, luggage storage tips, and local insights for exploring Melbourne hands-free.',
  alternates: { canonical: 'https://www.luggageterminal.com/blog' },
};

export default async function BlogListingPage({ searchParams }) {
  const blogs = await getBlogs();
  const activeCategory = searchParams?.category || 'all';

  const filtered = activeCategory === 'all'
    ? blogs
    : blogs.filter(b => b.category === activeCategory);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];

  return (
    <>
      <Header />
      <main className={styles.listMain}>
        {/* Hero */}
        <section className={styles.listHero}>
          <h1 className={styles.listTitle}>Travel Guides & Tips</h1>
          <p className={styles.listSubtitle}>
            Explore Melbourne hands-free — storage tips, local guides, and itineraries.
          </p>
        </section>

        {/* Category filters */}
        <div className={styles.filterRow}>
          {categories.map(cat => (
            <Link
              key={cat}
              href={cat === 'all' ? '/blog' : `/blog?category=${cat}`}
              className={`${styles.filterChip} ${activeCategory === cat ? styles.filterChipActive : ''}`}
            >
              {cat === 'all' ? '✨ All Posts' : CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {/* Blog grid */}
        <div className={styles.listInner}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No posts yet — check back soon!</p>
          ) : (
            <div className={styles.grid}>
              {filtered.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className={styles.card}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  {post.coverImage && (
                    <div className={styles.cardImg}>
                      <img src={post.coverImage} alt={post.title} />
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardCategory}>
                        {CATEGORY_LABELS[post.category] || '💡 Tips'}
                      </span>
                      <span className={styles.cardRead}>☕ {post.readTime || 3} min read</span>
                    </div>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                    <span className={styles.readMore}>Read more →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}