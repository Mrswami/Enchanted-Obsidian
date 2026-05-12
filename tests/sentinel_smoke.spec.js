import { test, expect } from '@playwright/test';

test.describe('Sentinel QA // Nexus Smoke Test', () => {
  test('should load the Sovereign Dashboard', async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('/');

    // Check for the core "Sovereign" or "Vault" elements
    await expect(page).toHaveTitle(/EnchantedObsidian/);
    
    // Verify the Command Header is visible
    const header = page.locator('.command-header-sector');
    await expect(header).toBeVisible();

    // Verify Sector Cards are present
    const sectors = page.locator('.sector-card');
    await expect(sectors).toHaveCount({ min: 1 });
  });

  test('should verify Vault Sector is active', async ({ page }) => {
    await page.goto('/');
    const vaultSector = page.locator('.sector-card:has-text("VAULT SECTOR")');
    await expect(vaultSector).toBeVisible();
    await expect(vaultSector).toHaveClass(/active/);
  });
});
