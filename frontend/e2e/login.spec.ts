/**
 * E2E 测试示例 - 登录流程
 */

import {expect, test} from '@playwright/test';

test.describe('登录流程', () => {
    test.beforeEach(async ({page}) => {
        // 每个测试前导航到登录页
        await page.goto('/auth/login');
    });

    test('应该显示登录页面', async ({page}) => {
        // 验证页面标题
        await expect(page).toHaveTitle(/登录/);

        // 验证表单元素存在
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('应该成功登录', async ({page}) => {
        // 填写登录表单
        await page.locator('input[type="email"]').fill('test@example.com');
        await page.locator('input[type="password"]').fill('password123');

        // 提交表单
        await page.locator('button[type="submit"]').click();

        // 等待导航到首页
        await expect(page).toHaveURL('/home');

        // 验证登录成功（检查用户菜单或其他标识）
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('应该显示错误信息当凭证无效时', async ({page}) => {
        // 填写错误的凭证
        await page.locator('input[type="email"]').fill('wrong@example.com');
        await page.locator('input[type="password"]').fill('wrongpassword');

        // 提交表单
        await page.locator('button[type="submit"]').click();

        // 验证错误信息显示
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText(
            '用户名或密码错误'
        );
    });

    test('应该验证必填字段', async ({page}) => {
        // 尝试提交空表单
        await page.locator('button[type="submit"]').click();

        // 验证错误提示
        await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('应该可以切换到注册页面', async ({page}) => {
        // 点击注册链接
        await page.locator('[data-testid="register-link"]').click();

        // 验证导航到注册页
        await expect(page).toHaveURL('/auth/register');
    });
});
