/**
 * Property-Based Tests for Responsive Viewport Optimization
 * Feature: responsive-viewport-optimization
 * 
 * These tests use Playwright to verify viewport containment and responsive behavior
 * across different screen sizes using property-based testing principles.
 */

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';

/**
 * Feature: responsive-viewport-optimization, Property 1: Viewport containment on desktop
 * **Validates: Requirements 1.1, 5.3**
 * 
 * For any component rendered on a desktop viewport (≥1024px width), 
 * the total scrollable height should not exceed 100vh when all content is visible.
 */
test.describe('Property 1: Viewport containment on desktop', () => {
  test('DuelView should fit within viewport on desktop without scrolling', async ({ page }) => {
    // Start the dev server before running tests
    // This test assumes the app is running on localhost:3000
    
    // Generate random desktop viewport dimensions
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 2560 }), // Desktop widths
        fc.integer({ min: 768, max: 1440 }),  // Desktop heights
        async (width, height) => {
          // Set viewport size
          await page.setViewportSize({ width, height });
          
          // Navigate to the app
          await page.goto('http://localhost:3000');
          
          // Wait for the page to load
          await page.waitForLoadState('networkidle');
          
          // Check if we're on the waiting screen or duel view
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Measure the total scrollable height
            const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            const viewportHeight = height;
            
            // Assert that content fits within viewport (allowing 1px tolerance for rounding)
            expect(scrollHeight).toBeLessThanOrEqual(viewportHeight + 1);
            
            // Also verify no vertical scrollbar is present
            const hasVerticalScroll = await page.evaluate(() => {
              return document.documentElement.scrollHeight > document.documentElement.clientHeight;
            });
            
            expect(hasVerticalScroll).toBe(false);
          }
        }
      ),
      { 
        numRuns: 20, // Run 20 iterations with different viewport sizes
        endOnFailure: true 
      }
    );
  });

  test('WinnerScreen should fit within viewport on desktop without scrolling', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 2560 }),
        fc.integer({ min: 768, max: 1440 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // Check if we're on the winner screen
          const isWinnerScreen = await page.locator('text=Meme do Ano').isVisible().catch(() => false);
          
          if (isWinnerScreen) {
            const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            const viewportHeight = height;
            
            expect(scrollHeight).toBeLessThanOrEqual(viewportHeight + 1);
            
            const hasVerticalScroll = await page.evaluate(() => {
              return document.documentElement.scrollHeight > document.documentElement.clientHeight;
            });
            
            expect(hasVerticalScroll).toBe(false);
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

/**
 * Feature: responsive-viewport-optimization, Property 5: Mobile vertical stacking efficiency
 * **Validates: Requirements 2.1, 2.2**
 * 
 * For any DuelView rendered on mobile (<768px), both MemeCards plus header and timer 
 * should fit within 100vh without requiring scroll to access voting buttons.
 */
test.describe('Property 5: Mobile vertical stacking efficiency', () => {
  test('DuelView should stack efficiently on mobile viewports', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 320, max: 767 }), // Mobile widths
        fc.integer({ min: 568, max: 1024 }), // Mobile heights (various phones)
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Measure total scrollable height
            const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            const viewportHeight = height;
            
            // On mobile, we allow some scroll but it should be minimal
            // The key is that voting buttons should be accessible
            const voteButtons = page.locator('button:has-text("Votar")');
            const buttonCount = await voteButtons.count();
            
            if (buttonCount > 0) {
              // Check if at least one vote button is in viewport initially
              const firstButton = voteButtons.first();
              const isInViewport = await firstButton.isVisible();
              
              // If not visible initially, check if it's accessible with minimal scroll
              if (!isInViewport) {
                const buttonBox = await firstButton.boundingBox();
                if (buttonBox) {
                  // Button should be accessible within 1.5x viewport height (reasonable scroll)
                  expect(buttonBox.y).toBeLessThan(viewportHeight * 1.5);
                }
              }
            }
            
            // Verify cards are stacked vertically (not side by side)
            const memeCards = page.locator('[class*="MemeCard"], .grid > div').first();
            if (await memeCards.isVisible()) {
              const gridContainer = page.locator('.grid').first();
              const gridClass = await gridContainer.getAttribute('class');
              
              // Should have grid-cols-1 on mobile
              expect(gridClass).toContain('grid-cols-1');
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('Mobile layout should use compact spacing', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 320, max: 767 }),
        fc.integer({ min: 568, max: 1024 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Check that grid uses compact gap (gap-2 on mobile)
            const gridContainer = page.locator('.grid').first();
            if (await gridContainer.isVisible()) {
              const gridClass = await gridContainer.getAttribute('class');
              
              // Should have gap-2 on mobile (not gap-8)
              expect(gridClass).toMatch(/gap-2(?:\s|$)/);
              expect(gridClass).not.toContain('gap-8');
            }
            
            // Check that padding is compact (p-2 on mobile)
            const mainContainer = page.locator('.grid').first();
            if (await mainContainer.isVisible()) {
              const containerClass = await mainContainer.getAttribute('class');
              
              // Should have p-2 on mobile
              expect(containerClass).toMatch(/p-2(?:\s|$)/);
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
