/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            "files.edgestore.dev"
        ]
    },
    webpack: (config) => {
        const path = require('path');
        // Alias to import demo portraits from project assets
        config.resolve.alias['@assets'] = path.resolve(__dirname, '../assets');
        return config;
    }
}

module.exports = nextConfig
