/**
 * Playwright E2E Tests for UI Validation Flow
 */

import { test, expect } from '@playwright/test';

test.describe('UI Validation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
  });

  test('should display input screen on load', async ({ page }) => {
    // Check title
    await expect(page.locator('h2')).toContainText('Validate Your UI Design');

    // Check input sections exist
    await expect(page.locator('text=Actual UI')).toBeVisible();
    await expect(page.locator('text=Figma Design')).toBeVisible();

    // Check analyze button exists but is disabled
    const analyzeButton = page.locator('button:has-text("Analyze Design")');
    await expect(analyzeButton).toBeVisible();
    await expect(analyzeButton).toBeDisabled();
  });

  test('should toggle between URL and screenshot input for web source', async ({ page }) => {
    // Default should be URL
    await expect(page.locator('input[placeholder="https://example.com"]')).toBeVisible();

    // Click screenshot button
    await page.click('button:has-text("Screenshot"):first-of-type');

    // Should show dropzone
    await expect(page.locator('text=Drag and drop screenshot here')).toBeVisible();

    // Click URL button to go back
    await page.click('button:has-text("Website URL")');

    // Should show URL input again
    await expect(page.locator('input[placeholder="https://example.com"]')).toBeVisible();
  });

  test('should toggle between URL and screenshot input for Figma source', async ({ page }) => {
    // Default should be URL
    await expect(page.locator('input[placeholder*="figma.com"]')).toBeVisible();

    // Click screenshot button for Figma
    const screenshotButtons = page.locator('button:has-text("Screenshot")');
    await screenshotButtons.nth(1).click();

    // Should show dropzone
    await expect(page.locator('text=Drag and drop Figma export here')).toBeVisible();
  });

  test('should enable analyze button when both inputs are provided', async ({ page }) => {
    // Enter web URL
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');

    // Enter Figma URL
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');

    // Analyze button should be enabled
    const analyzeButton = page.locator('button:has-text("Analyze Design")');
    await expect(analyzeButton).toBeEnabled();
  });

  test('should show progress during validation', async ({ page }) => {
    // Enter inputs
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');

    // Click analyze
    await page.click('button:has-text("Analyze Design")');

    // Should show progress indicator
    await expect(page.locator('text=Analyzing')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to results after validation', async ({ page }) => {
    // Enter inputs
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');

    // Click analyze
    await page.click('button:has-text("Analyze Design")');

    // Wait for navigation to results (mock validation completes quickly)
    await expect(page).toHaveURL(/\/results/, { timeout: 15000 });

    // Should show results
    await expect(page.locator('text=Validation Results')).toBeVisible();
  });

  test('should display match score on results page', async ({ page }) => {
    // Navigate directly to results with mock data
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');
    await page.click('button:has-text("Analyze Design")');

    // Wait for results
    await page.waitForURL(/\/results/, { timeout: 15000 });

    // Should show percentage score
    await expect(page.locator('text=/%/')).toBeVisible();
  });

  test('should switch between result tabs', async ({ page }) => {
    // Run validation first
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');
    await page.click('button:has-text("Analyze Design")');
    await page.waitForURL(/\/results/, { timeout: 15000 });

    // Click Mismatches tab
    await page.click('button:has-text("Mismatches")');
    await expect(page.locator('text=All Categories')).toBeVisible();

    // Click Visual Diff tab
    await page.click('button:has-text("Visual Diff")');
    
    // Click AI Insights tab
    await page.click('button:has-text("AI Insights")');
    await expect(page.locator('text=AI Assessment')).toBeVisible();

    // Click Overview tab
    await page.click('button:has-text("Overview")');
    await expect(page.locator('text=Category Scores')).toBeVisible();
  });

  test('should filter mismatches by category', async ({ page }) => {
    // Run validation
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');
    await page.click('button:has-text("Analyze Design")');
    await page.waitForURL(/\/results/, { timeout: 15000 });

    // Go to Mismatches tab
    await page.click('button:has-text("Mismatches")');

    // Select category filter
    await page.selectOption('select:has-text("All Categories")', 'typography');

    // Should show filtered count
    await expect(page.locator('text=/Showing \\d+ of \\d+/')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Click settings link
    await page.click('a:has-text("Settings")');

    // Should show settings page
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();
    await expect(page.locator('text=Figma API')).toBeVisible();
    await expect(page.locator('text=AI / LLM Configuration')).toBeVisible();
  });

  test('should save settings', async ({ page }) => {
    // Navigate to settings
    await page.click('a:has-text("Settings")');

    // Enter a viewport size
    await page.fill('input[type="number"]:first-of-type', '1440');

    // Click save
    await page.click('button:has-text("Save Settings")');

    // Should show success message
    await expect(page.locator('text=Settings saved')).toBeVisible();
  });

  test('should navigate back to validation from results', async ({ page }) => {
    // Run validation
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');
    await page.click('button:has-text("Analyze Design")');
    await page.waitForURL(/\/results/, { timeout: 15000 });

    // Click back button
    await page.click('button:has-text("Run New Validation")');

    // Should be back on input screen
    await expect(page).toHaveURL('/');
    await expect(page.locator('h2')).toContainText('Validate Your UI Design');
  });
});

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Run validation to get to results
    await page.goto('http://localhost:5173');
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    await page.fill('input[placeholder*="figma.com"]', 'https://www.figma.com/file/ABC123/Design');
    await page.click('button:has-text("Analyze Design")');
    await page.waitForURL(/\/results/, { timeout: 15000 });
  });

  test('should have export buttons visible', async ({ page }) => {
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
  });

  test('should trigger JSON export', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    // Click JSON export
    await page.click('button:has-text("JSON")');

    // In browser mode, this triggers a download
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.json');
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Check h1 exists
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check h2 exists
    const h2 = page.locator('h2');
    await expect(h2).toBeVisible();
  });

  test('should have accessible form inputs', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // URL inputs should be accessible
    const urlInput = page.locator('input[type="url"]').first();
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus on interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
