import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/locations/ezymart-660-bourke-st',
        destination: '/locations/660-bourke-st',
        permanent: true,
      },
      {
        source: '/locations/ezymart-southern-cross-station',
        destination: '/locations/southern-cross-station',
        permanent: true,
      },
      {
        source: '/locations/ezymart-queen-street',
        destination: '/locations/341-queen-street',
        permanent: true,
      },
      {
        source: '/locations/luggage-terminal-520-bourke-street-cbd',
        destination: '/locations/520-bourke-st',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;