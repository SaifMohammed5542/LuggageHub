// next-sitemap.config.js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.luggageterminal.com/', // **REQUIRED**: Replace with your actual domain
  generateRobotsTxt: true, // (optional)
  // ...other options
  // For dynamic routes, you might need to fetch them here
  // For example, if you have blog posts:
  // additionalPaths: async (config) => {
  //   const posts = await fetch('https://your-api.com/posts').then(res => res.json());
  //   return posts.map(post => ({
  //     loc: `/blog/${post.slug}`,
  //     lastmod: new Date(post.updatedAt).toISOString(),
  //     changefreq: 'weekly',
  //     priority: 0.7,
  //   }));
  // },
}