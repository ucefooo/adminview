import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zmrtzmvxjbbxxykbjnmu.supabase.co",
      },
    ],
  },
};

export default nextConfig;
