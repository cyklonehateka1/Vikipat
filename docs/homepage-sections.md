# Homepage sections

The order of the customer storefront's home page, and the plan we follow when building or changing it. Change this file first when the plan changes, then change the page.

Design language for every section: `design.md`. Business facts: `apps/storefront/src/site.ts`. No invented facts, numbers, testimonials or stock photos.

Status: **Built**, **Next**, **Planned**, **Blocked** (waiting on something).

| # | Section | Job | Content source | Status |
|---|---------|-----|----------------|--------|
| 1 | Header and navigation | Always-reachable nav, search, WhatsApp, Cart. Bottom dock on phones, top bar on desktop | `AppShell.tsx` | Built |
| 2 | Hero | Say what Vikipat does in five seconds; one main button ("Get a price") | Copy in `Home.tsx` | Built |
| 3 | What are we printing? | Task-first entry points into the print flow and the shop, each with a live "from" price | `content/services.ts`, live rates from the API | Built, merged from the two chosen references (see spec below) |
| 4 | Quick price | A small calculator: pick a job, type a size, see the price. Shows "price before you pay" instead of saying it | Print materials and rates from the API (same as the print flow) | Built (see spec below) |
| 5 | How ordering works | Removes the "what happens after I click" worry: size it, send artwork, pay with Mobile Money | Copy in `Home.tsx`; design fee from the API | Built |
| 6 | Ready to order | Off-the-shelf products from the shop | Catalogue from the API (featured first) | Built |
| 7 | Our work | Proof: photos of finished jobs. No made-up testimonials or counts | `content/work.ts` | Built with placeholder stock photos and dummy titles; swap for real jobs when photos arrive. Sits after "Ready to order" |
| 8 | Reassurance | One short row of facts: Mobile Money via Paystack, pickup or delivery, a proof before printing for jobs that need one, order tracking | `components/Reassurance.tsx`, `site.ts` | Built. "Free delivery" was never confirmed, so the copy doesn't claim it |
| 9 | Need something custom? | For jobs that do not fit the tiles: "No design? We make one" and "Ask for a quote" | Contact page quote form | Planned |
| 10 | Track an order and WhatsApp | Two quick cards for people who already ordered or want a person | `site.ts` | Built, now placed after "Ready to order" (move after 9 once 9 exists) |
| 11 | Visit the workshop | Address, hours, map, call and WhatsApp | `site.ts` | Built |
| 12 | Footer | Links, contact, legal | `AppShell.tsx` | Built |

Order logic: intent and price first (2 to 4), then confidence (5, 7, 8), then other ways in (6, 9), then contact (10 to 12).

Lean version if the page feels long: 2, 3, 4, 5, 6, 8, 11. The rest live in the footer or on their own pages.

## Section 3 spec: What are we printing?

Built from two Dribbble references the owner chose. Section type names to search for more: category grid, shop by category, services section, service cards, bento grid.

**From reference 1 (bento with cropped illustrations):**
- The section sits in one white rounded panel on the page ground.
- A headline with one emphasised phrase.
- A bento grid: one tall card on the left, two stacked cards on the right.
- Each big card has a large title, a short description and an illustration that bleeds off the bottom edge and is cropped by it.

**From reference 2 (icon and arrow cards):**
- Header split in two: headline on the left, a grey supporting line on the right.
- Compact cards with an orange circle icon, an outlined circular arrow button under it, and a title with a description to the right.
- On hover the arrow circle fills dark.

**Our version:**
- Three big cards: Banners and signs (tall), Shirts and polos, Stickers and labels. Each has a large, sharp photo bleeding off the card edge.
- Two compact cards: Mugs and gifts, Event backdrops. Each has a photo on top with an orange icon and an arrow button.
- "Car and glass" was taken off: none of the shared documents confirms it as a service (the workbook checkbox is unticked, and vehicle wraps are staff-quoted). Bring it back once the owner confirms it, as a quote-based card.
- The photos are free-licence stock (Pexels), standing in for Vikipat's own work photos. They show the kind of job, never claim to be Vikipat's work, and are listed in `docs/photo-credits.md`. Replace them when real photos arrive.
- Every card is a link (into the print flow, or into the shop) and shows a live "From GH₵…" price from the API. Prices are never written in the page.
- Motion: cards rise in with a stagger, photos zoom in as they arrive and then drift slowly, hover lifts the card, pushes the photo in and fills the arrow.
- Phones: one column, each card with its photo. Tablet: compact cards become rows with the photo on the left.

## Section 4 spec: Quick price

Built by combining five calculator references the owner chose:
- **Loan calculator (mobile):** plain labels above inputs, plus and minus buttons around a number, a tinted result box, one full-width button.
- **Solar cost calculator:** big selectable cards (the chosen one turns dark), numbered steps, a summary of the choices.
- **Car cost of ownership:** chips for options, a result broken into rows with a bar showing each row's share.
- **Solar dark mode:** the dark result surface against the light form.
- **Credit estimator:** a segmented toggle (I have artwork / Design it for me) and a recommended-plan style card with one dark call to action.

**How it works**
- Four jobs (banners and signs, stickers and labels, event backdrops, indoor prints). Vehicle and glass is left out because it is quoted by staff.
- Step 1 job cards, step 2 size chips (the job's own presets, or a custom size with plus and minus buttons and a feet or inches switch), step 3 material chips, quantity and artwork.
- The dark price card shows the live total, a to-scale picture of the size next to a person, and a breakdown with bars (print, and design when chosen).
- It prices exactly like the print flow: an instant figure on the device, confirmed by the server 300 ms later, so the number always matches what the visitor sees when ordering. A single sticker too small to price says so instead of showing GH₵0.
- "Continue with this size" opens the print flow already filled in (`/print?need=&material=&step=size&w=&h=&u=&q=&design=1`).
- Phones: a small price pill follows the visitor while the price card is off screen and hides when it is in view. Desktop: the price card sticks beside the steps.

**Open questions for the owner (from `VIKIPAT_PRICING_AND_SERVICE_SPEC_DRAFT.md`)**
- Rounding rule: the code rounds to the nearest cedi, but the price list's own worked examples round differently (GH₵23.00 for a GH₵23.40 banner).
- The design fee (from GH₵100) and any minimum job charge are placeholders until confirmed.

## Rules for the whole page
- One main action per screen. Section headings use the poster face with one orange phrase.
- Buttons are flat: no thick outlines and no inset or drop shadows.
- Photos in "What are we printing?" and on product cards (catalogue images); vector illustration in the hero, the ordering steps and the map.
- Check every change at 360, 390, 768, 1024 and 1440 px.
