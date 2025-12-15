/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '9000',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/**',
            },
        ],
    },
};

module.exports = nextConfig;
