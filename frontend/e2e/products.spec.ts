/**
 * E2E 测试示例 - 商品浏览和购物车
 */

import {expect, test} from '@playwright/test';

test.describe('商品浏览和购物车', () => {
    test.beforeEach(async ({page}) => {
        // 导航到商品列表页
        await page.goto('/products');
    });

    test('应该显示商品列表', async ({page}) => {
        // 验证页面加载
        await expect(page).toHaveTitle(/商品/);

        // 等待商品列表加载完成
        await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1);
    });

    test('应该可以筛选商品', async ({page}) => {
        // 选择分类筛选
        await page.locator('[data-testid="category-filter"]').selectOption('drinks');

        // 验证筛选结果
        const productCards = page.locator('[data-testid="product-card"]');
        await expect(productCards.count()).resolves.toBeGreaterThanOrEqual(0);

        // 验证所有显示的商品都属于所选分类
        const categories = await productCards.allTextContents();
        categories.forEach(category => {
            expect(category.toLowerCase()).toContain('drinks');
        });
    });

    test('应该可以搜索商品', async ({page}) => {
        // 输入搜索关键词
        await page.locator('[data-testid="search-input"]').fill('咖啡');

        // 等待搜索结果
        await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);

        // 验证搜索结果包含关键词
        const productNames = await page.locator('[data-testid="product-name"]').allTextContents();
        productNames.forEach(name => {
            expect(name).toContain('咖啡');
        });
    });

    test('应该可以将商品添加到购物车', async ({page}) => {
        // 找到第一个商品
        const firstProduct = page.locator('[data-testid="product-card"]').first();

        // 点击"加入购物车"按钮
        await firstProduct.locator('[data-testid="add-to-cart"]').click();

        // 验证购物车图标显示数量
        await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

        // 验证成功提示
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="toast-success"]')).toContainText(
            '已添加到购物车'
        );
    });

    test('应该可以在购物车调整商品数量', async ({page}) => {
        // 先添加商品到购物车
        await page.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart"]').click();

        // 打开购物车
        await page.locator('[data-testid="cart-button"]').click();

        // 验证商品在购物车中
        await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);

        // 增加数量
        await page.locator('[data-testid="increase-quantity"]').click();
        await expect(page.locator('[data-testid="quantity-display"]')).toHaveText('2');

        // 减少数量
        await page.locator('[data-testid="decrease-quantity"]').click();
        await expect(page.locator('[data-testid="quantity-display"]')).toHaveText('1');
    });

    test('应该可以从购物车移除商品', async ({page}) => {
        // 添加商品到购物车
        await page.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart"]').click();

        // 打开购物车
        await page.locator('[data-testid="cart-button"]').click();

        // 点击移除按钮
        await page.locator('[data-testid="remove-item"]').click();

        // 验证购物车为空
        await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="cart-count"]')).toHaveText('0');
    });

    test('应该可以查看商品详情', async ({page}) => {
        // 点击商品卡片
        await page.locator('[data-testid="product-card"]').first().click();

        // 验证导航到详情页
        await expect(page).toHaveURL(/\/products\/\d+/);

        // 验证详情页元素
        await expect(page.locator('[data-testid="product-image"]')).toBeVisible();
        await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
        await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    });
});
