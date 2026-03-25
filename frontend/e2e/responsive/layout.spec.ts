/**
 * 响应式布局测试 - 通用页面元素
 * 测试不同设备尺寸下的页面表现
 */

import {expect, test} from '@playwright/test';

test.describe('响应式布局 - 通用元素', () => {
    // 定义关键断点
    const breakpoints = {
        mobile: 375,
        mobileLarge: 480,
        tablet: 768,
        desktop: 1024,
        desktopLarge: 1440,
    };

    test.beforeEach(async ({page}) => {
        await page.goto('/home');
    });

    test('应该在所有设备上正确显示头部导航', async ({page, browserName}) => {
        const viewport = page.viewportSize();
        const width = viewport?.width || 0;

        // 移动端视图
        if (width <= breakpoints.mobile) {
            // 应该显示汉堡菜单
            await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

            // 点击汉堡菜单应该展开导航
            await page.locator('[data-testid="mobile-menu-button"]').click();
            await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
        }
        // 桌面视图
        else if (width >= breakpoints.desktop) {
            // 应该显示完整导航栏
            await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();

            // 不应该显示汉堡菜单
            await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible();
        }
    });

    test('应该根据屏幕尺寸调整内容宽度', async ({page}) => {
        const viewport = page.viewportSize();
        const width = viewport?.width || 0;

        // 获取主容器
        const mainContainer = page.locator('[data-testid="main-container"]');
        const boundingBox = await mainContainer.boundingBox();

        if (boundingBox) {
            // 移动端：内容应该占满整个宽度（有小边距）
            if (width <= breakpoints.mobile) {
                expect(boundingBox.width).toBeLessThanOrEqual(width + 32); // 允许 32px 误差
            }
            // 桌面端：内容应该有最大宽度限制
            else if (width >= breakpoints.desktopLarge) {
                expect(boundingBox.width).toBeLessThanOrEqual(750); // 最大宽度 750px
            }
        }
    });

    test('应该在小屏幕上隐藏非关键元素', async ({page}) => {
        const viewport = page.viewportSize();
        const width = viewport?.width || 0;

        // 侧边栏或次要信息在移动端应该隐藏
        const sidebar = page.locator('[data-testid="sidebar"]');

        if (width <= breakpoints.mobile) {
            await expect(sidebar).not.toBeVisible();
        } else if (width >= breakpoints.tablet) {
            await expect(sidebar).toBeVisible();
        }
    });

    test('图片应该在不同屏幕上正确缩放', async ({page}) => {
        const productImages = page.locator('[data-testid="product-image"]');
        const count = await productImages.count();

        if (count > 0) {
            const firstImage = productImages.first();
            const boundingBox = await firstImage.boundingBox();

            if (boundingBox) {
                // 图片应该是响应式的，不超过容器宽度
                const viewport = page.viewportSize();
                const maxWidth = viewport?.width || 0;

                expect(boundingBox.width).toBeLessThanOrEqual(maxWidth);
                expect(boundingBox.width).toBeGreaterThan(0);
            }
        }
    });

    test('字体大小应该适配屏幕尺寸', async ({page}) => {
        const title = page.locator('[data-testid="page-title"]');

        if (await title.isVisible()) {
            const fontSize = await title.evaluate(el =>
                parseFloat(window.getComputedStyle(el).fontSize)
            );

            const viewport = page.viewportSize();
            const width = viewport?.width || 0;

            // 移动端字体应该较小
            if (width <= breakpoints.mobile) {
                expect(fontSize).toBeLessThan(24);
            }
            // 桌面端字体可以较大
            else if (width >= breakpoints.desktop) {
                expect(fontSize).toBeGreaterThanOrEqual(24);
            }
        }
    });

    test('按钮和交互元素应该易于触摸', async ({page}) => {
        const buttons = page.locator('button, [role="button"]');
        const count = await buttons.count();

        // 至少测试前几个按钮
        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i);

            if (await button.isVisible()) {
                const boundingBox = await button.boundingBox();

                if (boundingBox) {
                    // 触摸目标最小应该是 44x44px (WCAG 标准)
                    expect(boundingBox.height).toBeGreaterThanOrEqual(44);
                    expect(boundingBox.width).toBeGreaterThanOrEqual(44);
                }
            }
        }
    });

    test('表单输入框应该在移动设备上正确显示', async ({page}) => {
        const inputs = page.locator('input, textarea');
        const count = await inputs.count();

        if (count > 0) {
            const firstInput = inputs.first();
            const boundingBox = await firstInput.boundingBox();

            if (boundingBox) {
                // 输入框高度应该足够大，便于触摸
                expect(boundingBox.height).toBeGreaterThanOrEqual(44);

                // 字体大小至少 16px 以防止 iOS 自动缩放
                const fontSize = await firstInput.evaluate(el =>
                    parseFloat(window.getComputedStyle(el).fontSize)
                );
                expect(fontSize).toBeGreaterThanOrEqual(16);
            }
        }
    });
});

// 辅助函数：判断当前视口属于哪个断点
function getBreakpointName(width: number): string {
    if (width <= 375) return 'mobile';
    if (width <= 480) return 'mobile-large';
    if (width <= 768) return 'tablet';
    if (width <= 1024) return 'desktop';
    return 'desktop-large';
}
