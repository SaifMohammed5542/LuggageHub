// app/api/blog/[slug]/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const blog = await Blog.findOne({ slug, published: true }).lean();

    if (!blog) {
      return NextResponse.json({ blog: null }, { status: 404 });
    }

    return NextResponse.json({ blog });
  } catch (error) {
    return NextResponse.json({ blog: null, error: error.message }, { status: 500 });
  }
}