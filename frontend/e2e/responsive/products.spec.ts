/**
 * 商品列表页响应式测试
 */

import {expect, test} from '@playwright/test';

test.describe('商品列表页 - 响应式测试', () => {
    const breakpoints = {
        mobile: 375,
        tablet: 768,
        desktop: 1024,
    };

    test.beforeEach(async ({page}) => {
        await page.goto('/products');
    });

    test('商品网格应该适配不同屏幕宽度', async ({page}) => {
        const viewport = page.viewportSize();
        const width = viewport?.width || 0;

        const productCards = page.locator('[data-testid="product-card"]');
        const firstCard = productCards.first();

        if (await firstCard.isVisible()) {
            const boundingBox = await firstCard.boundingBox();

            if (boundingBox) {
                // 移动端：单列布局
                if (width <= breakpoints.mobile) {
                    expect(boundingBox.width).toBeGreaterThan(width * 0.9); // 占满 90% 以上宽度
                }
                // 平板：两列布局
                else if (width <= breakpoints.tablet) {
                    expect(boundingBox.width).toBeLessThan(width / 2);
                    expect(boundingBox.width).toBeGreaterThan(width * 0.4);
                }
                // 桌面：多列布局
                else {
                    expect(boundingBox.width).toBeLessThan(width / 3);
                    expect(boundingBox.width).toBeGreaterThan(width * 0.2);
                }
            }
        }
    });

    test('筛选栏应该在不同设备上表现正确', async ({page}) => {
        const viewport = page.viewportSize();
        const width = viewport?.width || 0;

        const filterBar = page.locator('[data-testid="filter-bar"]');

        // 移动端：筛选栏可能是折叠的或简化的
        if (width <= breakpoints.mobile) {
            // 可能显示为下拉选择器或按钮
            const mobileFilterButton = page.locator('[data-testid="mobile-filter-button"]');
            const simpleSelect = page.locator('[data-testid="category-select"]');

            expect(
                await mobileFilterButton.isVisible() ||
                await simpleSelect.isVisible()
            ).toBe(true);
        }
        // 桌面端：完整的筛选栏
        else {
            await expect(filterBar).toBeVisible();

            // 应该有多个筛选项可见
            const filterItems = filterBar.locator('[data-testid^="filter-"]');
            expect(await filterItems.count()).toBeGreaterThanOrEqual(2);
        }
    });

    test('排序功能应该在所有尺寸下可用', async ({page}) => {
        const sortControl = page.locator('[data-testid="sort-control"]');
        await expect(sortControl).toBeVisible();

        // 点击排序应该打开选项
        await sortControl.click();
        const sortOptions = page.locator('[data-testid^="sort-option-"]');
        expect(await sortOptions.count()).toBeGreaterThan(0);
    });

    test('加载状态应该保持响应式', async ({page}) => {
        // 模拟慢速网络，触发加载状态
        await page.route('**/api/products', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.continue();
        });

        await page.reload();

        // 加载骨架屏应该存在
        const skeleton = page.locator('[data-testid="product-skeleton"]');
        if (await skeleton.count() > 0) {
            await expect(skeleton.first()).toBeVisible();

            // 骨架屏宽度应该适配屏幕
            const viewport = page.viewportSize();
            const width = viewport?.width || 0;

            const boundingBox = await skeleton.first().boundingBox();
            if (boundingBox) {
                expect(boundingBox.width).toBeLessThanOrEqual(width);
            }
        }
    });

    test('空状态应该在各种屏幕上居中显示', async ({page}) => {
        // 通过搜索不存在的商品触发空状态
        await page.locator('[data-testid="search-input"]').fill('xyz-not-found-123');
        await page.locator('[data-testid="search-button"]').click();

        const emptyState = page.locator('[data-testid="empty-state"]');

        if (await emptyState.isVisible()) {
            const boundingBox = await emptyState.boundingBox();
            const viewport = page.viewportSize();
            const width = viewport?.width || 0;

            if (boundingBox) {
                // 空状态应该水平居中（允许小误差）
                const centerPosition = boundingBox.x + boundingBox.width / 2;
                const viewportCenter = width / 2;
                expect(Math.abs(centerPosition - viewportCenter)).toBeLessThan(50);
            }
        }
    });
});
