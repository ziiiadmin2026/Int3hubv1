/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removido rewrites - ahora usamos API routes como proxy en pages/api/[...path].js
};

module.exports = nextConfig;
