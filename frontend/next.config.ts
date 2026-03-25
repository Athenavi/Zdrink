import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    // API 路由重写（代理到 Django）
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
            },
        ];
    },

    // 图片域名配置
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: '**.yourdomain.com',
                pathname: '/media/**',
            },
        ],
        // 图片优化配置
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // 生产环境优化
    productionBrowserSourceMaps: process.env.GENERATE_SOURCEMAPS === 'true', // 可通过环境变量控制

    // React 严格模式（开发环境）
    reactStrictMode: process.env.NODE_ENV === 'development',

    // 输出配置
    output: process.env.CAPACITOR ? undefined : 'standalone', // Capacitor 不需要 standalone

    // 静态导出支持（用于 Capacitor）
    distDir: process.env.CAPACITOR ? '.next/out' : '.next',

    // 禁用静态导出时的图片优化（Capacitor 需要）
    skipTrailingSlashRedirect: process.env.CAPACITOR ? true : false,

    // 实验性功能
    experimental: {
        optimizePackageImports: ['lucide-react', 'clsx', 'class-variance-authority'],
    },

    // Turbopack 配置（Next.js 16+ 默认使用 Turbopack）
    turbopack: {},

    // Webpack 配置
    webpack(config, {isServer, dev}) {
        // 添加性能优化
        if (!isServer && !dev) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        // 分离 vendor 包
                        vendors: {
                            test: /[\\/]node_modules[\/]/,
                            name: 'vendors',
                            priority: -10,
                        },
                        // 分离常用包
                        common: {
                            name: 'common',
                            minChunks: 2,
                            priority: -20,
                            reuseExistingChunk: true,
                        },
                        // 分离框架包
                        framework: {
                            test: /[\\/]node_modules[\/](react|react-dom|next)[\/]/,
                            name: 'framework',
                            priority: 10,
                        },
                    },
                },
            };
        }

        return config;
    },

    // 安全头配置
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
