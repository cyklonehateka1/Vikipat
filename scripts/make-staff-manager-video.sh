#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/artifacts/staff-manager-video"
FONT="/System/Library/Fonts/Avenir Next.ttc"
LOGO="$ROOT_DIR/apps/storefront/src/assets/logo.png"
mkdir -p "$OUT_DIR/scenes"

VOICEOVER="Welcome to Vikipatana. Here is how staff and managers use the apps to keep every order simple and accurate.

Staff start with the online shop. Open vikipat.com on any phone, browse by department, or use search to find exactly what a customer needs.

Open a product to check its size, current price and availability. Add it to the order list, then adjust quantities as the customer confirms each item.

Before sending, review the complete list and estimated total. Tap Send the list on WhatsApp. The message is prepared automatically, ready for the staff member to send and confirm stock, delivery and payment with the customer.

Managers use dash.vikipat.com. Sign in with the approved work account to open the secure dashboard. On a phone, tap the menu button to reach every section.

The overview shows product totals, active listings, low-stock items and catalogue health at a glance.

In Products, add a new item or update its name, department, description, image and status. Use Categories to check how the catalogue is organised.

Use Stock Activity whenever goods arrive, sell out or are counted. Enter the new quantity and a clear reason so every adjustment remains traceable.

Labels and Pricing is where managers update prices and choose whether a product is active or still a draft. Insights shows weekly activity and the catalogue mix.

Finally, Settings holds the public business details. Keep them accurate, save your changes, and sign out when you are finished. Staff serve customers quickly. Managers keep the catalogue reliable. Together, both apps keep Vikipatana ready for every order."

say -v Samantha -r 210 -o "$OUT_DIR/voice.aiff" "$VOICEOVER"

make_scene() {
  local number="$1" eyebrow="$2" title_one="$3" title_two="$4" body_one="$5" body_two="$6" accent="$7"
  local svg="$OUT_DIR/scenes/$number.svg"
  local png="$OUT_DIR/scenes/$number.svg.png"
  cat > "$svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#170d18"/>
  <circle cx="920" cy="230" r="350" fill="${accent}" opacity=".08"/>
  <circle cx="100" cy="1700" r="290" fill="${accent}" opacity=".05"/>
  <rect x="64" y="610" width="952" height="860" rx="36" fill="#ffffff" opacity=".06"/>
  <rect x="64" y="610" width="10" height="860" rx="5" fill="${accent}"/>
  <text x="96" y="715" fill="${accent}" font-family="Avenir Next" font-weight="700" font-size="34" letter-spacing="5">${eyebrow}</text>
  <text x="96" y="855" fill="#ffffff" font-family="Avenir Next" font-weight="700" font-size="76">
    <tspan x="96">${title_one}</tspan><tspan x="96" dy="94">${title_two}</tspan>
  </text>
  <text x="96" y="1160" fill="#ddd2df" font-family="Avenir Next" font-size="40">
    <tspan x="96">${body_one}</tspan><tspan x="96" dy="60">${body_two}</tspan>
  </text>
  <text x="96" y="1780" fill="#9f91a2" font-family="Avenir Next" font-size="28">${number} / 10</text>
</svg>
SVG
  qlmanage -t -s 1920 -o "$OUT_DIR/scenes" "$svg" >/dev/null 2>&1
  ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$png" -loop 1 -i "$LOGO" \
    -filter_complex "[0:v]scale=1080:1920[base];[1:v]scale=330:-1[logo];[base][logo]overlay=(W-w)/2:170:format=auto" \
    -t 9 -r 30 -an -c:v libx264 -pix_fmt yuv420p -preset medium "$OUT_DIR/scenes/$number.mp4"
}

make_scene 01 "STAFF APP" "Find what the" "customer needs" "Browse departments" "or search the shop" "#57d4c8"
make_scene 02 "PRODUCT DETAILS" "Check before" "you add" "Confirm the size, price" "and stock status" "#57d4c8"
make_scene 03 "ORDER LIST" "Build the order" "together" "Add items and adjust" "each quantity" "#57d4c8"
make_scene 04 "WHATSAPP HANDOFF" "Review. Send." "Confirm." "Check the total, then send" "the prepared list" "#57d4c8"
make_scene 05 "MANAGER APP" "Secure access" "on any phone" "Open the dashboard and" "use the mobile menu" "#d899e1"
make_scene 06 "OVERVIEW" "See what needs" "attention" "Products, low stock and" "catalogue health" "#d899e1"
make_scene 07 "CATALOGUE" "Keep products" "accurate" "Edit details, images," "departments and status" "#d899e1"
make_scene 08 "STOCK ACTIVITY" "Record every" "stock change" "Enter the new quantity" "and a clear reason" "#d899e1"
make_scene 09 "PRICING + INSIGHTS" "Control the" "storefront" "Update prices and review" "weekly activity" "#d899e1"
make_scene 10 "ONE CONNECTED TEAM" "Ready for" "every order" "Staff serve quickly." "Managers keep it reliable." "#f0bb59"

for f in "$OUT_DIR"/scenes/*.mp4; do printf "file '%s'\n" "$f"; done > "$OUT_DIR/scenes.txt"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$OUT_DIR/scenes.txt" -i "$OUT_DIR/voice.aiff" \
  -filter_complex "[1:a]apad=pad_dur=90,atrim=0:90,volume=1.15[a]" -map 0:v -map "[a]" \
  -t 90 -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT_DIR/vikipat-staff-manager-guide.mp4"

ffmpeg -hide_banner -loglevel error -y -ss 00:00:45 -i "$OUT_DIR/vikipat-staff-manager-guide.mp4" -frames:v 1 "$OUT_DIR/preview.png"
echo "$OUT_DIR/vikipat-staff-manager-guide.mp4"
