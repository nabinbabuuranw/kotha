# Kotha · QA report · Day 3 of 100 Platforms

Live: https://kotha-ktm.sites.tab.bot/ · Repo: https://github.com/nabinbabuuranw/kotha · Tested 3 November 2026 (NPT) against the deployed site.

## Summary
- **API tests: 13/13 pass** (`npm test`, Node test runner, in-memory SQLite D1 shim): BS month maths, money formatting and amount in words, password hashing, setup key, registration + honeypot, login rate limit, CSRF (cross-origin and non-JSON refused), RBAC (anonymous / tenant / landlord / admin / other landlord), listing filters and sorting, unit limit on the Free plan, rent generation is idempotent per month, payments + receipt numbers + void, statement balance, tenant link code, maintenance status flow, admin hide/disable, demo seed.
- **Live E2E (Python Playwright, desktop 1440 + mobile 375/390): 54/54 pass** (`e2e/e2e.py`, result in `e2e-result.json`).
- **Lighthouse (mobile, live site):** see table; every category 96–100.
- **30-point anti-AI audit: 30/30 pass.**

## Live E2E checks
- ✅ home renders headline
- ✅ home shows live listings
- ✅ search console → filtered results
- ✅ filter respects max rent
- ✅ sort high→low
- ✅ type chip filter
- ✅ empty state with suggestions
- ✅ listing detail + demo label
- ✅ inquiry sent
- ✅ page /terms
- ✅ page /privacy
- ✅ page /nope-page
- ✅ visitor sent to login from /admin
- ✅ admin API 401 for visitor
- ✅ landlord API 401 for visitor
- ✅ landlord registers → desk
- ✅ empty desk state
- ✅ property created
- ✅ unit created
- ✅ new unit appears in public search
- ✅ tenant created with 8-char code
- ✅ tenant moved in
- ✅ rented unit leaves public listings
- ✅ rent charged for month
- ✅ extra electricity charge
- ✅ payment → receipt page
- ✅ receipt shows balance due
- ✅ inquiries empty state (own listing had none)
- ✅ overview shows collected
- ✅ tenant registers → home
- ✅ wrong code rejected
- ✅ tenant linked, sees balance
- ✅ tenant raised request
- ✅ tenant blocked from landlord API
- ✅ public receipt link renders
- ✅ landlord resolved request
- ✅ tenant closed request
- ✅ admin login → admin panel
- ✅ admin hides listing → gone from public
- ✅ disabled user signed out
- ✅ cleanup: E2E landlord disabled
- ✅ audit trail lists actions
- ✅ demo landlord button
- ✅ no horizontal overflow at 375px
- ✅ no horizontal overflow at 768px
- ✅ no horizontal overflow at 1024px
- ✅ no horizontal overflow at 1440px
- ✅ desk /app no overflow at 375
- ✅ desk /app/ledger no overflow at 375
- ✅ desk /app/properties no overflow at 375
- ✅ desk /app/tenants no overflow at 375
- ✅ desk /app/requests no overflow at 375
- ✅ reduced motion: reveal content visible
- ✅ no console errors across the run

Two console 404s are expected and excluded: the deliberate visit to a missing page and the deliberate wrong tenant code (the API answers 404). Test accounts created by the run are disabled by the admin step at the end so nothing test-made shows publicly.

## Lighthouse (mobile emulation, simulated throttling)
| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| home | 97 | 100 | 100 | 100 |
| rooms | 99 | 100 | 100 | 100 |
| listing | 96 | 100 | 100 | 100 |
| login | 99 | 100 | 100 | 100 |

## 30-point anti-AI UI audit
| # | Rule | Result | Note |
|---|---|---|---|
| 1 | Harsh gradients | Pass | No gradient washes. Two CSS repeating gradients draw drafting textures (45° hatching = listed unit; a faint 80px ruled grid on one band) and the skeleton shimmer. |
| 2 | Pure white backgrounds | Pass | Page is plaster #F3EDE5, panels bone #EAE0D5, paper surfaces #FBF8F4. White only on the printed receipt. |
| 3 | Rainbow colouring | Pass | 5 Coolors colours + plaster/ochre + 3 ledger states (paid/due/part), each with one job. |
| 4 | Heavy drop shadows | Pass | No shadows at all; depth is hairlines and fills, like a drawing. |
| 5 | Liquid glass | Pass | None. Headers are solid. |
| 6 | Generic purple + black | Pass | UI UX Pro Max proposed purple; rejected. Slate, stone and wheat. |
| 7 | Radial orbs | Pass | None. |
| 8 | Excessive neon | Pass | No saturated colour; the brightest is ochre accent text. |
| 9 | Basic pastel palette | Pass | Earth tones with near-black ink; all text pairs ≥ 4.5:1 (DESIGN.md table, Lighthouse contrast 100). |
| 10 | Default Lucide icons | Pass | Own drafting-pen icon set (Icons.tsx), square caps, mitred joins. |
| 11 | Emojis as UI icons | Pass | None. |
| 12 | Inter / Geist / Space Grotesk | Pass | Archivo variable (width axis) + Anek Devanagari, self-hosted. |
| 13 | Unnecessary sparkle icons | Pass | None. |
| 14 | Animated arrows | Pass | Arrows are static; motion is on the plan drawings and meters. |
| 15 | Hover animation on every element | Pass | Hover only on interactive items: listing cards lift 2px, nav dimension line slides, buttons darken. |
| 16 | Repetitive three-feature cards | Pass | Landlord features are four numbered drawing sheets (A1–A4) with working specimens, not icon cards. |
| 17 | Coloured left stripes on cards | Pass | None. |
| 18 | Repetitive bento grids | Pass | None. Swiss 12-column grid with hairline cells. |
| 19 | Unnecessary terminal mockups | Pass | None. |
| 20 | Generic three-tier pricing | Pass | Two plans as a 'schedule of features' table, like a drawing's schedule. |
| 21 | Soft rounded corners everywhere | Pass | Radius 0 throughout (architectural sheet); only the round status dots are round. |
| 22 | Dot-grid backgrounds | Pass | None. |
| 23 | Excessive em dashes | Pass | No em dashes in UI copy (grep of src/ returns none); en dash only as an empty-cell placeholder. |
| 24 | "It's not X, it's Y" copy | Pass | Not used. |
| 25 | Repetitive checkmark bullet lists | Pass | No ✓ lists; pricing rows say the value ('5 units', 'Unlimited'). |
| 26 | Fake testimonials | Pass | None. No user counts, logos or ratings. Demo data is labelled Demo / Sample everywhere. |
| 27 | Missing real product demo | Pass | Interactive specimen rent book on the homepage + one-tap demo landlord and tenant logins on live data. |
| 28 | Missing skeleton loaders | Pass | Skeletons on listings, listing page, every desk sheet, tenant and admin pages; empty and error states with retry. |
| 29 | Missing Terms | Pass | /terms |
| 30 | Missing Privacy | Pass | /privacy |

## Design QA
- Palette only through Tailwind tokens (DESIGN.md). Contrast on plaster: ink 17.1:1, umber 6.7:1, ochre 5.4:1, due 5.9:1, paid 5.4:1, part 5.1:1; tan on slate 6.0:1.
- Focus: 2px slate outline on every control, skip link, dialogs close on Escape and render in a portal above the header, every input has a visible label.
- Motion: plan drawings stroke themselves in; scroll reveals that hide again when scrolled back up; page fade on route change; modal rise; collection meter and six-month bars grow; sliding dimension-line nav indicator; toasts. `prefers-reduced-motion` turns all of it off (E2E checked: reveal content fully visible).
- Responsive: no horizontal overflow at 375, 768, 1024 and 1440 on public pages, and at 375 on every desk sheet (E2E measured scrollWidth). Ledger turns into cards on phones; desk sheet strip scrolls sideways.
- Screens reviewed by eye: home (all sections), rooms (filters, empty state, mobile filter sheet), listing, register/login, landlord overview/properties/unit editor/tenants/ledger/payment/receipt (screen + print)/requests/inquiries, tenant home/request, public receipt, admin overview/users/listings/audit, 404, legal.
- Fixed during QA: `/api/me` returned 401 when signed out (console noise) → now 200 with no user; listing cards had uneven heights; right-aligned table headers lost their alignment; desk sheet labels were cut off on phones; dialogs were trapped under the sticky header (now portalled); muted helper text was 4.2:1 (now 6.7:1); logo link's accessible name did not include its visible text.

## Security
PBKDF2-SHA256 password hashes (WebCrypto, 100k iterations); random session tokens stored only as SHA-256 hashes; cookie HttpOnly + Secure + SameSite=Lax; CSRF: Origin check + JSON-only writes; rate limits on login, registration, inquiries and tenant code linking; strict CSP (self only) on the app shell, X-Frame-Options DENY, nosniff; every landlord query scoped to the owner; tenants see only their own tenancy; landlord phone numbers never public; admin actions in an audit log. Setup key exists only as a SHA-256 hash in code.

## Known limitations (honest)
- No photo uploads (plan sketches only) and no map search.
- No online payment: Landlord Pro is switched on by the admin after an eSewa/bank payment.
- No email or SMS sending: inquiries and requests show in the dashboard; WhatsApp links open the user's own app; no password-reset email.
- Receipts are rent receipts, not tax invoices.
- Free plan capped at 5 units. Demo data is sample data and resets every 3 hours.
