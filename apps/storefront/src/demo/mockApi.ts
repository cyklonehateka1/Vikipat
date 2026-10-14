/**
 * Demo build only (VITE_DEMO=1): answers the storefront's API calls inside the
 * page so the whole flow can be clicked through with no server. Catalogue and
 * rates mirror apps/api's seed data. Nothing leaves the browser: no order is
 * placed and nothing is charged.
 */
import { API_BASE } from '../lib/api';

const photos = import.meta.glob<string>('../assets/work/*.webp', { eager: true, import: 'default' });
const img = (name: string) => photos[`../assets/work/${name}.webp`] ?? '';

type Row = [string, string, string, number, string, string, string, number, boolean];

const products = (
  [
    ['p-tshirt', 'Premium Logo T-Shirt', 'DTF', 85, '1 shirt', 'Soft cotton tee with a crisp full-colour DTF print.', img('dtf'), 40, true],
    ['p-polo', 'Embroidered Polo Shirt', 'Corporate Branding', 140, '1 polo', 'Smart branded polo for teams, events and corporate uniforms.', img('shirts'), 24, true],
    ['p-mug', 'Custom Ceramic Mug', 'Souvenirs', 55, '1 mug', 'Full-wrap personalised mug for gifts, teams and promotions.', img('mugs'), 65, true],
    ['p-labels', 'Premium Product Labels', 'Labels', 180, '100 labels', 'Durable full-colour labels cut to your preferred shape and finish.', img('stickers'), 100, true],
    ['p-boxes', 'Custom Product Boxes', 'Packaging', 480, '50 boxes', 'Branded folding cartons and product packaging built to your dimensions.', '', 50, true],
    ['p-flyers', 'A5 Promotional Flyers', 'Events', 240, '100 flyers', 'Vibrant full-colour flyers for campaigns, launches and events.', '', 100, false],
    ['p-pullup', 'Pull-Up Banner', 'Large Format', 650, '1 banner', 'Portable display system supplied with printed graphic and carry bag.', img('signs'), 12, true],
    ['p-vinyl', 'Outdoor Vinyl Banner', 'Large Format', 220, 'per square metre', 'Weather-resistant banner with reinforced eyelets, ready to hang.', img('printer'), 30, false],
    ['p-tote', 'Personalised Tote Bag', 'Souvenirs', 70, '1 bag', 'Reusable cotton tote printed with your artwork or message.', '', 0, false],
    ['p-logo', 'Logo Design Starter', 'Corporate Branding', 850, '1 package', 'A focused identity starter with logo concepts and production-ready files.', '', 10, false],
    ['p-caps', 'Embroidered Logo Cap', 'Corporate Branding', 95, '1 cap', 'Structured cap with your logo embroidered on the front.', img('caps'), 6, false],
  ] as Row[]
).map(([id, name, category, price, unit, description, image, stock, featured]) => ({
  id: `${id}-0000-4000-8000-000000000000`,
  name,
  category,
  price,
  unit,
  description,
  image,
  stock,
  featured,
  status: 'Active',
}));

type MaterialRow = [string, string, string, number, string, string, string, string];

const materials = (
  [
    ['flexy-banner', 'Flexy / Banner (Outdoor & Indoor)', 'banner', 260, 'Heavyweight weatherproof flex banner with reinforced hem and brass eyelets.', 'Roadside billboards, event backdrops, church & shop front signage', 'Popular', 'shop-signage,events-backdrops'],
    ['sav-sticker', 'SAV / Vinyl Sticker', 'sticker', 240, 'Self-adhesive vinyl for vibrant indoor/outdoor branding and custom decals.', 'Product labeling, packaging, wall murals, window decals', 'Most Versatile', 'stickers-labels'],
    ['oneway-vision', 'Oneway Vision (Perforated Vinyl)', 'sticker', 630, 'Micro-perforated film: full-colour graphics outside, see-through from inside.', 'Vehicle rear windows, shop glass fronts, office privacy branding', 'Premium', 'vehicle-glass'],
    ['transparent-sav', 'Transparent SAV', 'sticker', 410, 'Clear see-through vinyl with rich pigment print for modern glass aesthetics.', 'Glass doors, transparent packaging, minimalist window displays', '', 'vehicle-glass,stickers-labels'],
    ['reflective-sav', 'Reflective SAV (High Visibility)', 'sticker', 650, 'Light-bouncing retroreflective adhesive vinyl for maximum night visibility.', 'Road safety signs, fleet graphics, security gate banners', '', 'vehicle-glass,shop-signage'],
    ['blueback', 'Blueback Poster Paper', 'banner', 410, 'Opaque water-resistant paper with blue reverse to prevent show-through.', 'Short-term outdoor billboards, pasting hoardings, high-res posters', '', 'events-backdrops,shop-signage'],
    ['ash-back-pvc', 'Ash Back / Rigid PVC Board Print', 'board', 730, 'Dense, rigid grey-core board direct print. Lightweight and extremely sturdy.', 'Architectural signage, exhibition stands, durable menu boards', 'Heavy Duty', 'shop-signage,indoor-decor'],
    ['white-back', 'White Back Flex Banner', 'banner', 260, 'Clean pure-white back flex banner for crisp, high-contrast graphics.', 'Indoor stage backdrops, trade shows, photo walls', '', 'events-backdrops,indoor-decor'],
    ['flag', 'Flag Fabric (Wind-Resistant Mesh)', 'fabric', 580, 'Dye-sublimated translucent fabric that flutters gracefully in wind.', 'Teardrop flags, feather banners, corporate flagpoles', '', 'events-backdrops'],
    ['photopaper', 'Photopaper (High Definition Fine Art)', 'finish', 610, 'Ultra-high-definition satin paper for photographic clarity and color range.', 'Framed portraits, museum exhibits, presentation graphics', '', 'indoor-decor'],
    ['cutting-sav', 'Die-Cut SAV Sticker (Print + Cut)', 'sticker', 440, 'Precision contour cutting around any custom shape or logo perimeter.', 'Custom-shaped jar stickers, laptop decals, branded bottle labels', 'Contour Cut', 'stickers-labels'],
    ['cutting-tsav', 'Die-Cut Transparent SAV', 'sticker', 610, 'Contour cutting on clear transparent vinyl films.', 'Clear bottle stickers, cosmetic labels, custom window emblems', '', 'stickers-labels'],
    ['cutting-only', 'Plotter Cutting Only', 'finish', 180, 'Computer-guided blade cutting of client-supplied vinyl media.', 'Lettering cutout, vehicle vinyl stencil, decal trimming', '', 'stickers-labels'],
  ] as MaterialRow[]
).map(([code, name, category, rate, description, typicalUses, badge, outcomes]) => ({
  code,
  name,
  category,
  description,
  typicalUses,
  badge: badge || undefined,
  outcomes: outcomes.split(','),
  ratePesewasPerSqFt: rate,
  designMinimumPesewas: 10000,
  // Same example as the API seed: photo paper only comes in A sizes.
  ...(code === 'photopaper'
    ? {
        allowCustomSize: false,
        fixedSizes: [
          { label: 'A4', width: 8.3, height: 11.7, unit: 'in' as const },
          { label: 'A3', width: 11.7, height: 16.5, unit: 'in' as const },
          { label: 'A2', width: 16.5, height: 23.4, unit: 'in' as const },
          { label: 'A1', width: 23.4, height: 33.1, unit: 'in' as const },
        ],
      }
    : {}),
}));

type EstimateBody = { serviceCode: string; width: number; height: number; unit: string; quantity: number; needsDesign?: boolean };
type Estimate = ReturnType<typeof estimate>;

const estimates = new Map<string, Estimate>();
let estimateSeq = 0;

function estimate(body: EstimateBody) {
  const m = materials.find((x) => x.code === body.serviceCode) ?? materials[0];
  const area = body.unit === 'in' ? (body.width * body.height) / 144 : body.width * body.height;
  const total = area * body.quantity;
  const basePesewas = Math.round((total * m.ratePesewasPerSqFt) / 100) * 100;
  const designFeePesewas = body.needsDesign ? Math.round(m.designMinimumPesewas / 100) * 100 : 0;
  estimateSeq += 1;
  return {
    serviceCode: m.code,
    name: m.name,
    width: body.width,
    height: body.height,
    unit: body.unit,
    quantity: body.quantity,
    areaSqFt: Number(area.toFixed(3)),
    totalAreaSqFt: Number(total.toFixed(3)),
    ratePesewas: m.ratePesewasPerSqFt,
    basePesewas,
    designFeePesewas,
    totalPesewas: basePesewas + designFeePesewas,
    requiresReview: Boolean(body.needsDesign),
    reviewReasons: body.needsDesign ? ['design_fee_requires_review'] : [],
    designMessage: body.needsDesign ? 'Design starts from GH₵100.' : null,
    estimateId: `EST-${String(estimateSeq).padStart(12, '0')}`,
    fingerprint: `fp-${estimateSeq}-demo`,
  };
}

type OrderItem = { name: string; quantity: number; totalPesewas: number; specification: Record<string, never> };
type PlacedOrder = { customerName: string; review: boolean; items: OrderItem[]; totalPesewas: number; createdAt: string };

const orders = new Map<string, PlacedOrder>();

function orderNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VP-';
  for (let i = 0; i < 8; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

type LineBody =
  | { type: 'product'; productId: string; quantity: number }
  | { type: 'large_format'; estimateId: string; needsDesign: boolean; quantity: number };

function placeOrder(body: { customerName: string; items: LineBody[] }) {
  const items = body.items.map((line): OrderItem => {
    if (line.type === 'product') {
      const product = products.find((p) => p.id === line.productId);
      return { name: product?.name ?? 'Product', quantity: line.quantity, totalPesewas: (product?.price ?? 0) * 100 * line.quantity, specification: {} };
    }
    const quote = estimates.get(line.estimateId);
    return { name: quote?.name ?? 'Print job', quantity: line.quantity, totalPesewas: quote?.totalPesewas ?? 0, specification: {} };
  });
  const review = body.items.some((line) => line.type === 'large_format' && line.needsDesign);
  const number = orderNumber();
  orders.set(number, {
    customerName: body.customerName,
    review,
    items,
    totalPesewas: items.reduce((sum, item) => sum + item.totalPesewas, 0),
    createdAt: new Date().toISOString(),
  });
  return { orderNumber: number, status: review ? 'Under review' : 'Awaiting payment', payment: review ? null : { reference: `demo_${number}`, authorizationUrl: '' } };
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000);
const at = (n: number, hour: number, minute = 0) => {
  const d = days(n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** A placed order in this session tracks as itself; any other number shows a sample order in production. */
function trackedOrder(number: string) {
  const placed = orders.get(number);
  if (placed) {
    const paid = !placed.review;
    return {
      orderNumber: number,
      customerName: placed.customerName,
      status: placed.review ? 'Under review' : 'Payment received',
      paymentStatus: paid ? 'paid' : 'unpaid',
      totalPesewas: placed.totalPesewas,
      promisedDate: days(5).toISOString().slice(0, 10),
      createdAt: placed.createdAt,
      updatedAt: placed.createdAt,
      items: placed.items,
      timeline: [
        { status: 'Awaiting payment', note: 'Your order is ready for payment.', createdAt: placed.createdAt },
        ...(paid ? [{ status: 'Payment received', note: '', createdAt: placed.createdAt }] : []),
      ],
    };
  }
  return {
    orderNumber: number,
    customerName: 'Ama Owusu',
    status: 'In production',
    paymentStatus: 'paid',
    totalPesewas: 93300,
    promisedDate: days(6).toISOString().slice(0, 10),
    createdAt: at(-1, 15, 38),
    updatedAt: at(0, 10, 14),
    items: [
      { name: 'Premium Logo T-Shirt', quantity: 10, totalPesewas: 85000, specification: {} },
      { name: 'Flexy / Banner (Outdoor & Indoor)', quantity: 1, totalPesewas: 8300, specification: {} },
    ],
    timeline: [
      { status: 'Awaiting payment', note: 'Your order is ready for payment. Customer selected Mobile Money.', createdAt: at(-1, 15, 38) },
      { status: 'Payment received', note: '', createdAt: at(-1, 15, 40) },
      { status: 'Artwork review', note: 'Your logo is print-ready. No changes needed.', createdAt: at(-1, 16, 2) },
      { status: 'In production', note: 'Your order is now In production.', createdAt: at(0, 10, 14) },
    ],
  };
}

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function readJson(init?: RequestInit) {
  try {
    return typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  } catch {
    return {};
  }
}

async function respond(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  // A short, realistic delay so loading states are seen rather than skipped.
  await wait(path === '/catalog' || path === '/catalog/print-materials' ? 350 : 220);

  if (path === '/catalog') return json(200, { products, settings: null });
  if (path === '/catalog/print-materials') return json(200, materials);
  if (path === '/estimates/large-format' && method === 'POST') {
    const quote = estimate(await readJson(init));
    estimates.set(quote.estimateId, quote);
    return json(200, quote);
  }
  if (path === '/orders' && method === 'POST') return json(201, placeOrder(await readJson(init)));
  if (path.startsWith('/payments/paystack/verify/')) return json(200, { paid: true });
  if (path === '/order-tracking/request-otp') return json(200, { message: 'This is a demo, so no email is sent. Use the code 123456.' });
  if (path === '/order-tracking/verify-otp') {
    const body = await readJson(init);
    if (String(body.code).trim() !== '123456') return json(400, { message: 'That code is not right. In this demo the code is 123456.' });
    return json(200, { order: trackedOrder(String(body.orderNumber || 'VP-4K7Q2M9D').toUpperCase()) });
  }
  if (path === '/quotes/media' && method === 'POST') {
    const file = init?.body instanceof FormData ? init.body.get('file') : null;
    const name = file instanceof File ? file.name : 'artwork.pdf';
    return json(201, { url: `demo://uploads/${encodeURIComponent(name)}`, name });
  }
  if (path === '/quotes' && method === 'POST') return json(201, { id: 'demo-quote' });
  return json(404, { message: 'Not found' });
}

export function installDemoApi() {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(API_BASE)) return realFetch(input, init);
    const path = url.slice(API_BASE.length).split('?')[0];
    return respond(path, init);
  };
}
