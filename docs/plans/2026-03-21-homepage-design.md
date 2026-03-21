# Homepage Design — replay.md

## Page Structure

Six sections, top to bottom. Linear scroll narrative. Dark mode only.

---

### 1. Navigation

Transparent, fixed top bar. Blends into the page — no border, no background.

- **Left:** `replay.md` wordmark in Geist Mono, regular weight
- **Right:** `Docs` · `GitHub` · `Sign in` — text links in zinc-400, brighten to white on hover
- No hamburger menu. Three links fit at any screen size.
- The nav is floating typography, not a "navbar component"

---

### 2. Hero

Centered. Typographically driven. No illustrations.

- **Headline:** ~55px, Geist Medium
  > "Share your agent sessions"
- **Subline:** One sentence, zinc-400
  > "Replay captures your Claude Code and Codex conversations and gives them a shareable URL."
- **Install command:**
  ```
  curl -sSf https://replay.md/install | sh
  ```
  Monospace block with 1px zinc-800 border, sharp corners. Copy button on right edge. Terminal cursor blink.
- **Below command:** `View on GitHub →` in orange with inline GitHub octocat

**Animation:** Headline fades in + shifts up 8px (400ms ease-out). Subline follows at +100ms. Install block at +200ms. Border does a single brief pulse (zinc-800 → zinc-500 → zinc-800). Copy button click: icon swap with scale bounce.

---

### 3. How It Works

Three columns (desktop), stacked (mobile). No cards, no boxes.

| Step | Title              | Description                                                  |
| ---- | ------------------ | ------------------------------------------------------------ |
| `01` | Install the CLI    | One command. Works on macOS and Linux.                       |
| `02` | Upload a session   | Replay detects Claude Code and Codex sessions automatically. |
| `03` | Share the link     | Public or private. Claim your username at replay.md/you.     |

- Step numbers in orange, monospace
- Titles in white, Geist Medium
- Descriptions in zinc-400
- Claude and Codex logos (monochrome) inline in step 02
- No dividers, no icons, no boxes — whitespace does the work

---

### 4. Conversation Preview

The product demo. Single rendered conversation, centered, ~max-w-4xl.

**Header bar:**
- Claude logo (small) + `Claude Code` label
- Timestamp: `3 hours ago` in zinc-500
- Project path: `~/workspace/replay` in monospace zinc-600
- Right: `View full thread →` in orange

**Messages (3–4 shown):**

1. **User:** `> Refactor the auth middleware to use the new session validation`
   - Preceded by `>` prompt indicator in zinc-600
   - Text in zinc-200, no background

2. **Assistant:** Brief context sentence, then a code diff:
   - File header: `src/lib/auth.ts` in monospace zinc-500
   - Diff with line numbers, green additions, red removals
   - ~15-20 lines — substantive but not overwhelming
   - Tool use indicator: collapsed `Read src/lib/auth.ts` label with file icon in zinc-600

3. **User:** `> Looks good, but extract the config into a separate file`

4. **Assistant:** Starts responding, then fades out into the page background via transparency gradient

**Outer frame:** 1px zinc-800 border, sharp corners. Brightens to zinc-700 on hover.

**Below preview:** `"This is what sharing looks like."` in zinc-500, centered. Then `"Explore public threads →"` in orange.

---

### 5. Trust / Transparency

Centered narrow column (~max-w-2xl). No cards, no grid. Stacked statements.

- **Section label:** `Open by default` in orange, monospace, small

Three statements:

1. **"Your data, your control"**
   Sessions are private until you choose to share them. Delete anytime.

2. **"Open source CLI"**
   The replay CLI is open source. Inspect every byte before it leaves your machine. (GitHub logo inline)

3. **"No tracking, no analytics"**
   We don't track what you build. We just host what you share.

Headlines in white (Geist Medium). Descriptions in zinc-400. Generous whitespace between each.

---

### 6. Footer

Minimal. Not a mega-footer.

- **Top:** 1px zinc-800 horizontal line
- **Left:** `replay.md` wordmark + `"Share your agent sessions."` in zinc-500
- **Right:** Link groups inline:
  - Product: Install, Docs
  - Community: GitHub (octocat), Discord (logo)
  - Legal: Privacy, Terms
- **Bottom:** `© 2026 replay.md` in zinc-600. Right: `↑` back-to-top link

---

## Motion Summary

- **Page load:** Hero elements stagger in (fade + 8px shift, 400ms, 80ms between children)
- **Scroll:** Each section's children reveal with same animation, triggered once on viewport entry
- **Hover:** Color brightness transitions, 150ms. Borders brighten.
- **Copy click:** Clipboard → checkmark icon swap with scale bounce
- **Terminal cursor:** Slow blink in install command block

---

## Copy Tone

Confident and precise. Developer-friendly with personality. Not dry, not flashy. Every word chosen. Like Vercel or Linear — clear, purposeful, has a voice.

---

## Key Constraints

- No gradients
- No rounded corners beyond 4px
- No gradient blobs or glow effects
- No decorative illustrations
- No scroll-triggered replays or parallax
- Logos in monochrome only
- Orange accent used strategically, not everywhere
