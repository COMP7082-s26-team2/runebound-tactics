import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@runebound-tactics/shared"],
    output: "export",      // Forces Next.js to generate flat HTML/CSS/JS files
    images: {
        unoptimized: true, // Required because static exports don't have an image optimization server
    },
    // Forces Next.js to drop back to Webpack for production compilation, bypassing Turbopack bugs
    bundler: "webpack", 
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
