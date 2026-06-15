/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**', // add whatever source to be allowed here. for now ** is used for local server testing
      },
    ],
  },
};

export default nextConfig;
