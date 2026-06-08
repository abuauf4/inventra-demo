# Task: NAUKA INVENTRA Identity & Experience Sprint

## Summary
Complete visual overhaul of NAUKA INVENTRA from stone/rose theme to premium dark teal/amber/blue theme inspired by aviation dashboard + smart home dark mode references.

## Files Modified (8 total)

### 1. `src/app/globals.css`
- Complete rewrite of all color variables using oklch color space
- Light mode: cool blue-gray tones (`oklch(0.96 0.005 260)` background, white cards)
- Dark mode: deep blue-black tones (`oklch(0.13 0.015 260)` background, dark blue-tinted cards)
- Sidebar variables are ALWAYS dark teal (`oklch(0.17 0.04 255)`) in both light and dark modes
- Primary/accent colors use amber/orange (`oklch(0.55-0.65 0.18 50)`)
- Chart colors use amber, blue, teal, green, purple palette

### 2. `src/lib/store.ts`
- Default theme changed from `'light'` to `'dark'`

### 3. `src/components/inventra/shared/constants.ts`
- roleColors updated:
  - owner: `from-amber-500 to-orange-600` (was `from-amber-500 to-rose-500`)
  - admin: `from-blue-500 to-cyan-500` (was `from-blue-500 to-violet-500`)
  - staff: `from-teal-500 to-emerald-500` (was `from-emerald-500 to-teal-500`)
  - warehouse: `from-orange-500 to-amber-500` (unchanged)

### 4. `src/components/inventra/shared/sidebar.tsx`
- Always dark teal background (`bg-[#162032]`) regardless of light/dark mode
- White/teal text on sidebar, no `dark:` variants needed
- Brand area: amber-to-orange gradient icon, "NAUKA INVENTRA" in white, muted teal subtitle
- Active nav: amber left border + lighter background + amber text/icon
- Inactive nav: teal-muted text, subtle white/4% hover
- Section labels: very muted teal (teal-500/40)
- Inbox badge: amber-500 instead of rose-500
- Bottom: user area with gradient avatar, role icons in muted teal, theme toggle, red-tinted logout
- Border colors: `border-white/[0.06]`
- Mobile overlay: darker `bg-black/60`

### 5. `src/components/inventra/shared/login-screen.tsx`
- Background: deep dark blue-black (`bg-[#0a0e1a]`) instead of stone
- Background decorations: amber, teal, blue blur circles (subtle)
- Grid pattern: subtle white/1.5% with teal tint
- Logo: amber-to-orange gradient rounded-2xl
- Title: white, subtitle: muted teal (teal-400/50)
- Login card: glass morphism with teal-tinted border (`border-teal-500/[0.08]`)
- Labels: muted teal text (`text-teal-300/40`)
- Inputs: dark glass with amber focus rings
- Submit button: amber-to-orange gradient
- Footer: just "Demo Environment" in very muted teal

### 6. `src/components/inventra/workspace/workspace-home.tsx`
- More spacing: `space-y-10` instead of `space-y-8`
- Greeting: larger heading (`text-3xl`), warmer pacing
- Priority badges: amber for low stock, blue for PO, teal for SO (was violet)
- Quick actions: amber/orange primary (Jual), blue secondary (Beli), teal tertiary (Cari)
- Low stock: amber-500 for stock badges (was amber-400), amber links
- Recent transactions + Inbox: `dark:bg-[#1a1f2e]/80` card backgrounds, `dark:border-white/[0.06]`
- Dividers: `dark:divide-white/[0.04]`
- All "rose-500" links replaced with "amber-500"

### 7. `src/components/inventra/shared/header.tsx`
- Background: `dark:bg-[#0f1117]/80` with backdrop blur
- Border: `dark:border-white/[0.06]`
- Search bar: `dark:bg-white/[0.04]` with subtle borders
- Quick Sale: amber/orange tones (was emerald)
- Notification badge: amber-500 (was rose-500)
- Dropdowns: `dark:bg-[#1a1f2e]` with subtle borders

### 8. `src/app/page.tsx`
- Main container: `bg-[#f4f6fb] dark:bg-[#0f1117]` (was stone-50/dark:stone-950)
- Mobile FAB: amber-to-orange gradient for quick sale (was emerald-to-teal)

## Design Principles Applied
1. Sidebar is ALWAYS dark teal — no light-mode variant
2. Dark mode is default and primary experience
3. Amber/orange = brand accent (replaces rose)
4. Blue = interactive/CTA accent
5. Teal = sidebar + subtle accents
6. All Indonesian text preserved
7. All functionality identical — only visual changes
8. Smooth transitions throughout
9. Flat cards with subtle shadows, no harsh gradients
10. 10px rounded corners maintained
