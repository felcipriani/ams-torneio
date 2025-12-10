# Implementation Plan

- [x] 1. Configure Tailwind for viewport-based utilities
  - Extend tailwind.config.ts with custom height utilities (screen-10, screen-12, screen-40, screen-50, screen-70)
  - Add custom maxHeight utilities for viewport constraints
  - Add custom aspectRatio utilities (4/3, 16/9, 16/10)
  - _Requirements: 6.3, 6.4_

- [x] 2. Optimize WaitingScreen component
  - Replace text-5xl md:text-7xl with text-2xl md:text-3xl lg:text-4xl
  - Change min-h-screen to h-screen with flex centering
  - Add max-h-[40vh] constraint to content container
  - Test animation still works smoothly with smaller elements
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Optimize Timer component
  - Add size prop with 'small' | 'medium' | 'large' variants
  - Implement size-based className mapping (w-20 h-20 for small, w-28 h-28 for medium, w-40 h-40 for large)
  - Adjust SVG circle radius and text sizes based on size prop
  - Update Timer usage in DuelView to use size="small"
  - _Requirements: 1.4_

- [x] 4. Optimize MemeCard component
  - Replace aspect-square with aspect-[4/3] md:aspect-[16/9] lg:aspect-[16/10]
  - Reduce padding from p-6 to p-2 md:p-4
  - Reduce vote badge size from w-12 h-12 to w-8 h-8 md:w-10 md:h-10
  - Change caption text from text-lg to text-sm md:text-base
  - Add line-clamp-2 to caption for overflow handling
  - Reduce button padding from py-3 to py-2
  - Change button text from text-lg to text-sm md:text-base
  - _Requirements: 1.2, 2.4, 7.1, 7.2_

- [ ] 4.1 Write property test for image aspect ratios
  - **Property 4: Image aspect ratio adaptation**
  - **Validates: Requirements 1.2, 2.4**

- [x] 5. Optimize DuelView component
  - Replace min-h-screen with h-screen and flex flex-col overflow-hidden
  - Create header section with fixed h-[10vh] md:h-[12vh]
  - Reduce header title from text-4xl md:text-6xl to text-2xl md:text-3xl lg:text-4xl
  - Reduce subtitle from text-xl to text-sm md:text-base
  - Create timer section with fixed h-[10vh] md:h-[12vh]
  - Change cards grid to use flex-1 for remaining space
  - Reduce grid gap from gap-8 to gap-2 md:gap-4
  - Reduce padding from p-4 md:p-8 to p-2 md:p-4
  - Add overflow-hidden to grid container
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3_

- [x] 5.1 Write property test for viewport containment on desktop
  - **Property 1: Viewport containment on desktop**
  - **Validates: Requirements 1.1, 5.3**

- [x] 5.2 Write property test for mobile vertical stacking efficiency
  - **Property 5: Mobile vertical stacking efficiency**
  - **Validates: Requirements 2.1, 2.2**

- [x] 6. Optimize WinnerScreen component
  - Replace min-h-screen with h-screen flex flex-col justify-center overflow-hidden
  - Reduce title from text-6xl md:text-8xl to text-3xl md:text-4xl lg:text-5xl
  - Add max-h-[12vh] to title container
  - Reduce "Campeão!" text from text-3xl md:text-5xl to text-xl md:text-2xl
  - Add max-h-[50vh] constraint to winner card container
  - Change image aspect ratio to aspect-[4/3] md:aspect-[16/10]
  - Use object-contain instead of object-cover for winner image
  - Reduce caption from text-2xl md:text-4xl to text-lg md:text-xl lg:text-2xl
  - Reduce celebration message from text-2xl md:text-3xl to text-lg md:text-xl
  - Ensure confetti animation respects viewport boundaries
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 6.1 Write property test for typography hierarchy preservation
  - **Property 3: Typography hierarchy preservation**
  - **Validates: Requirements 7.1, 7.3**

- [x] 7. Checkpoint - Verify participant views
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Optimize AdminView component
  - Replace min-h-screen with h-screen flex flex-col overflow-hidden
  - Create fixed header with h-[8vh]
  - Reduce header title from text-4xl md:text-5xl to text-2xl md:text-3xl
  - Reduce subtitle from text-lg to text-sm md:text-base
  - Wrap content in flex-1 overflow-y-auto container
  - Reduce space-y-8 to space-y-4 for section spacing
  - Reduce section title sizes from text-2xl to text-lg md:text-xl
  - Add max-h-[40vh] overflow-y-auto to meme list container
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 9. Optimize UploadZone component (if needed)
  - Review current height and reduce if excessive
  - Ensure drag-and-drop area is compact but usable
  - Maintain minimum touch target sizes (44x44px)
  - _Requirements: 5.1, 7.2_

- [ ] 10. Optimize TournamentConfig component (if needed)
  - Review spacing and reduce if excessive
  - Ensure form controls are compact but accessible
  - _Requirements: 5.1, 5.4_

- [ ] 11. Optimize MemeList component (if needed)
  - Ensure grid layout is compact
  - Reduce card sizes if needed
  - Verify internal scrolling works smoothly
  - _Requirements: 5.2_

- [ ] 12. Write property test for responsive scaling consistency
  - **Property 2: Responsive scaling consistency**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 13. Write property test for admin scroll isolation
  - **Property 6: Admin scroll isolation**
  - **Validates: Requirements 5.2**

- [ ] 14. Write property test for animation performance preservation
  - **Property 7: Animation performance preservation**
  - **Validates: Requirements 4.4, 7.4**

- [ ] 15. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise
