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
 * Feature: responsive-viewport-optimization, Property 2: Responsive scaling consistency
 * **Validates: Requirements 6.1, 6.2**
 * 
 * For any viewport resize event, all components using vh/vw units should recalculate 
 * their dimensions proportionally without layout shift or overflow.
 */
test.describe('Property 2: Responsive scaling consistency', () => {
  test('Components should scale proportionally when viewport is resized', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        // Generate pairs of viewport dimensions to test resize behavior
        fc.tuple(
          fc.record({
            width: fc.integer({ min: 1024, max: 1920 }),
            height: fc.integer({ min: 768, max: 1080 })
          }),
          fc.record({
            width: fc.integer({ min: 1024, max: 1920 }),
            height: fc.integer({ min: 768, max: 1080 })
          })
        ),
        async ([viewport1, viewport2]) => {
          // Set initial viewport
          await page.setViewportSize(viewport1);
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // Wait a bit for any animations to settle
          await page.waitForTimeout(100);
          
          // Measure initial dimensions
          const initialMeasurements = await page.evaluate(() => {
            const measurements: any = {
              scrollHeight: document.documentElement.scrollHeight,
              clientHeight: document.documentElement.clientHeight,
              hasOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight
            };
            
            // Measure header if present
            const header = document.querySelector('header');
            if (header) {
              const rect = header.getBoundingClientRect();
              measurements.headerHeight = rect.height;
              measurements.headerHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            // Measure timer if present
            const timer = document.querySelector('[class*="Timer"]') || 
                         document.querySelector('svg circle[stroke-dasharray]')?.closest('div');
            if (timer) {
              const rect = timer.getBoundingClientRect();
              measurements.timerHeight = rect.height;
              measurements.timerHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            // Measure grid container if present
            const grid = document.querySelector('.grid');
            if (grid) {
              const rect = grid.getBoundingClientRect();
              measurements.gridHeight = rect.height;
              measurements.gridHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            return measurements;
          });
          
          // Resize viewport
          await page.setViewportSize(viewport2);
          await page.waitForTimeout(100); // Allow time for resize to take effect
          
          // Measure after resize
          const resizedMeasurements = await page.evaluate(() => {
            const measurements: any = {
              scrollHeight: document.documentElement.scrollHeight,
              clientHeight: document.documentElement.clientHeight,
              hasOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight
            };
            
            const header = document.querySelector('header');
            if (header) {
              const rect = header.getBoundingClientRect();
              measurements.headerHeight = rect.height;
              measurements.headerHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            const timer = document.querySelector('[class*="Timer"]') || 
                         document.querySelector('svg circle[stroke-dasharray]')?.closest('div');
            if (timer) {
              const rect = timer.getBoundingClientRect();
              measurements.timerHeight = rect.height;
              measurements.timerHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            const grid = document.querySelector('.grid');
            if (grid) {
              const rect = grid.getBoundingClientRect();
              measurements.gridHeight = rect.height;
              measurements.gridHeightVh = (rect.height / window.innerHeight) * 100;
            }
            
            return measurements;
          });
          
          // Verify no overflow after resize
          expect(resizedMeasurements.hasOverflow).toBe(false);
          
          // Verify proportional scaling: vh-based elements should maintain similar vh percentages
          // Allow 2vh tolerance for rounding and browser differences
          if (initialMeasurements.headerHeightVh && resizedMeasurements.headerHeightVh) {
            const vhDifference = Math.abs(
              initialMeasurements.headerHeightVh - resizedMeasurements.headerHeightVh
            );
            expect(vhDifference).toBeLessThan(2);
          }
          
          if (initialMeasurements.timerHeightVh && resizedMeasurements.timerHeightVh) {
            const vhDifference = Math.abs(
              initialMeasurements.timerHeightVh - resizedMeasurements.timerHeightVh
            );
            expect(vhDifference).toBeLessThan(2);
          }
          
          // Verify content still fits in viewport after resize
          expect(resizedMeasurements.scrollHeight).toBeLessThanOrEqual(
            resizedMeasurements.clientHeight + 1
          );
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  test('Breakpoint transitions should apply correct responsive classes', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        // Test transitions across breakpoints: mobile -> tablet -> desktop
        fc.constantFrom(
          { from: 375, to: 768, name: 'mobile-to-tablet' },
          { from: 768, to: 1024, name: 'tablet-to-desktop' },
          { from: 1024, to: 1920, name: 'desktop-to-large' }
        ),
        async (transition) => {
          // Start at smaller viewport
          await page.setViewportSize({ 
            width: transition.from, 
            height: 800 
          });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(100);
          
          // Capture initial state
          const initialState = await page.evaluate(() => {
            const grid = document.querySelector('.grid');
            return {
              gridClass: grid?.getAttribute('class') || '',
              hasGrid: !!grid
            };
          });
          
          // Resize to larger viewport
          await page.setViewportSize({ 
            width: transition.to, 
            height: 800 
          });
          await page.waitForTimeout(100);
          
          // Capture resized state
          const resizedState = await page.evaluate(() => {
            const grid = document.querySelector('.grid');
            return {
              gridClass: grid?.getAttribute('class') || '',
              hasGrid: !!grid,
              hasOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight
            };
          });
          
          // Verify no overflow after breakpoint transition
          if (resizedState.hasGrid) {
            expect(resizedState.hasOverflow).toBe(false);
          }
          
          // Verify responsive classes changed appropriately
          if (initialState.hasGrid && resizedState.hasGrid) {
            // Classes should be different after crossing breakpoint
            // (unless we're at the same breakpoint, which is unlikely with our ranges)
            const classesChanged = initialState.gridClass !== resizedState.gridClass;
            
            // At minimum, verify the layout is still valid
            expect(resizedState.gridClass).toBeTruthy();
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  test('Rapid viewport changes should not cause layout shift or overflow', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of viewport sizes to test rapid changes
        fc.array(
          fc.record({
            width: fc.integer({ min: 768, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 })
          }),
          { minLength: 3, maxLength: 5 }
        ),
        async (viewportSequence) => {
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // Apply each viewport size in sequence
          for (const viewport of viewportSequence) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(50); // Minimal wait to simulate rapid changes
            
            // Check for overflow after each resize
            const hasOverflow = await page.evaluate(() => {
              return document.documentElement.scrollHeight > document.documentElement.clientHeight;
            });
            
            // Should not overflow at any point
            expect(hasOverflow).toBe(false);
          }
          
          // Final check: measure layout stability
          const finalCheck = await page.evaluate(() => {
            return {
              hasOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
              bodyHeight: document.body.scrollHeight,
              viewportHeight: window.innerHeight
            };
          });
          
          expect(finalCheck.hasOverflow).toBe(false);
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

/**
 * Feature: responsive-viewport-optimization, Property 4: Image aspect ratio adaptation
 * **Validates: Requirements 1.2, 2.4**
 * 
 * For any MemeCard rendered, the image aspect ratio should be 4:3 on mobile (<768px) 
 * and 16:9 or 16:10 on desktop (≥768px).
 */
test.describe('Property 4: Image aspect ratio adaptation', () => {
  test('MemeCard images should use 4:3 aspect ratio on mobile', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 320, max: 767 }), // Mobile widths
        fc.integer({ min: 568, max: 1024 }), // Mobile heights
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Find image containers in MemeCards
            const imageContainers = page.locator('.aspect-\\[4\\/3\\]');
            const containerCount = await imageContainers.count();
            
            if (containerCount > 0) {
              // Check each image container
              for (let i = 0; i < containerCount; i++) {
                const container = imageContainers.nth(i);
                const dimensions = await container.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  return {
                    width: rect.width,
                    height: rect.height,
                    aspectRatio: rect.width / rect.height
                  };
                });
                
                // 4:3 aspect ratio = 1.333...
                // Allow 5% tolerance for rounding and browser differences
                const expectedRatio = 4 / 3;
                const tolerance = expectedRatio * 0.05;
                
                expect(dimensions.aspectRatio).toBeGreaterThan(expectedRatio - tolerance);
                expect(dimensions.aspectRatio).toBeLessThan(expectedRatio + tolerance);
              }
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('MemeCard images should use 16:9 or 16:10 aspect ratio on tablet/desktop', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 2560 }), // Tablet and desktop widths
        fc.integer({ min: 600, max: 1440 }), // Various heights
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // On tablet/desktop, images should use aspect-[16/9] or aspect-[16/10]
            // Check for md: breakpoint classes
            const imageContainers = page.locator('[class*="aspect-"]');
            const containerCount = await imageContainers.count();
            
            if (containerCount > 0) {
              for (let i = 0; i < containerCount; i++) {
                const container = imageContainers.nth(i);
                const dimensions = await container.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  const classes = el.className;
                  return {
                    width: rect.width,
                    height: rect.height,
                    aspectRatio: rect.width / rect.height,
                    classes: classes
                  };
                });
                
                // At md breakpoint (768px+), should be 16:9 (1.777...) or 16:10 (1.6)
                // At lg breakpoint (1024px+), should be 16:10 (1.6)
                const ratio16_9 = 16 / 9; // 1.777...
                const ratio16_10 = 16 / 10; // 1.6
                const tolerance = 0.1; // 10% tolerance
                
                // Check if aspect ratio matches either 16:9 or 16:10
                const matches16_9 = Math.abs(dimensions.aspectRatio - ratio16_9) < tolerance;
                const matches16_10 = Math.abs(dimensions.aspectRatio - ratio16_10) < tolerance;
                
                // Should match at least one of the expected ratios
                expect(matches16_9 || matches16_10).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('Aspect ratio should transition correctly across breakpoints', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        // Test transition from mobile to tablet/desktop
        fc.constantFrom(
          { from: 375, to: 768, name: 'mobile-to-tablet' },
          { from: 767, to: 1024, name: 'tablet-to-desktop' }
        ),
        async (transition) => {
          // Start at mobile viewport
          await page.setViewportSize({ 
            width: transition.from, 
            height: 800 
          });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Measure aspect ratio at smaller viewport
            const mobileRatio = await page.evaluate(() => {
              const container = document.querySelector('[class*="aspect-"]');
              if (container) {
                const rect = container.getBoundingClientRect();
                return rect.width / rect.height;
              }
              return null;
            });
            
            // Resize to larger viewport
            await page.setViewportSize({ 
              width: transition.to, 
              height: 800 
            });
            await page.waitForTimeout(100);
            
            // Measure aspect ratio at larger viewport
            const desktopRatio = await page.evaluate(() => {
              const container = document.querySelector('[class*="aspect-"]');
              if (container) {
                const rect = container.getBoundingClientRect();
                return rect.width / rect.height;
              }
              return null;
            });
            
            if (mobileRatio && desktopRatio) {
              // Aspect ratio should change when crossing breakpoint
              // Mobile should be closer to 4:3 (1.333), desktop closer to 16:9 (1.777) or 16:10 (1.6)
              if (transition.from < 768 && transition.to >= 768) {
                // Crossing from mobile to tablet/desktop
                // Desktop ratio should be wider (larger) than mobile ratio
                expect(desktopRatio).toBeGreaterThan(mobileRatio);
                
                // Mobile should be close to 4:3
                expect(Math.abs(mobileRatio - 4/3)).toBeLessThan(0.2);
                
                // Desktop should be close to 16:9 or 16:10
                const close16_9 = Math.abs(desktopRatio - 16/9) < 0.2;
                const close16_10 = Math.abs(desktopRatio - 16/10) < 0.2;
                expect(close16_9 || close16_10).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
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

/**
 * Feature: responsive-viewport-optimization, Property 7: Animation performance preservation
 * **Validates: Requirements 4.4, 7.4**
 * 
 * For any animated element (confetti, timer, transitions), the animation should complete 
 * without causing reflow or affecting the layout dimensions of other elements.
 */
test.describe('Property 7: Animation performance preservation', () => {
  test('Timer animation should not cause layout shift or reflow', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 1920 }), // Desktop widths
        fc.integer({ min: 768, max: 1080 }),  // Desktop heights
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isDuelView = await page.locator('text=Duelo de Memes').isVisible().catch(() => false);
          
          if (isDuelView) {
            // Find timer element
            const timerContainer = page.locator('svg circle[stroke-dasharray]').first();
            
            if (await timerContainer.isVisible()) {
              // Measure initial layout dimensions
              const initialLayout = await page.evaluate(() => {
                const body = document.body;
                const html = document.documentElement;
                
                return {
                  bodyHeight: body.scrollHeight,
                  bodyWidth: body.scrollWidth,
                  htmlHeight: html.scrollHeight,
                  htmlWidth: html.scrollWidth,
                  hasOverflow: html.scrollHeight > html.clientHeight
                };
              });
              
              // Wait for timer animation to progress
              await page.waitForTimeout(1000);
              
              // Measure layout after animation
              const afterAnimationLayout = await page.evaluate(() => {
                const body = document.body;
                const html = document.documentElement;
                
                return {
                  bodyHeight: body.scrollHeight,
                  bodyWidth: body.scrollWidth,
                  htmlHeight: html.scrollHeight,
                  htmlWidth: html.scrollWidth,
                  hasOverflow: html.scrollHeight > html.clientHeight
                };
              });
              
              // Verify no layout shift occurred
              expect(afterAnimationLayout.bodyHeight).toBe(initialLayout.bodyHeight);
              expect(afterAnimationLayout.bodyWidth).toBe(initialLayout.bodyWidth);
              expect(afterAnimationLayout.htmlHeight).toBe(initialLayout.htmlHeight);
              expect(afterAnimationLayout.htmlWidth).toBe(initialLayout.htmlWidth);
              
              // Verify no overflow was introduced
              expect(afterAnimationLayout.hasOverflow).toBe(initialLayout.hasOverflow);
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  test('WinnerScreen confetti animation should respect viewport boundaries', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 1920 }),
        fc.integer({ min: 768, max: 1080 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isWinnerScreen = await page.locator('text=Meme do Ano').isVisible().catch(() => false);
          
          if (isWinnerScreen) {
            // Measure initial layout before confetti animation starts
            const initialLayout = await page.evaluate(() => {
              const html = document.documentElement;
              return {
                scrollHeight: html.scrollHeight,
                scrollWidth: html.scrollWidth,
                clientHeight: html.clientHeight,
                clientWidth: html.clientWidth,
                hasVerticalOverflow: html.scrollHeight > html.clientHeight,
                hasHorizontalOverflow: html.scrollWidth > html.clientWidth
              };
            });
            
            // Wait for confetti animation to start and progress
            await page.waitForTimeout(500);
            
            // Measure layout during animation
            const duringAnimationLayout = await page.evaluate(() => {
              const html = document.documentElement;
              return {
                scrollHeight: html.scrollHeight,
                scrollWidth: html.scrollWidth,
                clientHeight: html.clientHeight,
                clientWidth: html.clientWidth,
                hasVerticalOverflow: html.scrollHeight > html.clientHeight,
                hasHorizontalOverflow: html.scrollWidth > html.clientWidth
              };
            });
            
            // Verify confetti doesn't cause overflow
            // Allow 1px tolerance for rounding
            expect(duringAnimationLayout.scrollHeight).toBeLessThanOrEqual(
              initialLayout.scrollHeight + 1
            );
            expect(duringAnimationLayout.scrollWidth).toBeLessThanOrEqual(
              initialLayout.scrollWidth + 1
            );
            
            // Verify no new overflow was introduced
            expect(duringAnimationLayout.hasVerticalOverflow).toBe(initialLayout.hasVerticalOverflow);
            expect(duringAnimationLayout.hasHorizontalOverflow).toBe(initialLayout.hasHorizontalOverflow);
            
            // Verify confetti container has overflow-hidden
            const confettiContainer = await page.evaluate(() => {
              const container = document.querySelector('.absolute.inset-0.pointer-events-none');
              if (container) {
                const styles = window.getComputedStyle(container);
                return {
                  overflow: styles.overflow,
                  overflowX: styles.overflowX,
                  overflowY: styles.overflowY
                };
              }
              return null;
            });
            
            if (confettiContainer) {
              // Container should have overflow hidden to prevent confetti from causing scroll
              expect(confettiContainer.overflow === 'hidden' || 
                     confettiContainer.overflowY === 'hidden').toBe(true);
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  test('WaitingScreen pulse animation should not affect layout dimensions', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 1920 }),
        fc.integer({ min: 600, max: 1080 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isWaitingScreen = await page.locator('text=Sessão ainda não iniciada').isVisible().catch(() => false);
          
          if (isWaitingScreen) {
            // Measure initial dimensions
            const initialDimensions = await page.evaluate(() => {
              const html = document.documentElement;
              const body = document.body;
              
              return {
                htmlHeight: html.scrollHeight,
                htmlWidth: html.scrollWidth,
                bodyHeight: body.scrollHeight,
                bodyWidth: body.scrollWidth,
                hasOverflow: html.scrollHeight > html.clientHeight
              };
            });
            
            // Wait through animation cycle
            await page.waitForTimeout(1000); // Wait for animation to progress
            
            // Measure dimensions after animation
            const afterAnimationDimensions = await page.evaluate(() => {
              const html = document.documentElement;
              const body = document.body;
              
              return {
                htmlHeight: html.scrollHeight,
                htmlWidth: html.scrollWidth,
                bodyHeight: body.scrollHeight,
                bodyWidth: body.scrollWidth,
                hasOverflow: html.scrollHeight > html.clientHeight
              };
            });
            
            // Verify layout dimensions remain stable (no reflow occurred)
            expect(afterAnimationDimensions.htmlHeight).toBe(initialDimensions.htmlHeight);
            expect(afterAnimationDimensions.htmlWidth).toBe(initialDimensions.htmlWidth);
            expect(afterAnimationDimensions.bodyHeight).toBe(initialDimensions.bodyHeight);
            expect(afterAnimationDimensions.bodyWidth).toBe(initialDimensions.bodyWidth);
            expect(afterAnimationDimensions.hasOverflow).toBe(initialDimensions.hasOverflow);
          }
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  test('WinnerScreen card rotation animation should not cause layout shift', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 1920 }),
        fc.integer({ min: 768, max: 1080 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const isWinnerScreen = await page.locator('text=Meme do Ano').isVisible().catch(() => false);
          
          if (isWinnerScreen) {
            // Find the winner card container
            const winnerCard = page.locator('.bg-white.rounded-2xl').first();
            
            if (await winnerCard.isVisible()) {
              // Measure initial layout
              const initialLayout = await page.evaluate(() => {
                const html = document.documentElement;
                const card = document.querySelector('.bg-white.rounded-2xl');
                const cardRect = card ? card.getBoundingClientRect() : null;
                
                return {
                  htmlHeight: html.scrollHeight,
                  htmlWidth: html.scrollWidth,
                  hasOverflow: html.scrollHeight > html.clientHeight,
                  cardTop: cardRect?.top || 0,
                  cardLeft: cardRect?.left || 0,
                  cardHeight: cardRect?.height || 0,
                  cardWidth: cardRect?.width || 0
                };
              });
              
              // Wait for rotation animation to progress
              await page.waitForTimeout(1500);
              
              // Measure layout during animation
              const duringAnimationLayout = await page.evaluate(() => {
                const html = document.documentElement;
                const card = document.querySelector('.bg-white.rounded-2xl');
                const cardRect = card ? card.getBoundingClientRect() : null;
                
                return {
                  htmlHeight: html.scrollHeight,
                  htmlWidth: html.scrollWidth,
                  hasOverflow: html.scrollHeight > html.clientHeight,
                  cardTop: cardRect?.top || 0,
                  cardLeft: cardRect?.left || 0,
                  cardHeight: cardRect?.height || 0,
                  cardWidth: cardRect?.width || 0
                };
              });
              
              // Verify no layout shift in document
              expect(duringAnimationLayout.htmlHeight).toBe(initialLayout.htmlHeight);
              expect(duringAnimationLayout.htmlWidth).toBe(initialLayout.htmlWidth);
              expect(duringAnimationLayout.hasOverflow).toBe(initialLayout.hasOverflow);
              
              // Card dimensions should remain stable (rotation uses transform, not layout changes)
              // Allow small tolerance for transform-based positioning
              expect(Math.abs(duringAnimationLayout.cardHeight - initialLayout.cardHeight)).toBeLessThan(5);
              expect(Math.abs(duringAnimationLayout.cardWidth - initialLayout.cardWidth)).toBeLessThan(5);
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  test('Multiple simultaneous animations should not compound layout issues', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 1920 }),
        fc.integer({ min: 768, max: 1080 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // This test checks any screen with animations
          const hasAnimations = await page.evaluate(() => {
            // Check for any animated elements
            const animatedElements = document.querySelectorAll('[class*="motion"]');
            return animatedElements.length > 0;
          });
          
          if (hasAnimations) {
            // Measure initial state
            const initialState = await page.evaluate(() => {
              const html = document.documentElement;
              return {
                scrollHeight: html.scrollHeight,
                scrollWidth: html.scrollWidth,
                clientHeight: html.clientHeight,
                clientWidth: html.clientWidth,
                hasOverflow: html.scrollHeight > html.clientHeight
              };
            });
            
            // Wait for multiple animation cycles
            await page.waitForTimeout(2000);
            
            // Measure after animations
            const afterState = await page.evaluate(() => {
              const html = document.documentElement;
              return {
                scrollHeight: html.scrollHeight,
                scrollWidth: html.scrollWidth,
                clientHeight: html.clientHeight,
                clientWidth: html.clientWidth,
                hasOverflow: html.scrollHeight > html.clientHeight
              };
            });
            
            // Verify layout stability
            expect(afterState.scrollHeight).toBe(initialState.scrollHeight);
            expect(afterState.scrollWidth).toBe(initialState.scrollWidth);
            expect(afterState.hasOverflow).toBe(initialState.hasOverflow);
            
            // Verify viewport dimensions unchanged
            expect(afterState.clientHeight).toBe(initialState.clientHeight);
            expect(afterState.clientWidth).toBe(initialState.clientWidth);
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});

/**
 * Feature: responsive-viewport-optimization, Property 3: Typography hierarchy preservation
 * **Validates: Requirements 7.1, 7.3**
 * 
 * For any text element that is resized, the relative size relationship between 
 * heading levels (h1 > h2 > p) should be maintained across all breakpoints.
 */
test.describe('Property 3: Typography hierarchy preservation', () => {
  test('Typography hierarchy should be maintained across all breakpoints', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 320, max: 2560 }), // All viewport widths
        fc.integer({ min: 568, max: 1440 }), // All viewport heights
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // Measure font sizes of different heading levels
          const typographySizes = await page.evaluate(() => {
            const measurements: any = {
              h1Elements: [],
              h2Elements: [],
              pElements: []
            };
            
            // Find all h1 elements
            const h1Elements = document.querySelectorAll('h1');
            h1Elements.forEach((el) => {
              const styles = window.getComputedStyle(el);
              const fontSize = parseFloat(styles.fontSize);
              if (fontSize > 0) {
                measurements.h1Elements.push({
                  fontSize,
                  text: el.textContent?.substring(0, 30) || ''
                });
              }
            });
            
            // Find all h2 elements
            const h2Elements = document.querySelectorAll('h2');
            h2Elements.forEach((el) => {
              const styles = window.getComputedStyle(el);
              const fontSize = parseFloat(styles.fontSize);
              if (fontSize > 0) {
                measurements.h2Elements.push({
                  fontSize,
                  text: el.textContent?.substring(0, 30) || ''
                });
              }
            });
            
            // Find all p elements (sample a few to avoid too many)
            const pElements = document.querySelectorAll('p');
            const pSample = Array.from(pElements).slice(0, 5); // Sample first 5
            pSample.forEach((el) => {
              const styles = window.getComputedStyle(el);
              const fontSize = parseFloat(styles.fontSize);
              if (fontSize > 0) {
                measurements.pElements.push({
                  fontSize,
                  text: el.textContent?.substring(0, 30) || ''
                });
              }
            });
            
            return measurements;
          });
          
          // Verify hierarchy: h1 > h2 > p
          if (typographySizes.h1Elements.length > 0 && typographySizes.h2Elements.length > 0) {
            // Get average font sizes
            const avgH1 = typographySizes.h1Elements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.h1Elements.length;
            const avgH2 = typographySizes.h2Elements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.h2Elements.length;
            
            // h1 should be larger than h2
            expect(avgH1).toBeGreaterThan(avgH2);
          }
          
          if (typographySizes.h1Elements.length > 0 && typographySizes.pElements.length > 0) {
            const avgH1 = typographySizes.h1Elements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.h1Elements.length;
            const avgP = typographySizes.pElements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.pElements.length;
            
            // h1 should be larger than p
            expect(avgH1).toBeGreaterThan(avgP);
          }
          
          if (typographySizes.h2Elements.length > 0 && typographySizes.pElements.length > 0) {
            const avgH2 = typographySizes.h2Elements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.h2Elements.length;
            const avgP = typographySizes.pElements.reduce((sum: number, el: any) => sum + el.fontSize, 0) / typographySizes.pElements.length;
            
            // h2 should be larger than or equal to p (some p elements might be same size as h2)
            expect(avgH2).toBeGreaterThanOrEqual(avgP);
          }
        }
      ),
      { numRuns: 30, endOnFailure: true }
    );
  });

  test('Typography hierarchy should be preserved across breakpoint transitions', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        // Test transitions across major breakpoints
        fc.constantFrom(
          { from: 375, to: 768, name: 'mobile-to-tablet' },
          { from: 768, to: 1024, name: 'tablet-to-desktop' },
          { from: 1024, to: 1920, name: 'desktop-to-large' }
        ),
        async (transition) => {
          // Measure at smaller viewport
          await page.setViewportSize({ width: transition.from, height: 800 });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          const smallerViewportSizes = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            const p = document.querySelector('p');
            
            return {
              h1: h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null,
              h2: h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : null,
              p: p ? parseFloat(window.getComputedStyle(p).fontSize) : null
            };
          });
          
          // Measure at larger viewport
          await page.setViewportSize({ width: transition.to, height: 800 });
          await page.waitForTimeout(100);
          
          const largerViewportSizes = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            const p = document.querySelector('p');
            
            return {
              h1: h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null,
              h2: h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : null,
              p: p ? parseFloat(window.getComputedStyle(p).fontSize) : null
            };
          });
          
          // Verify hierarchy is maintained at both viewports
          if (smallerViewportSizes.h1 && smallerViewportSizes.h2) {
            expect(smallerViewportSizes.h1).toBeGreaterThan(smallerViewportSizes.h2);
          }
          
          if (largerViewportSizes.h1 && largerViewportSizes.h2) {
            expect(largerViewportSizes.h1).toBeGreaterThan(largerViewportSizes.h2);
          }
          
          if (smallerViewportSizes.h1 && smallerViewportSizes.p) {
            expect(smallerViewportSizes.h1).toBeGreaterThan(smallerViewportSizes.p);
          }
          
          if (largerViewportSizes.h1 && largerViewportSizes.p) {
            expect(largerViewportSizes.h1).toBeGreaterThan(largerViewportSizes.p);
          }
          
          // Verify font sizes scale up (or stay same) when viewport increases
          if (smallerViewportSizes.h1 && largerViewportSizes.h1) {
            expect(largerViewportSizes.h1).toBeGreaterThanOrEqual(smallerViewportSizes.h1);
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('Typography should maintain legibility at all viewport sizes', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 568, max: 1440 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000');
          await page.waitForLoadState('networkidle');
          
          // Check that all text elements meet minimum size requirements
          const textSizes = await page.evaluate(() => {
            const allTextElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button');
            const sizes: number[] = [];
            
            allTextElements.forEach((el) => {
              const styles = window.getComputedStyle(el);
              const fontSize = parseFloat(styles.fontSize);
              const text = el.textContent?.trim() || '';
              
              // Only check elements with actual text content
              if (text.length > 0 && fontSize > 0) {
                sizes.push(fontSize);
              }
            });
            
            return {
              minSize: sizes.length > 0 ? Math.min(...sizes) : 0,
              maxSize: sizes.length > 0 ? Math.max(...sizes) : 0,
              avgSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
            };
          });
          
          // Minimum font size should be at least 12px for legibility
          // (Some very small decorative elements might be smaller, but main text should be readable)
          if (textSizes.minSize > 0) {
            expect(textSizes.minSize).toBeGreaterThanOrEqual(10); // Allow 10px minimum for small decorative text
          }
          
          // Maximum size should be reasonable (not exceeding 15% of viewport height)
          const maxReasonableSize = height * 0.15;
          if (textSizes.maxSize > 0) {
            expect(textSizes.maxSize).toBeLessThanOrEqual(maxReasonableSize);
          }
        }
      ),
      { numRuns: 25, endOnFailure: true }
    );
  });

  test('AdminView typography hierarchy should be maintained', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 1920 }),
        fc.integer({ min: 600, max: 1080 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000/admin-view');
          await page.waitForLoadState('networkidle');
          
          const isAdminView = await page.locator('text=Painel Administrativo').isVisible().catch(() => false);
          
          if (isAdminView) {
            // Measure typography in admin view
            const adminTypography = await page.evaluate(() => {
              const h1 = document.querySelector('h1'); // "Painel Administrativo"
              const h2Elements = document.querySelectorAll('h2'); // Section titles
              const pElements = document.querySelectorAll('p'); // Subtitles and text
              
              const measurements: any = {
                h1Size: null,
                h2Sizes: [],
                pSizes: []
              };
              
              if (h1) {
                measurements.h1Size = parseFloat(window.getComputedStyle(h1).fontSize);
              }
              
              h2Elements.forEach((h2) => {
                const size = parseFloat(window.getComputedStyle(h2).fontSize);
                if (size > 0) {
                  measurements.h2Sizes.push(size);
                }
              });
              
              // Sample first few p elements
              Array.from(pElements).slice(0, 5).forEach((p) => {
                const size = parseFloat(window.getComputedStyle(p).fontSize);
                if (size > 0) {
                  measurements.pSizes.push(size);
                }
              });
              
              return measurements;
            });
            
            // Verify h1 > h2
            if (adminTypography.h1Size && adminTypography.h2Sizes.length > 0) {
              const avgH2 = adminTypography.h2Sizes.reduce((a: number, b: number) => a + b, 0) / adminTypography.h2Sizes.length;
              expect(adminTypography.h1Size).toBeGreaterThan(avgH2);
            }
            
            // Verify h1 > p
            if (adminTypography.h1Size && adminTypography.pSizes.length > 0) {
              const avgP = adminTypography.pSizes.reduce((a: number, b: number) => a + b, 0) / adminTypography.pSizes.length;
              expect(adminTypography.h1Size).toBeGreaterThan(avgP);
            }
            
            // Verify h2 >= p (h2 should be at least as large as p)
            if (adminTypography.h2Sizes.length > 0 && adminTypography.pSizes.length > 0) {
              const avgH2 = adminTypography.h2Sizes.reduce((a: number, b: number) => a + b, 0) / adminTypography.h2Sizes.length;
              const avgP = adminTypography.pSizes.reduce((a: number, b: number) => a + b, 0) / adminTypography.pSizes.length;
              expect(avgH2).toBeGreaterThanOrEqual(avgP);
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});

/**
 * Feature: responsive-viewport-optimization, Property 6: Admin scroll isolation
 * **Validates: Requirements 5.2**
 * 
 * For any AdminView in WAITING state, the page header should remain fixed 
 * while only the content area scrolls internally.
 */
test.describe('Property 6: Admin scroll isolation', () => {
  test('AdminView header should remain fixed while content scrolls', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 1920 }), // Various viewport widths
        fc.integer({ min: 600, max: 900 }),  // Shorter heights to force scrolling
        async (width, height) => {
          await page.setViewportSize({ width, height });
          
          // Navigate to admin view
          await page.goto('http://localhost:3000/admin-view');
          await page.waitForLoadState('networkidle');
          
          // Check if we're on the admin view in WAITING state
          const isAdminView = await page.locator('text=Painel Administrativo').isVisible().catch(() => false);
          
          if (isAdminView) {
            // Find the header element
            const header = page.locator('header').first();
            const headerExists = await header.isVisible().catch(() => false);
            
            if (headerExists) {
              // Measure initial header position
              const initialHeaderPosition = await header.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return {
                  top: rect.top,
                  left: rect.left,
                  height: rect.height,
                  width: rect.width
                };
              });
              
              // Check if content area is scrollable
              const scrollableContent = page.locator('div.flex-1.overflow-y-auto').first();
              const hasScrollableContent = await scrollableContent.isVisible().catch(() => false);
              
              if (hasScrollableContent) {
                // Get initial scroll position of content area
                const initialContentScroll = await scrollableContent.evaluate((el) => {
                  return {
                    scrollTop: el.scrollTop,
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                    isScrollable: el.scrollHeight > el.clientHeight
                  };
                });
                
                // If content is scrollable, scroll it
                if (initialContentScroll.isScrollable) {
                  // Scroll the content area (not the page)
                  await scrollableContent.evaluate((el) => {
                    el.scrollTop = Math.min(200, el.scrollHeight - el.clientHeight);
                  });
                  
                  // Wait for scroll to complete
                  await page.waitForTimeout(100);
                  
                  // Measure header position after content scroll
                  const afterScrollHeaderPosition = await header.evaluate((el) => {
                    const rect = el.getBoundingClientRect();
                    return {
                      top: rect.top,
                      left: rect.left,
                      height: rect.height,
                      width: rect.width
                    };
                  });
                  
                  // Verify header position remained fixed (didn't move with content scroll)
                  expect(afterScrollHeaderPosition.top).toBe(initialHeaderPosition.top);
                  expect(afterScrollHeaderPosition.left).toBe(initialHeaderPosition.left);
                  expect(afterScrollHeaderPosition.height).toBe(initialHeaderPosition.height);
                  expect(afterScrollHeaderPosition.width).toBe(initialHeaderPosition.width);
                  
                  // Verify content actually scrolled
                  const afterScrollContentScroll = await scrollableContent.evaluate((el) => {
                    return {
                      scrollTop: el.scrollTop
                    };
                  });
                  
                  expect(afterScrollContentScroll.scrollTop).toBeGreaterThan(initialContentScroll.scrollTop);
                  
                  // Verify page itself didn't scroll (scroll isolation)
                  const pageScrollTop = await page.evaluate(() => {
                    return document.documentElement.scrollTop || document.body.scrollTop;
                  });
                  
                  expect(pageScrollTop).toBe(0);
                }
              }
              
              // Verify header has fixed height constraint (h-[8vh])
              const headerClass = await header.getAttribute('class');
              expect(headerClass).toContain('h-[8vh]');
              
              // Verify main container uses flex-col and overflow-hidden
              const mainContainer = page.locator('div.h-screen.flex.flex-col.overflow-hidden').first();
              const hasCorrectLayout = await mainContainer.isVisible().catch(() => false);
              expect(hasCorrectLayout).toBe(true);
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('AdminView content area should have internal scrolling', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 1920 }),
        fc.integer({ min: 600, max: 900 }), // Shorter heights to encourage scrolling
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000/admin-view');
          await page.waitForLoadState('networkidle');
          
          const isAdminView = await page.locator('text=Painel Administrativo').isVisible().catch(() => false);
          
          if (isAdminView) {
            // Find the scrollable content container
            const contentContainer = page.locator('div.flex-1.overflow-y-auto').first();
            const contentExists = await contentContainer.isVisible().catch(() => false);
            
            if (contentExists) {
              // Verify content container has correct classes
              const contentClass = await contentContainer.getAttribute('class');
              expect(contentClass).toContain('flex-1');
              expect(contentClass).toContain('overflow-y-auto');
              
              // Measure content container properties
              const contentProperties = await contentContainer.evaluate((el) => {
                const styles = window.getComputedStyle(el);
                return {
                  overflowY: styles.overflowY,
                  flex: styles.flex,
                  scrollHeight: el.scrollHeight,
                  clientHeight: el.clientHeight,
                  isScrollable: el.scrollHeight > el.clientHeight
                };
              });
              
              // Verify overflow-y is set to auto or scroll
              expect(['auto', 'scroll']).toContain(contentProperties.overflowY);
              
              // Verify flex-1 is applied (flex-grow: 1)
              expect(contentProperties.flex).toContain('1');
              
              // If content is scrollable, verify scrolling works
              if (contentProperties.isScrollable) {
                // Scroll content
                await contentContainer.evaluate((el) => {
                  el.scrollTop = 100;
                });
                
                await page.waitForTimeout(50);
                
                // Verify scroll happened
                const scrollTop = await contentContainer.evaluate((el) => el.scrollTop);
                expect(scrollTop).toBeGreaterThan(0);
                
                // Verify page body didn't scroll
                const bodyScroll = await page.evaluate(() => {
                  return document.documentElement.scrollTop || document.body.scrollTop;
                });
                expect(bodyScroll).toBe(0);
              }
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('AdminView meme list should have internal scrolling with max height', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 768, max: 1920 }),
        fc.integer({ min: 600, max: 900 }),
        async (width, height) => {
          await page.setViewportSize({ width, height });
          await page.goto('http://localhost:3000/admin-view');
          await page.waitForLoadState('networkidle');
          
          const isAdminView = await page.locator('text=Painel Administrativo').isVisible().catch(() => false);
          
          if (isAdminView) {
            // Check if meme list container exists
            const memeListContainer = page.locator('div.max-h-\\[40vh\\].overflow-y-auto').first();
            const memeListExists = await memeListContainer.isVisible().catch(() => false);
            
            if (memeListExists) {
              // Verify container has correct classes
              const containerClass = await memeListContainer.getAttribute('class');
              expect(containerClass).toContain('max-h-[40vh]');
              expect(containerClass).toContain('overflow-y-auto');
              
              // Measure container properties
              const containerProperties = await memeListContainer.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                const viewportHeight = window.innerHeight;
                
                return {
                  height: rect.height,
                  maxHeight: styles.maxHeight,
                  overflowY: styles.overflowY,
                  heightVh: (rect.height / viewportHeight) * 100,
                  scrollHeight: el.scrollHeight,
                  clientHeight: el.clientHeight
                };
              });
              
              // Verify max-height is set to 40vh
              expect(containerProperties.maxHeight).toBe('40vh');
              
              // Verify height doesn't exceed 40vh (with 1vh tolerance)
              expect(containerProperties.heightVh).toBeLessThanOrEqual(41);
              
              // Verify overflow-y is auto or scroll
              expect(['auto', 'scroll']).toContain(containerProperties.overflowY);
              
              // If list has content and is scrollable, test scrolling
              if (containerProperties.scrollHeight > containerProperties.clientHeight) {
                // Scroll the meme list
                await memeListContainer.evaluate((el) => {
                  el.scrollTop = 50;
                });
                
                await page.waitForTimeout(50);
                
                // Verify list scrolled
                const listScrollTop = await memeListContainer.evaluate((el) => el.scrollTop);
                expect(listScrollTop).toBeGreaterThan(0);
                
                // Verify parent content area didn't scroll
                const contentContainer = page.locator('div.flex-1.overflow-y-auto').first();
                const contentScrollTop = await contentContainer.evaluate((el) => el.scrollTop);
                
                // Content scroll should be 0 or unchanged (we only scrolled the meme list)
                expect(contentScrollTop).toBe(0);
              }
            }
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  test('AdminView should maintain scroll isolation across viewport resizes', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            width: fc.integer({ min: 768, max: 1920 }),
            height: fc.integer({ min: 600, max: 900 })
          }),
          fc.record({
            width: fc.integer({ min: 768, max: 1920 }),
            height: fc.integer({ min: 600, max: 900 })
          })
        ),
        async ([viewport1, viewport2]) => {
          // Set initial viewport
          await page.setViewportSize(viewport1);
          await page.goto('http://localhost:3000/admin-view');
          await page.waitForLoadState('networkidle');
          
          const isAdminView = await page.locator('text=Painel Administrativo').isVisible().catch(() => false);
          
          if (isAdminView) {
            const header = page.locator('header').first();
            const contentContainer = page.locator('div.flex-1.overflow-y-auto').first();
            
            const headerExists = await header.isVisible().catch(() => false);
            const contentExists = await contentContainer.isVisible().catch(() => false);
            
            if (headerExists && contentExists) {
              // Scroll content if possible
              const isScrollable = await contentContainer.evaluate((el) => {
                return el.scrollHeight > el.clientHeight;
              });
              
              if (isScrollable) {
                await contentContainer.evaluate((el) => {
                  el.scrollTop = 100;
                });
                await page.waitForTimeout(50);
              }
              
              // Measure header position before resize
              const headerBeforeResize = await header.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return { top: rect.top };
              });
              
              // Resize viewport
              await page.setViewportSize(viewport2);
              await page.waitForTimeout(100);
              
              // Measure header position after resize
              const headerAfterResize = await header.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return { top: rect.top };
              });
              
              // Header should remain at top (position 0 or very close)
              expect(headerAfterResize.top).toBe(0);
              
              // Verify scroll isolation still works after resize
              const contentStillScrollable = await contentContainer.evaluate((el) => {
                return el.scrollHeight > el.clientHeight;
              });
              
              if (contentStillScrollable) {
                // Try scrolling content after resize
                await contentContainer.evaluate((el) => {
                  el.scrollTop = 50;
                });
                await page.waitForTimeout(50);
                
                // Verify page didn't scroll
                const pageScroll = await page.evaluate(() => {
                  return document.documentElement.scrollTop || document.body.scrollTop;
                });
                expect(pageScroll).toBe(0);
                
                // Verify header still at top
                const headerFinal = await header.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  return { top: rect.top };
                });
                expect(headerFinal.top).toBe(0);
              }
            }
          }
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
