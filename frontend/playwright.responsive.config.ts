/**
 * 跨端响应式测试配置 (Playwright)
 * 测试不同设备尺寸和断点下的页面表现
 */

import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir: './e2e/responsive',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', {open: 'never'}]],

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    // 定义多设备测试矩阵
    projects: [
        // 移动端设备
        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
                deviceScaleFactor: 2,
            },
        },
        {
            name: 'Mobile Safari',
            use: {...devices['iPhone 12']},
        },
        {
            name: 'Mobile Large',
            use: {
                ...devices['Pixel 5'],
                viewport: {width: 480, height: 800},
            },
        },

        // 平板设备
        {
            name: 'Tablet Portrait',
            use: {
                ...devices['iPad Mini'],
                viewport: {width: 768, height: 1024},
            },
        },
        {
            name: 'Tablet Landscape',
            use: {
                ...devices['iPad Mini'],
                viewport: {width: 1024, height: 768},
            },
        },

        // 桌面设备
        {
            name: 'Desktop Small',
            use: {
                ...devices['Desktop Chrome'],
                viewport: {width: 1024, height: 768},
            },
        },
        {
            name: 'Desktop Medium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: {width: 1440, height: 900},
            },
        },
        {
            name: 'Desktop Large',
            use: {
                ...devices['Desktop Chrome'],
                viewport: {width: 1920, height: 1080},
            },
        },

        // 超宽屏
        {
            name: 'Desktop XL',
            use: {
                ...devices['Desktop Chrome'],
                viewport: {width: 2560, height: 1440},
            },
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
