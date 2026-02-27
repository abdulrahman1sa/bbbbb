/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.telesco.pe',
            }
        ],
    },
};

module.exports = nextConfig;
