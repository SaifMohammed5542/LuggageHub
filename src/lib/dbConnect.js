import mongoose from "mongoose";
import dns from "dns";

// Prefer IPv4 first to avoid SRV/IPv6 DNS hiccups on some hosts
// Requires Node 18+: or set NODE_OPTIONS=--dns-result-order=ipv4first in env
dns.setDefaultResultOrder("ipv4first");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// Reuse connection across hot reloads in dev and across route calls in prod
let cached = globalThis.mongoose;
if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

export default async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const isVercel = process.env.VERCEL === "1";
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: isVercel ? 5000 : 10000,
      connectTimeoutMS: isVercel ? 5000 : 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      ssl: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m).catch((err) => {
      cached.promise = null; // allow retry on next request
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
