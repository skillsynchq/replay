# replay.md — Design System

## Principles

1. **Clean and serious.** Like Linear or Vercel. Minimal, structured, inspires trust.
2. **Every element earns its place.** No decoration for decoration's sake.
3. **The conversation is the product.** The preview is the demo. It must look premium.
4. **Transparent by default.** Developers are skeptical. Address it head-on.

---

## Color

Dark mode only at launch. No gradients. Colors are precise, not ambient.

| Token             | Value        | Usage                                      |
| ----------------- | ------------ | ------------------------------------------ |
| `--bg`            | zinc-950     | Page background                            |
| `--fg`            | zinc-100     | Primary text (headlines, body)             |
| `--fg-muted`      | zinc-400     | Secondary text (descriptions, sublines)    |
| `--fg-subtle`     | zinc-500     | Tertiary text (timestamps, labels)         |
| `--fg-ghost`      | zinc-600     | Prompt indicators, gutters, collapsed UI   |
| `--fg-faint`      | zinc-700     | Line numbers, disabled states              |
| `--border`        | zinc-800     | Default borders (1px, sharp)               |
| `--border-hover`  | zinc-700     | Border on hover                            |
| `--surface`       | zinc-900     | Code blocks, elevated surfaces             |
| `--accent`        | orange-500   | Links, step numbers, CTAs — used sparingly |
| `--accent-hover`  | orange-400   | Accent on hover                            |
| `--diff-add`      | green-400    | Diff additions (text)                      |
| `--diff-add-bg`   | green-950    | Diff addition line background              |
| `--diff-remove`   | red-400      | Diff removals (text)                       |
| `--diff-remove-bg`| red-950      | Diff removal line background               |

No glow effects. No gradient blobs. No background blocks behind card grids.

---

## Typography

Font: **Geist** (sans) and **Geist Mono** (monospace). Already loaded.

Base size: **13px** with a **golden ratio (1.618)** scale:

| Step | Size   | Usage                        |
| ---- | ------ | ---------------------------- |
| -1   | 8px    | Fine print                   |
| 0    | 13px   | Body text, descriptions      |
| 1    | 21px   | Section labels, step titles  |
| 2    | 34px   | Section headlines            |
| 3    | 55px   | Hero headline                |

Weights: Regular (400) for body, Medium (500) for headlines. No bold. No italic except for emphasis in prose.

Monospace (Geist Mono): used for code, install commands, file paths, step numbers, and the `replay.md` wordmark in the nav.

---

## Spacing

Generous. Let the content breathe.

- Section padding: `120px` vertical (desktop), `80px` (mobile)
- Between headline and subline: `16px`
- Between subline and CTA: `32px`
- Between steps in "How It Works": `48px` horizontal gap
- Content max-width: `64rem` (1024px) for prose, `56rem` (896px) for the conversation preview

---

## Borders & Corners

- **Sharp corners everywhere.** Max border-radius: `4px` (code blocks, buttons). Nothing rounder.
- **1px borders** in `--border` color. No 2px. No shadows. No outlines.
- Borders brighten to `--border-hover` on interactive hover states.

---

## Motion

Subtle, one-shot, confidence-building.

| Element               | Animation                                             |
| --------------------- | ----------------------------------------------------- |
| Hero load             | Fade in + 8px shift up. 400ms ease-out. Staggered.    |
| Scroll reveal         | Same fade+shift, triggered once on viewport entry.    |
| Stagger within section| ~80ms delay between children.                         |
| Hover (links/buttons) | Color brightness transition, 150ms.                   |
| Copy button click     | Icon swap (clipboard → check) with quick scale bounce.|
| Terminal cursor       | Slow blink (~1s) in install command block.             |

**Not used:** Parallax. Scroll-triggered replay. Looping animations (except cursor). Hover transforms (scale/translate). Scroll progress bars.

---

## Logos & Trust Marks

Used inline at small sizes to build credibility, not as decoration:

- **GitHub Octocat** — next to "View on GitHub" link, and in the trust section
- **Anthropic/Claude mark** — in conversation preview header and "How It Works" step 02
- **OpenAI/Codex mark** — alongside Claude in step 02

Logos rendered in monochrome (zinc-400) to match the palette. No full-color logos.

---

## Diff Rendering

Diffs are first-class UI. They appear in conversation previews.

- File path header: monospace, `--fg-subtle`, above the diff block
- Line numbers: `--fg-faint`, right-aligned in a gutter
- Added lines: `+` prefix in `--diff-add`, line background in `--diff-add-bg`
- Removed lines: `-` prefix in `--diff-remove`, line background in `--diff-remove-bg`
- Unchanged lines: `--fg-subtle`
- Syntax highlighting within diffs: restrained palette — orange for strings, steel-blue for keywords, green for types. Muted but legible.

---

## Code Blocks

- Background: `--surface`
- Border: 1px `--border`, sharp corners (4px max)
- Syntax theme: muted — avoids rainbow highlighting
- Inline code spans: `--surface` background, 1px `--border`, monospace, no rounding

---

## Component Patterns

### Nav
- Transparent, fixed. No border, no background.
- Left: `replay.md` wordmark. Right: text links (zinc-400 → white on hover) + `Sign in`.
- No hamburger. Links inline on mobile at launch.

### Buttons
- Primary: text link in `--accent` with `→` arrow. No filled buttons in the hero.
- Secondary: text in `--fg-muted`, brightens on hover.
- Copy button: small, icon-only, inside code blocks.

### Cards (future use)
- 1px `--border`, sharp corners, `--bg` background (not `--surface`).
- On hover: border brightens. No shadow, no scale.

### Section Labels
- Monospace, `--accent`, small (step 0 or -1 size). Above the section headline.
