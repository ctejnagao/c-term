import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.2.202'],
  async redirects() {
    return [
      {
        source: '/pdf-import',
        destination: '/pdf-imports',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
