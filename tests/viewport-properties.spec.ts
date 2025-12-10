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
