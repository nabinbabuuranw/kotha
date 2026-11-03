# Kotha · Design record (Day 3)

Followed Nabin's Global Design Workflow (2 Nov 2026) in order, before any UI code.

## 1. Research
- **Who:** Kathmandu Valley landlords who rent out rooms, flats and shop shutters in their own house (often 2 to 15 units, managed from an Android phone), their tenants, and people looking for a room (students, working people, families).
- **How it is done today:** rooms are found through Facebook groups, "To Let" paper signs, brokers who charge a month's rent, and classified sites (Hamrobazar, Basobaas, Nepal Property style portals) that focus on sale listings. Rent is tracked in notebooks and receipts in carbon pads; repairs are phone calls.
- **Design consequences:** mobile-first, fast on mid-range phones, Nepali months (BS) everywhere money is shown, no photos we do not own (so plans instead), phone numbers never public, big tap targets, printable receipts.

## 2. UI UX Pro Max
- Read `~/.agents/skills/ui-ux-pro-max/SKILL.md`; ran
  `search.py "rental listings property management landlord tenant marketplace kathmandu" --design-system --persist -p "Kotha"` (output: `design-system/kotha/MASTER.md`, copied to `design-proof/uiuxpromax-MASTER.md`).
- Its first suggestion was "Vibrant & Block-based" with a purple primary, Inter + Playfair and a testimonials carousel. **Rejected:** purple/black and Inter are on Nabin's anti-AI list and we have no real testimonials.
- Ran the style/typography/ux searches; took **Minimalism & Swiss Style** (grid, high contrast, sharp edges, no shadows, single accent) and the search UX rules ("no results" state with suggestions, predictable filters). Direction chosen for this product: **Architectural Minimalism**, because the product is about rooms and buildings.

## 3. 21st.dev
- `21st search "property listing card"` → Property Preview Card (28203), Card (7100), Product Listing Card (28227).
- `21st search "search filter bar"` → Search Bar with Category Filter (28463), Filter Token Bar (26824).
- `21st search "rent ledger table"` → Invoice Table (22164), Invoice History Table (22187).
- `21st get 28203` was **refused**: the free tier's 2 component downloads for 3 Nov were already used by other jobs that day. Saved the refusal in `design-proof/21st-28203-property-preview-card.txt`. Only the search results (names and structure) informed the listing card and the removable filter tokens; no 21st code is in this repo.

## 4. Coolors (signed in on Nabin's account)
- Used the saved signed-in Browserbase context for Nabin's coolors.co account; the header showed the account (no "Sign in" link) on every page.
- Explored: Trending, popular/terracotta, popular/mustard, popular/plum, popular/earth (screenshots `design-proof/coolors-01…04`).
- Shortlist: **Neutral Earth Tones**, Forest Hues (teal too close to the portfolio's Forest Green, brick red near Byawastha), Warm Rustic Elegance (terracotta close to Day 1's sindoor).
- **Pick: "Neutral Earth Tones"** https://coolors.co/palette/0a0908-22333b-eae0d5-c6ac8f-5e503f (`design-proof/coolors-05-PICK-neutral-earth-tones.png`). Not used before (checked `palettes_log.md`). Stone, slate and wheat read as building materials.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| ink | #0A0908 | text, rules | 15.3:1 on bone |
| slate (primary) | #22333B | buttons, active nav, filled units | 10.0:1 on bone |
| bone | #EAE0D5 | bands, panels | |
| tan | #C6AC8F | plan fills, text on slate | 6.0:1 on slate |
| umber | #5E503F | secondary text | 6.7:1 on plaster |
| plaster (derived) | #F3EDE5 | page ground (no pure white) | |
| ochre (derived) | #7A5A2E | accent text, door swings | 4.8:1 on bone, 5.4:1 on plaster |
| paid / due / part (derived) | #2F6B4F / #9B3B2A / #8A5A12 | ledger states | 4.8 / 5.3 / 4.5:1 on bone |

## 5. Typography
- **Archivo** (variable, width 62 to 125%, SIL OFL), self-hosted, one 90 KB file. Display set at width 116%, weight 640, tight tracking: wide, architectural lettering. Table headers and labels at 110 to 112% caps. Body at 100%.
- **Anek Devanagari** 500/600 (SIL OFL) for Nepali (कोठा, भाडा रसिद), loaded only for Devanagari code points via `unicode-range`.
- Not Inter/Geist/Space Grotesk, not Day 1's Fraunces/Figtree/Mukta, not Day 2's IBM Plex.

## 6. Identity and layout
- **Radius 0** everywhere, 1px hairlines, no shadows.
- **Motifs:** plan sketches (each listing draws its unit type as a floor plan, never a stock photo); dimension lines as section dividers; drawing-sheet numbers (A1 to A7 on the landlord desk, T1 to T3 tenant, X1 to X4 admin); a title-block footer; hatching = "listed"; a building elevation where each window is a unit.
- **Homepage:** full-width stacked headline + self-drawing 2BHK plan → search console docked on the hero baseline → horizontal scroll-snap "Recently listed" with locality chips → sticky-left "For landlords" with four drawing sheets (elevation, interactive specimen rent book, receipt, repair timeline) on a ruled band → pricing as a two-column "schedule of features" table → FAQ as numbered drawing notes → slate demo band → title-block footer.
- **Desk layout:** two-row header; the second row is a strip of title-block cells (sheet number + icon + label), filled slate when active, scrolling sideways on phones. Overview = scale-ruler collection meter → 4 stat cells → occupancy elevations + who owes + 6-month charged/collected bars.
- **Nav concept (public):** solid sticky bar; the active/hovered link is marked by a sliding dimension line with end ticks; mobile menu is a full-screen sheet with numbered display-size links.
- **Icons:** Kotha's own 24px drafting-pen set (1.5px, square caps, mitred joins) in `src/components/Icons.tsx`. No Lucide.
- **Motion:** plan drawings stroke themselves in (CSS dash offset), scroll reveals that reverse when scrolled back up (IntersectionObserver), page fade on route change, modal rise, meter and bar charts grow on load, sliding nav indicator, toasts. All switched off under `prefers-reduced-motion`.

Different from earlier days: Day 1 Palo (Organic Editorial, serif, split hero, left rail), Day 2 Chukta (Carbon Copy utility, Plex, floating pill nav, bottom tab bar), NEXA and My Predictor.
