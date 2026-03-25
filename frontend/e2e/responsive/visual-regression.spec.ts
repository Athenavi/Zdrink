/**
 * 视觉回归测试 - 截图对比
 * 检测 UI 在不同设备上的视觉差异
 */

import {expect, test} from '@playwright/test';

test.describe('视觉回归测试', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/home');
    });

    test('首页应该在移动端显示正确', async ({page}, testInfo) => {
        // 设置移动端视口
        await page.setViewportSize({width: 375, height: 812});

        // 等待页面稳定
        await page.waitForLoadState('networkidle');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 全屏截图
        await expect(page).toHaveScreenshot('mobile-home.png', {
            fullPage: true,
            maxDiffPixels: 100, // 允许的最大差异像素数
        });
    });

    test('首页应该在平板端显示正确', async ({page}, testInfo) => {
        await page.setViewportSize({width: 768, height: 1024});

        await page.waitForLoadState('networkidle');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await expect(page).toHaveScreenshot('tablet-home.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('首页应该在桌面端显示正确', async ({page}, testInfo) => {
        await page.setViewportSize({width: 1440, height: 900});

        await page.waitForLoadState('networkidle');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await expect(page).toHaveScreenshot('desktop-home.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });

    test('登录页面视觉回归', async ({page}) => {
        await page.goto('/auth/login');

        // 移动端
        await page.setViewportSize({width: 375, height: 667});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('mobile-login.png', {
            fullPage: true,
        });

        // 桌面端
        await page.setViewportSize({width: 1440, height: 900});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('desktop-login.png', {
            fullPage: true,
        });
    });

    test('商品详情页视觉回归', async ({page}) => {
        await page.goto('/products/1');

        await page.setViewportSize({width: 375, height: 812});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('mobile-product-detail.png', {
            fullPage: true,
        });

        await page.setViewportSize({width: 1440, height: 900});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('desktop-product-detail.png', {
            fullPage: true,
        });
    });

    test('购物车视觉回归', async ({page}) => {
        await page.goto('/cart');

        await page.setViewportSize({width: 375, height: 812});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('mobile-cart.png', {
            fullPage: true,
        });

        await page.setViewportSize({width: 1440, height: 900});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('desktop-cart.png', {
            fullPage: true,
        });
    });

    test('个人中心视觉回归', async ({page}) => {
        await page.goto('/profile');

        await page.setViewportSize({width: 375, height: 812});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('mobile-profile.png', {
            fullPage: true,
        });

        await page.setViewportSize({width: 1440, height: 900});
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('desktop-profile.png', {
            fullPage: true,
        });
    });
});
