// app/api/blog/list/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

export async function GET() {
  try {
    await dbConnect();
    const blogs = await Blog.find({ published: true })
      .sort({ publishedAt: -1 })
      .select('slug title excerpt category targetSuburb readTime coverImage publishedAt')
      .lean();

    return NextResponse.json({ blogs });
  } catch (error) {
    return NextResponse.json({ blogs: [], error: error.message }, { status: 500 });
  }
}