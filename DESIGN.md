# replay.md — Design System

> Source of truth for visual decisions in this codebase. Update this file in the same commit as any design change.
> Tokens are defined in `app/globals.css` and `tailwind.config.ts` — this document explains intent, not duplicates values.

---

## 1. Design Philosophy

### Principles

1. **Clean and serious.** Like Linear or Vercel. Minimal, structured, inspires trust.
2. **Every element earns its place.** No decoration for decoration's sake.
3. **The conversation is the product.** The preview is the demo. It must look premium.
4. **Transparent by default.** Developers are skeptical. Address it head-on.
5. **Code-like aesthetics.** Terminal-inspired elements, monospace labels, golden-ratio type scale.

### Anti-Patterns

- No floating bubble/FAB buttons — integrate triggers into existing UI
- No gradients, glow effects, gradient blobs, or background blocks behind card grids
- No parallax, scroll-triggered replay, looping animations (except cursor blink)
- No hover transforms (scale/translate), scroll progress bars
- No full-color logos — monochrome only
- No light mode (dark only at launch)
- No shadows for depth — use surface color hierarchy instead

---

## 2. Design Tokens

### Color Palette

Dark mode only. `color-scheme: dark` on `:root`. Warm, stone-tinted.

#### Backgrounds & Surfaces

| Token              | Value     | Usage                                |
| ------------------ | --------- | ------------------------------------ |
| `--bg`             | `#0c0a09` | Page background                      |
| `--surface`        | `#1c1917` | Code blocks, elevated surfaces       |
| `--surface-raised` | `#231f1d` | Input fields, dropdowns, raised cards |

#### Foreground / Text

| Token         | Value     | Usage                                     |
| ------------- | --------- | ----------------------------------------- |
| `--fg`        | `#f5f5f4` | Primary text (headlines, body)            |
| `--fg-muted`  | `#a8a29e` | Secondary text (descriptions, sublines)   |
| `--fg-subtle` | `#78716c` | Tertiary text (timestamps, labels)        |
| `--fg-ghost`  | `#57534e` | Prompt indicators, gutters, collapsed UI  |
| `--fg-faint`  | `#44403c` | Line numbers, disabled states             |

#### Borders

| Token            | Value     | Usage           |
| ---------------- | --------- | --------------- |
| `--border`       | `#292524` | Default (1px)   |
| `--border-hover` | `#44403c` | Interactive hover |

#### Accent

| Token            | Value     | Usage                                      |
| ---------------- | --------- | ------------------------------------------ |
| `--accent`       | `#f97316` | Links, step numbers, CTAs — used sparingly |
| `--accent-hover` | `#fb923c` | Accent on hover                            |
| `--accent-dim`   | `#9a3412` | Badge borders, muted accent contexts       |

#### Diff

| Token              | Value     | Usage                    |
| ------------------ | --------- | ------------------------ |
| `--diff-add`       | `#4ade80` | Addition text            |
| `--diff-add-bg`    | `#052e16` | Addition line background |
| `--diff-remove`    | `#f87171` | Removal text             |
| `--diff-remove-bg` | `#450a0a` | Removal line background  |

### Typography

#### Font Stack

| Role       | Font              | Variable               | Fallbacks                                    |
| ---------- | ----------------- | ---------------------- | -------------------------------------------- |
| Sans-serif | Helvetica         | `--font-helvetica`     | "Helvetica Neue", Arial, system-ui           |
| Monospace  | JetBrains Mono    | `--font-jetbrains-mono`| Loaded via `next/font/google` in `layout.tsx` |

#### Type Scale

Base: **13px**, scale factor: **golden ratio (1.618)**

| Step | Size  | Usage                             |
| ---- | ----- | --------------------------------- |
| -1   | 8px   | Fine print                        |
| 0    | 13px  | Body text, descriptions           |
| 1    | 21px  | Section labels, step titles       |
| 2    | 34px  | Section headlines                 |
| 3    | 55px  | Hero headline                     |

#### Fluid Typography

Hero and section headings use `clamp()` for responsive sizing:

- Hero: `text-[clamp(34px,5vw,55px)]`
- Section headings: `text-[clamp(21px,3vw,34px)]`

#### Weights

- **400 (Regular)** — body text
- **500 (Medium)** — headlines

No bold. No italic except for emphasis in prose.

#### Line Heights

- Body text: `1.6`
- Code blocks: `1.7`
- Headlines: `1.1`

#### Monospace Usage

JetBrains Mono (`font-mono`) for: code, install commands, file paths, step numbers, badges, labels, the `replay.md` wordmark in nav.

### Spacing

Generous. Let the content breathe.

#### Page-Level

| Context                | Value                  |
| ---------------------- | ---------------------- |
| Hero section           | `pt-36 pb-28`         |
| Content sections       | `py-16` or larger     |
| Main content area      | `px-6 pt-24 pb-20`    |
| Nav padding            | `px-6 py-5`           |
| Scroll padding top     | `7rem` (anchor nav)   |

#### Content Max-Widths

| Context            | Class        | Pixels |
| ------------------ | ------------ | ------ |
| Prose / thread     | `max-w-2xl`  | 672px  |
| Wide sections      | `max-w-5xl`  | 1024px |

#### Component Spacing

Common gap values: `gap-6`, `gap-4`, `gap-3`, `gap-2`, `gap-1.5`, `gap-1`
List spacing: `space-y-0.5`, `space-y-1`, `space-y-2`

### Borders & Corners

- **`rounded-[4px]`** — default radius (cards, code blocks, buttons, inputs)
- **`rounded-[2px]`** — inline elements (badges, inline code)
- **`rounded-md`** — dropdowns only
- **1px borders** in `--border`. No 2px. No outlines.
- Borders brighten to `--border-hover` on interactive hover states.
- Transition: `transition-colors duration-150`

### Shadows

Minimal. Only `shadow-lg` on dropdown menus. All other depth via surface color hierarchy:
`--bg` → `--surface` → `--surface-raised`

---

## 3. Layout Conventions

### Root Layout

```
html.dark
  body.min-h-dvh.flex.flex-col.antialiased
    {children}
```

Viewport unit: `dvh` (dynamic viewport height) preferred over `vh`.

### App Layout

```
div.flex.min-h-dvh.flex-col
  Nav (fixed top, z-50)
  main.flex-1.px-6.pt-24.pb-20
    {children}
  Assistant (sidebar overlay)
```

### Page Patterns

| Pattern       | Structure                                          |
| ------------- | -------------------------------------------------- |
| Landing       | Full-width sections, `mx-auto max-w-5xl`          |
| Thread list   | `mx-auto max-w-2xl`, stacked cards                |
| Thread detail | Two-column: content + sidebar metadata             |
| Conversation  | Tight message spacing (`space-y-1`)                |

### Assistant Sidebar

- Fixed overlay, slides in from right
- Max-width: `440px`
- Border: `border-l border-border`
- Animation: `translateX(100%) → translateX(0)`, 200ms ease-out

### Responsive

Breakpoints: standard Tailwind (`md: 768px`), used sparingly.
Mobile-first, with `md:` overrides for layout changes (e.g., footer row direction).

---

## 4. Component Patterns

### Cards (Thread Cards)

```
Anatomy: border container → content (title, metadata, badges)
Classes: rounded-[4px] border border-border px-5 py-4
Hover:   hover:border-border-hover
Focus:   focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
Text:    text-fg group-hover:text-accent transition-colors duration-150
```

### Buttons

- **Primary:** text link in `--accent` with `→` arrow. No filled buttons in hero.
- **Secondary:** text in `--fg-muted`, brightens on hover.
- **Icon-only (copy):** `text-fg-ghost hover:text-fg-muted`, `size-4`
- **Disabled:** `disabled:opacity-50` or `disabled:opacity-30`

### Inputs

```
Classes: bg-transparent text-fg text-[13px] focus-visible:outline-none
Command: border border-border bg-surface-raised px-5 py-3.5 font-mono text-[13px] rounded-[4px]
```

### Badges (VisibilityBadge)

```
Base:    inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-[2px]
```

| Variant    | Classes                              |
| ---------- | ------------------------------------ |
| `public`   | `border-accent-dim text-accent`      |
| `unlisted` | `border-border-hover text-fg-subtle` |
| `private`  | `border-border text-fg-ghost`        |

### Messages (Conversation)

Compound component pattern: `Conversation.Root`, `Conversation.Header`, `Conversation.Messages`

- User messages: `bg-surface/40 px-3 py-2.5`
- Assistant messages: `py-2`
- Tight spacing: `space-y-1` between messages

### Nav

- Fixed top, transparent background, no border.
- Left: `replay.md` wordmark (monospace). Right: text links (`fg-muted → fg` on hover) + auth.
- No hamburger menu.

### Dropdowns

- `rounded-md shadow-lg` — only component with shadow
- Background: `--surface-raised`

### Section Labels

- Monospace, `--accent`, small (`text-[10px]` or step -1/0 size), uppercase, wide tracking
- Positioned above the section headline

---

## 5. Animation & Motion

Subtle, one-shot, confidence-building.

### Defined Animations

| Class                    | Duration | Easing   | Description                                    |
| ------------------------ | -------- | -------- | ---------------------------------------------- |
| `.animate-reveal`        | 400ms    | ease-out | Fade in + 8px translateY. Entrance animation.  |
| `.animate-blink`         | 1s       | step-end | Cursor blink, infinite loop.                   |
| `.animate-border-pulse`  | 600ms    | ease-out | Single-shot border color pulse (500ms delay).  |
| `.search-highlight-flash`| 3s       | ease-out | Orange border fade + subtle background tint.   |

### Stagger Delays

| Class       | Delay |
| ----------- | ----- |
| `.stagger-1`| 0ms   |
| `.stagger-2`| 80ms  |
| `.stagger-3`| 160ms |
| `.stagger-4`| 240ms |
| `.stagger-5`| 320ms |

### Sidebar Slide-In

- `translateX(100%) → translateX(0)`, 200ms ease-out (inline style)

### Streaming Text (Assistant)

- Word-by-word reveal via `streamdown`: 80ms duration, 15ms stagger per word

### Hover Transitions

Standard: `transition-colors duration-150` on all interactive elements.

| Element  | Behavior                              |
| -------- | ------------------------------------- |
| Text     | `hover:text-fg` or `hover:text-accent`|
| Borders  | `hover:border-border-hover`           |
| Opacity  | `hover:opacity-80`                    |
| Surface  | `hover:bg-surface-raised`             |

### Accessibility

`prefers-reduced-motion: reduce` — disables all animations, sets `opacity: 1`, removes transforms. Blink slows to 2s.

---

## 6. Icons & Logos

### Icon System

Custom SVG components — no external icon library.

#### Rendering

- **Stroke-based:** `stroke="currentColor"`, `strokeWidth` 1.2–2
- **Fill-based:** `fill="currentColor"`
- **Logo masks:** `WebkitMask` + CSS `mask` for dynamic coloring
- **Color:** All use `currentColor`, colored via parent className
- **Sizing:** `className="size-{n}"` where n = 3, 3.5, 4, 4.5, 6

#### Available Icons

| Category  | Icons                                                       |
| --------- | ----------------------------------------------------------- |
| Logos     | `GitHubMark`, `ClaudeMark`, `OpenAIMark`, `AgentMark`      |
| Actions   | `ArrowUp`, `CheckMark`, `ClipboardMark`, `PencilIcon`, `XIcon` |
| UI        | `ChevronRight`, `ChevronDown`, `SearchIcon`, `TerminalIcon`, `BrainIcon` |
| Objects   | `LightningMark`, `FileMark`                                 |

#### Usage

```tsx
<AgentMark agent={agent} className="size-3 text-fg-faint" />
<CheckMark className="size-4 text-accent" />
```

### Logo Treatment

Rendered in monochrome (`fg-muted` / `fg-subtle`) to match palette. No full-color logos.

---

## 7. Accessibility

### Focus States

```
focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
```

Thin ring (1px), orange accent, 2px offset matching page background.

### Reduced Motion

All animations respect `prefers-reduced-motion: reduce`:
- Opacity forced to `1`
- Transforms removed
- Blink duration extended to `2s`

### Contrast

All text/background combinations meet WCAG AA (4.5:1 minimum):
- `--fg` (#f5f5f4) on `--bg` (#0c0a09) — high contrast
- `--fg-muted` (#a8a29e) on `--bg` (#0c0a09) — meets AA
- `--accent` (#f97316) on `--bg` (#0c0a09) — meets AA

---

## 8. Diff Rendering

Diffs are first-class UI. They appear in conversation previews.

| Element         | Token / Style                                           |
| --------------- | ------------------------------------------------------- |
| File path       | Monospace, `--fg-subtle`, above diff block              |
| Line numbers    | `--fg-faint`, right-aligned gutter                      |
| Added lines     | `+` prefix in `--diff-add`, bg `--diff-add-bg`         |
| Removed lines   | `-` prefix in `--diff-remove`, bg `--diff-remove-bg`   |
| Unchanged       | `--fg-subtle`                                           |
| Syntax colors   | Restrained — orange strings, steel-blue keywords, green types |

---

## 9. Markdown Rendering

Components used in conversation and thread display:

| Element     | Classes                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| Links       | `text-accent hover:text-accent-hover transition-colors duration-150`              |
| Inline code | `border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle rounded-[2px]` |
| Code blocks | `bg-surface border border-border rounded-[4px]`, `font-mono text-[12px]`, line-height `1.7` |
| Lists       | `ml-4 list-disc space-y-0.5 text-[13px] marker:text-fg-faint`                    |

---

## 10. Implementation Notes

### Tech Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Framework  | Next.js 16.x                                 |
| React      | 19.x                                         |
| Styling    | Tailwind CSS 4.x (`@tailwindcss/postcss`)    |
| Database   | Drizzle ORM + Neon (serverless PostgreSQL)   |
| Auth       | Better Auth                                  |
| Search     | FlexSearch                                   |
| Markdown   | react-markdown + remark-gfm, streamdown     |
| Validation | Zod                                          |
| AI         | @anthropic-ai/sdk                            |

### File Locations

| What              | Where                        |
| ----------------- | ---------------------------- |
| CSS tokens        | `app/globals.css`            |
| Tailwind config   | `tailwind.config.ts`         |
| Root layout       | `app/layout.tsx`             |
| App layout        | `app/(app)/layout.tsx`       |
| Components        | `app/components/`            |
| Icons             | Inline SVG in component files |

### Naming Conventions

- CSS tokens: `--kebab-case` (e.g., `--fg-muted`, `--surface-raised`)
- Tailwind classes: standard utility-first
- Components: PascalCase files, compound pattern for complex UI (`Conversation.Root`)
- Animation classes: `.animate-{name}`, `.stagger-{n}`

### Adding a New Token

1. Define the CSS custom property in `app/globals.css` under `:root`
2. If needed, extend `tailwind.config.ts` to reference it
3. Update this document in the same commit
