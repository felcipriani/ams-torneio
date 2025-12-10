# Design Document: Responsive Viewport Optimization

## Overview

Este design implementa uma estratégia abrangente de otimização de viewport height para a aplicação de Campeonato de Memes. A solução utiliza unidades CSS relativas (vh, vw, rem), Tailwind CSS utilities customizadas, e ajustes proporcionais em todos os componentes para garantir que a interface completa caiba dentro do viewport disponível sem necessidade de scroll, mantendo a elegância visual existente.

A abordagem é mobile-first e progressivamente aprimorada para telas maiores, utilizando breakpoints do Tailwind (sm, md, lg, xl) para ajustes específicos.

## Architecture

### Component Hierarchy

```
App Layout (100vh container)
├── WaitingScreen (centered, max 40vh)
├── DuelView (flex column, 100vh)
│   ├── Header (10-12vh)
│   ├── Timer (10-12vh)
│   └── MemeCards Grid (65-70vh)
│       ├── MemeCard Left
│       └── MemeCard Right
├── WinnerScreen (100vh)
│   ├── Title (12vh)
│   ├── Winner Image (50vh max)
│   └── Message (8vh)
└── AdminView (100vh with internal scroll)
    ├── Header (8vh)
    ├── Config Section (scrollable)
    └── Content Area (scrollable)
```

### Responsive Strategy

1. **Base (Mobile < 768px)**: Vertical stacking, compact spacing, 4:3 aspect ratio images
2. **Tablet (768px - 1024px)**: Transition to side-by-side, moderate spacing
3. **Desktop (≥ 1024px)**: Full side-by-side layout, optimal spacing, 16:9 aspect ratio images

### CSS Approach

- **Viewport Units**: vh/vw for major layout sections
- **Relative Units**: rem/em for typography and spacing
- **Flexbox/Grid**: For responsive layouts
- **Tailwind Classes**: Custom utilities for vh-based sizing
- **Clamp()**: For fluid typography that scales smoothly

## Components and Interfaces

### 1. WaitingScreen Component

**Current Issues:**
- Text too large (text-5xl md:text-7xl)
- Takes up entire screen unnecessarily

**Design Changes:**
```typescript
// Typography scaling
- text-5xl md:text-7xl → text-2xl md:text-3xl lg:text-4xl
- Max height: 40vh
- Centered with flex, not min-h-screen

// Layout
<div className="flex items-center justify-center h-screen">
  <div className="text-center max-h-[40vh]">
    <h1 className="text-2xl md:text-3xl lg:text-4xl">
      Sessão ainda não iniciada
    </h1>
  </div>
</div>
```

### 2. DuelView Component

**Current Issues:**
- Header too large
- Cards with square aspect ratio waste vertical space
- Excessive margins/padding

**Design Changes:**

```typescript
// Container: strict 100vh
<div className="h-screen flex flex-col overflow-hidden">
  
  // Header: 10-12vh
  <header className="h-[10vh] md:h-[12vh] flex flex-col justify-center">
    <h1 className="text-2xl md:text-3xl lg:text-4xl">Duelo de Memes</h1>
    <p className="text-sm md:text-base">Round {n} - Match {m}</p>
  </header>
  
  // Timer: 10-12vh
  <div className="h-[10vh] md:h-[12vh] flex justify-center items-center">
    <Timer size="small" /> {/* Scaled down */}
  </div>
  
  // Cards Grid: remaining space (65-70vh)
  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 p-2 md:p-4 overflow-hidden">
    <MemeCard />
    <MemeCard />
  </div>
</div>
```

### 3. MemeCard Component

**Current Issues:**
- Square aspect ratio (aspect-square) too tall
- Large padding
- Button too large

**Design Changes:**

```typescript
// Responsive aspect ratios
<div className="flex flex-col h-full">
  
  // Image: flexible aspect ratio
  <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[16/10]">
    <Image src={meme.imageUrl} fill className="object-cover" />
    
    // Vote badge: smaller
    <div className="absolute -top-2 -right-2 w-8 h-8 md:w-10 md:h-10">
      {voteCount}
    </div>
  </div>
  
  // Caption: limited height with ellipsis
  <p className="text-sm md:text-base line-clamp-2 py-2">
    {meme.caption}
  </p>
  
  // Button: compact
  <button className="py-2 px-4 text-sm md:text-base">
    Votar
  </button>
</div>
```

**Key Changes:**
- `aspect-square` → `aspect-[4/3]` (mobile) / `aspect-[16/9]` (desktop)
- `p-6` → `p-2 md:p-4`
- `text-lg` → `text-sm md:text-base`
- `py-3` → `py-2`
- `line-clamp-2` for caption overflow

### 4. Timer Component

**Current Issues:**
- Fixed large size (w-40 h-40 = 160px)
- Doesn't scale with viewport

**Design Changes:**

```typescript
interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  size?: 'small' | 'medium' | 'large'; // New prop
}

// Size variants
const sizeClasses = {
  small: 'w-20 h-20',   // 80px
  medium: 'w-28 h-28',  // 112px
  large: 'w-40 h-40'    // 160px (original)
};

const textSizes = {
  small: 'text-3xl',
  medium: 'text-4xl',
  large: 'text-5xl'
};

// Responsive default
<div className={`${sizeClasses[size]} relative`}>
  <svg className={sizeClasses[size]}>
    {/* Circle with adjusted radius */}
  </svg>
  <span className={textSizes[size]}>
    {timeRemaining}
  </span>
</div>
```

### 5. WinnerScreen Component

**Current Issues:**
- Massive title (text-6xl md:text-8xl)
- Image can be too large
- Confetti doesn't respect viewport

**Design Changes:**

```typescript
<div className="h-screen flex flex-col justify-center items-center overflow-hidden p-4">
  
  // Title: 12vh max
  <div className="text-center mb-4 max-h-[12vh]">
    <h1 className="text-3xl md:text-4xl lg:text-5xl">
      🏆 Meme do Ano 🏆
    </h1>
    <p className="text-xl md:text-2xl">Campeão!</p>
  </div>
  
  // Winner card: 50vh max
  <div className="max-w-2xl w-full max-h-[50vh]">
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10]">
      <Image src={winner.imageUrl} fill className="object-contain" />
    </div>
    <p className="text-lg md:text-xl lg:text-2xl text-center mt-4">
      {winner.caption}
    </p>
  </div>
  
  // Message: 8vh
  <p className="text-lg md:text-xl mt-4">
    Parabéns ao vencedor! 🎉
  </p>
</div>
```

### 6. AdminView Component

**Current Issues:**
- Sections stack with large gaps
- No scroll management
- Upload zone too large

**Design Changes:**

```typescript
<div className="h-screen flex flex-col overflow-hidden">
  
  // Header: fixed 8vh
  <header className="h-[8vh] flex flex-col justify-center">
    <h1 className="text-2xl md:text-3xl">Painel Administrativo</h1>
  </header>
  
  // Content: scrollable remaining space
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto p-4 space-y-4"> {/* gap-8 → gap-4 */}
      
      // Compact sections
      <TournamentConfig />
      
      <div>
        <h2 className="text-lg md:text-xl mb-2">Upload de Memes</h2>
        <UploadZone compact /> {/* New compact mode */}
      </div>
      
      // Meme list with internal scroll
      <div>
        <h2 className="text-lg md:text-xl mb-2">
          Memes Carregados ({memes.length})
        </h2>
        <div className="max-h-[40vh] overflow-y-auto">
          <MemeList memes={memes} />
        </div>
      </div>
    </div>
  </div>
</div>
```

## Data Models

No data model changes required. This is purely a UI/presentation layer optimization.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Viewport containment on desktop

*For any* component rendered on a desktop viewport (≥1024px width), the total scrollable height should not exceed 100vh when all content is visible.

**Validates: Requirements 1.1, 5.3**

### Property 2: Responsive scaling consistency

*For any* viewport resize event, all components using vh/vw units should recalculate their dimensions proportionally without layout shift or overflow.

**Validates: Requirements 6.1, 6.2**

### Property 3: Typography hierarchy preservation

*For any* text element that is resized, the relative size relationship between heading levels (h1 > h2 > p) should be maintained across all breakpoints.

**Validates: Requirements 7.1, 7.3**

### Property 4: Image aspect ratio adaptation

*For any* MemeCard rendered, the image aspect ratio should be 4:3 on mobile (<768px) and 16:9 or 16:10 on desktop (≥768px).

**Validates: Requirements 1.2, 2.4**

### Property 5: Mobile vertical stacking efficiency

*For any* DuelView rendered on mobile (<768px), both MemeCards plus header and timer should fit within 100vh without requiring scroll to access voting buttons.

**Validates: Requirements 2.1, 2.2**

### Property 6: Admin scroll isolation

*For any* AdminView in WAITING state, the page header should remain fixed while only the content area scrolls internally.

**Validates: Requirements 5.2**

### Property 7: Animation performance preservation

*For any* animated element (confetti, timer, transitions), the animation should complete without causing reflow or affecting the layout dimensions of other elements.

**Validates: Requirements 4.4, 7.4**

## Error Handling

### Viewport Too Small

If viewport height < 400px (extremely small devices):
- Show simplified layout with warning message
- Disable animations to improve performance
- Use absolute minimum font sizes (12px base)

### Image Load Failures

- Maintain aspect ratio containers even when images fail
- Show placeholder with same dimensions
- Prevent layout shift

### Dynamic Content Overflow

- Use `line-clamp` for text overflow
- Implement internal scrolling for lists
- Add visual indicators for scrollable areas

## Testing Strategy

### Unit Tests

1. **Component Rendering Tests**
   - Verify each component renders without errors
   - Check that className props are applied correctly
   - Validate responsive class switching at breakpoints

2. **Dimension Calculation Tests**
   - Test vh/vw unit calculations
   - Verify aspect ratio calculations
   - Check that flex-1 and height calculations work correctly

### Property-Based Tests

Property-based testing will use **fast-check** library (already in project dependencies).

1. **Property 1: Viewport Containment**
   - Generate random viewport dimensions (≥1024px width)
   - Render DuelView component
   - Measure total scrollHeight
   - Assert scrollHeight ≤ viewport height

2. **Property 2: Responsive Scaling**
   - Generate random viewport dimensions
   - Render component, measure dimensions
   - Resize viewport
   - Assert proportional scaling without overflow

3. **Property 3: Typography Hierarchy**
   - Generate random viewport widths
   - Measure font sizes of h1, h2, p elements
   - Assert h1 > h2 > p at all breakpoints

4. **Property 4: Image Aspect Ratios**
   - Generate random viewport widths
   - Render MemeCard
   - Measure image container dimensions
   - Assert aspect ratio matches expected value for breakpoint

5. **Property 5: Mobile Stacking**
   - Generate mobile viewport dimensions (<768px)
   - Render DuelView with two MemeCards
   - Measure total height
   - Assert total height ≤ viewport height

### Visual Regression Testing

Use Playwright for visual validation:
- Capture screenshots at key breakpoints (375px, 768px, 1024px, 1920px)
- Compare before/after optimization
- Verify no unintended visual changes
- Check scroll behavior

### Manual Testing Checklist

- [ ] Desktop (1920x1080): No scroll on DuelView
- [ ] Laptop (1366x768): No scroll on DuelView
- [ ] Tablet (768x1024): Minimal scroll, good spacing
- [ ] Mobile (375x667): Efficient stacking, no excessive scroll
- [ ] WaitingScreen: Text appropriately sized on all devices
- [ ] WinnerScreen: Complete view without scroll
- [ ] AdminView: Smooth internal scrolling
- [ ] Timer: Visible and proportional on all screens
- [ ] Animations: Smooth, no layout shift

## Implementation Notes

### Tailwind Configuration

May need to extend Tailwind config for custom utilities:

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      height: {
        'screen-10': '10vh',
        'screen-12': '12vh',
        'screen-40': '40vh',
        'screen-50': '50vh',
        'screen-70': '70vh',
      },
      maxHeight: {
        'screen-40': '40vh',
        'screen-50': '50vh',
      },
      aspectRatio: {
        '4/3': '4 / 3',
        '16/9': '16 / 9',
        '16/10': '16 / 10',
      }
    }
  }
}
```

### CSS Custom Properties

Consider adding CSS variables for consistent spacing:

```css
:root {
  --header-height: 10vh;
  --timer-height: 10vh;
  --spacing-compact: 0.5rem;
  --spacing-normal: 1rem;
  --spacing-relaxed: 1.5rem;
}

@media (min-width: 768px) {
  :root {
    --header-height: 12vh;
    --timer-height: 12vh;
  }
}
```

### Performance Considerations

- Use `will-change` sparingly for animated elements
- Prefer `transform` and `opacity` for animations (GPU-accelerated)
- Lazy load images below the fold
- Use `loading="lazy"` on Image components
- Debounce resize event handlers if needed

### Browser Compatibility

- vh units: Supported in all modern browsers
- aspect-ratio: Supported in Chrome 88+, Firefox 89+, Safari 15+
- Fallback for older browsers: Use padding-bottom hack
- Test on iOS Safari (vh behavior with address bar)

### Accessibility

- Maintain minimum touch target sizes (44x44px)
- Ensure text remains readable at all sizes (min 14px)
- Preserve keyboard navigation
- Test with screen readers
- Maintain color contrast ratios (WCAG AA)

## Migration Strategy

### Phase 1: Core Components
1. WaitingScreen (simplest)
2. Timer (isolated component)
3. MemeCard (affects multiple views)

### Phase 2: Main Views
4. DuelView (most critical)
5. WinnerScreen

### Phase 3: Admin
6. AdminView
7. AdminDuelView

### Rollback Plan

- Keep original component files as `.backup.tsx`
- Use feature flag if needed
- Monitor user feedback
- Easy revert via git if issues arise
