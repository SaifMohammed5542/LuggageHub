// models/Blog.js
import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
  },
  // Full HTML or markdown content — store as HTML string
  content: {
    type: String,
    required: true,
  },
  // Category for filtering
  category: {
    type: String,
    enum: ['storage-keywords', 'activity-guides', 'suburb-guides', 'awareness'],
    default: 'awareness',
  },
  // Target suburb for smart CTA — e.g. "southbank", "fitzroy", "cbd"
  // Leave null/empty for non-suburb posts — will show all stations instead
  targetSuburb: {
    type: String,
    default: null,
    trim: true,
  },
  // Suburb center coords for distance calculation
  // If null, we calculate from stations in that suburb
  suburbLat: { type: Number, default: null },
  suburbLon: { type: Number, default: null },

  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
  },
  published: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  // Optional: featured image URL
  coverImage: {
    type: String,
    default: null,
  },
  // Read time in minutes (auto-calculated or set manually)
  readTime: {
    type: Number,
    default: 3,
  },
}, {
  timestamps: true, // adds createdAt and updatedAt automatically
});

const Blog = mongoose.models.Blog || mongoose.model('Blog', BlogSchema);

export default Blog;