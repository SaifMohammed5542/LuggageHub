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
    const opts = {
      bufferCommands: false,
      // Harden against DNS / server selection stalls
      serverSelectionTimeoutMS: 8000, // fail fast if cluster not reachable
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      // ssl is implied with mongodb+srv, keeping explicit is fine:
      ssl: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
