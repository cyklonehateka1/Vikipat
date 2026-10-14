# Photo credits

The five photos on the home page's "What are we printing?" cards are free-licence stock photos from Pexels. They stand in until Vikipat's own work photos arrive. They show the kind of job, not Vikipat's finished work, so no caption or alt text claims they are Vikipat's.

Licence: [Pexels License](https://www.pexels.com/license/). Free for commercial use, attribution not required. Photographer names were not available to us automatically; each photo's Pexels page (linked below) shows its author.

| Card | Photo (Pexels page) | Files |
|------|--------------------|-------|
| Banners & signs | [Posters for theatre festival on building columns](https://www.pexels.com/photo/posters-for-theatre-festival-on-building-columns-38755330/) | `src/assets/stock/signs-*.webp` |
| Shirts & polos | [Man in black T-shirt with "Lab Hero" design](https://www.pexels.com/photo/man-in-black-t-shirt-with-lab-hero-design-37232797/) | `src/assets/stock/shirts-*.webp` |
| Stickers & labels | [Close-up of a sheet of stickers](https://www.pexels.com/photo/close-up-of-a-sheet-of-stickers-16605272/) | `src/assets/stock/stickers-*.webp` |
| Mugs & gifts | [Coffee mugs on a wooden crate](https://www.pexels.com/photo/coffee-mugs-on-a-wooden-crate-13360743/) | `src/assets/stock/mugs-*.webp` |
| Event backdrops | [Elegant 50th birthday celebration decor setup](https://www.pexels.com/photo/elegant-50th-birthday-celebration-decor-setup-34278805/) | `src/assets/stock/events-*.webp` |

Each photo is stored twice: `-sm.webp` (720 px wide, for phones) and `-lg.webp` (1400 px wide, for laptops and retina screens). The mapping to cards, alt text and crop position is in `src/content/serviceImages.ts`.

To use a real Vikipat photo: export it at 720 px and 1400 px wide as WebP, replace the two files for that card, and update the alt text in `serviceImages.ts`. Then remove that row from this table.

Before launch, look again at the person in the shirts photo and confirm you are comfortable using them; the licence allows it, and swapping them for Vikipat's own photos is better.


## "Our work" section (placeholder)

The three cards in "Our work" reuse the Banners, Shirts and Event backdrop photos above, with made-up titles in `src/content/work.ts`. They are dummy content, not Vikipat's finished jobs. Replace the list (titles, categories, photos, links) with real jobs when client photos arrive.
