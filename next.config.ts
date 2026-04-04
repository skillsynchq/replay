import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/t/:slug",
          has: [
            {
              type: "header",
              key: "accept",
              value: "(.*)text/markdown(.*)",
            },
          ],
          destination: "/t/:slug/llms.txt",
        },
      ],
    };
  },
};

export default nextConfig;
