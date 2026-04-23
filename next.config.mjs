/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/fran',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/fran',
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
};

export default nextConfig;
