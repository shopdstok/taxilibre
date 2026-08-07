import { test, expect } from '@playwright/test';

test('basic navigation test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle('Example Domain');
});

test('taxlireb示例�测试 - 可以根据实际应用修改', async ({ page }) => {
  // 例如：
  // await page.goto('/');
  // await expect(page).toHaveTitle(/TaxiLibre/);
  // await page.click('text=登录');
  // await expect(page).toHaveURL(/.*login/);
});
