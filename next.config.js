/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
  },
  transpilePackages: ['rc-util', 'rc-picker', 'antd'],
};

module.exports = nextConfig;