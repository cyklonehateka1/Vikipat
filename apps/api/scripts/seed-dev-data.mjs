#!/usr/bin/env node
/**
 * Seeds a running Vikipat API instance with realistic, high-volume data across
 * every feature area: staff accounts, catalogue products, quote requests,
 * online/walk-in/salesperson orders, production jobs spread across every
 * stage, pricing drafts, and stock adjustments.
 *
 * This drives the real HTTP API (not raw DB inserts), so every business rule
 * (validation, stock decrement, production workflow transitions, RBAC) runs
 * exactly as it would for a real user. Safe to re-run - it skips records that
 * already exist instead of duplicating them.
 *
 * Usage:
 *   API_BASE=http://127.0.0.1:3001/api node apps/api/scripts/seed-dev-data.mjs
 */

const API = process.env.API_BASE || 'http://127.0.0.1:3000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vikipat.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Vikipat@2026!ChangeMe';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Vikipat@2026!DevSeed1';
const STAFF_TEMP_PASSWORD = process.env.SEED_STAFF_PASSWORD || 'Vikipat@2026!Staff1';

const cookies = new Map();
let csrf = '';

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function updateCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const pair = sc.split(';')[0];
    const idx = pair.indexOf('=');
    const name = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    if (!value || /max-age=0/i.test(sc)) cookies.delete(name);
    else cookies.set(name, value);
  }
}

async function api(path, { method = 'GET', body, allow4xx = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookieStr = cookieHeader();
  if (cookieStr) headers['Cookie'] = cookieStr;
  if (csrf && !['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  updateCookies(res);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok && !allow4xx) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function loginAdmin() {
  for (const password of [ADMIN_PASSWORD, SEED_ADMIN_PASSWORD]) {
    const { status, data } = await api('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password }, allow4xx: true });
    if (status === 201 || status === 200) {
      csrf = data.csrfToken;
      return data;
    }
  }
  throw new Error('Could not log in as admin with either the default or seed password.');
}

async function ensureAdminPasswordChanged(session) {
  if (!session.user.mustChangePassword) return;
  await api('/auth/change-password', { method: 'POST', body: { currentPassword: ADMIN_PASSWORD, newPassword: SEED_ADMIN_PASSWORD } });
  cookies.clear();
  csrf = '';
  const relogin = await loginAdmin();
  console.log(`[auth] Admin password set to ${SEED_ADMIN_PASSWORD}`);
  return relogin;
}

const IMAGES = {
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
  polo: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85',
  mug: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85',
  labels: 'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?auto=format&fit=crop&w=900&q=85',
  boxes: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=85',
  souvenir: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=85',
  banner: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85',
  outdoorBanner: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85',
  tote: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85',
  branding: 'https://images.unsplash.com/photo-1561070791-36c11767b26a?auto=format&fit=crop&w=900&q=85',
  dtfApparel: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85',
  corporate: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=85',
  desk: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=900&q=85',
  events: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85',
};

const EXTRA_PRODUCTS = [
  { name: 'Waterproof Vinyl Labels', category: 'Labels', price: 150, unit: '100 labels', stock: 200, description: 'Durable waterproof labels for outdoor and cold-chain products.', image: IMAGES.labels, featured: false },
  { name: 'Barcode Sticker Labels', category: 'Labels', price: 95, unit: '200 labels', stock: 5, description: 'Sequential barcode stickers for retail and inventory control.', image: IMAGES.labels, featured: false },
  { name: 'Gold Foil Luxury Labels', category: 'Labels', price: 320, unit: '100 labels', stock: 0, description: 'Premium foil-stamped labels for high-end packaging.', image: IMAGES.labels, featured: true },
  { name: 'Kraft Paper Mailer Bags', category: 'Packaging', price: 210, unit: '100 bags', stock: 80, description: 'Recyclable kraft mailers for e-commerce shipping.', image: IMAGES.boxes, featured: false },
  { name: 'Rigid Gift Boxes', category: 'Packaging', price: 560, unit: '20 boxes', stock: 12, description: 'Sturdy rigid boxes with magnetic close for retail gifting.', image: IMAGES.boxes, featured: false },
  { name: 'Bubble Mailers', category: 'Packaging', price: 180, unit: '100 pieces', stock: 0, description: 'Padded mailers for safe parcel shipping.', image: IMAGES.boxes, featured: false },
  { name: 'DTF Transfer Sheets (A4)', category: 'DTF', price: 45, unit: '10 sheets', stock: 150, description: 'Ready-to-press DTF transfer sheets, vivid full-colour.', image: IMAGES.dtfApparel, featured: true },
  { name: 'Kids DTF Printed Tee', category: 'DTF', price: 65, unit: '1 shirt', stock: 30, description: 'Soft cotton kids tee with durable DTF print.', image: IMAGES.tshirt, featured: false },
  { name: 'Full-Back DTF Hoodie Print', category: 'DTF', price: 190, unit: '1 hoodie', stock: 8, description: 'Large-format full-back DTF print on premium hoodie.', image: IMAGES.dtfApparel, featured: false },
  { name: 'Mesh Fence Banner', category: 'Large Format', price: 260, unit: 'per square metre', stock: 25, description: 'Wind-permeable mesh banner for fences and scaffolding.', image: IMAGES.outdoorBanner, featured: false },
  { name: 'Backlit Fabric Display', category: 'Large Format', price: 890, unit: '1 display', stock: 4, description: 'Illuminated fabric lightbox display for retail counters.', image: IMAGES.banner, featured: false },
  { name: 'Foam Board Signage', category: 'Large Format', price: 130, unit: 'per board', stock: 60, description: 'Lightweight rigid foam board for indoor signage.', image: IMAGES.banner, featured: false },
  { name: 'Car Door Magnetic Sign', category: 'Large Format', price: 175, unit: 'pair', stock: 0, description: 'Removable magnetic signage for fleet vehicle branding.', image: IMAGES.outdoorBanner, featured: false },
  { name: 'Corporate Lanyards', category: 'Corporate Branding', price: 12, unit: '1 lanyard', stock: 500, description: 'Woven lanyards with custom logo print.', image: IMAGES.corporate, featured: true },
  { name: 'Branded Notepads', category: 'Corporate Branding', price: 38, unit: '1 notepad', stock: 90, description: 'A5 branded notepads for corporate giveaways.', image: IMAGES.desk, featured: false },
  { name: 'Embroidered Corporate Caps', category: 'Corporate Branding', price: 85, unit: '1 cap', stock: 20, description: 'Structured caps with dense logo embroidery.', image: IMAGES.corporate, featured: false },
  { name: 'ID Card Holders', category: 'Corporate Branding', price: 22, unit: '1 holder', stock: 3, description: 'Branded retractable ID card holders for staff.', image: IMAGES.corporate, featured: false },
  { name: 'Custom Keychains', category: 'Souvenirs', price: 20, unit: '1 keychain', stock: 300, description: 'Acrylic or metal keychains with custom shape and print.', image: IMAGES.souvenir, featured: false },
  { name: 'Engraved Pen Sets', category: 'Souvenirs', price: 55, unit: '1 set', stock: 45, description: 'Laser-engraved executive pen sets for gifting.', image: IMAGES.souvenir, featured: true },
  { name: 'Custom Phone Cases', category: 'Souvenirs', price: 65, unit: '1 case', stock: 0, description: 'Full-wrap printed phone cases, various models.', image: IMAGES.souvenir, featured: false },
  { name: 'Branded Water Bottles', category: 'Souvenirs', price: 48, unit: '1 bottle', stock: 70, description: 'Insulated steel bottles with laser-etched branding.', image: IMAGES.tote, featured: false },
  { name: 'Event Backdrop Banner', category: 'Events', price: 750, unit: '1 backdrop', stock: 6, description: 'Large step-and-repeat backdrop for events and photo walls.', image: IMAGES.events, featured: false },
  { name: 'VIP Wristbands', category: 'Events', price: 15, unit: '1 wristband', stock: 400, description: 'Tamper-evident printed wristbands for event access control.', image: IMAGES.events, featured: false },
  { name: 'Table Runners', category: 'Events', price: 90, unit: '1 runner', stock: 25, description: 'Branded fabric table runners for conferences and galas.', image: IMAGES.events, featured: false },
  { name: 'Custom Balloon Sets', category: 'Events', price: 60, unit: '1 set', stock: 0, description: 'Printed balloon sets for launches and celebrations.', image: IMAGES.events, featured: false, status: 'Draft' },
];

const STAFF_SEED = [
  { name: 'Abena Owusu', email: 'abena.owusu@vikipat.com', role: 'operations_supervisor' },
  { name: 'Kojo Antwi', email: 'kojo.antwi@vikipat.com', role: 'designer' },
  { name: 'Yaw Darko', email: 'yaw.darko@vikipat.com', role: 'production_operator' },
  { name: 'Adjoa Mensah', email: 'adjoa.mensah@vikipat.com', role: 'quality_control' },
  { name: 'Kwabena Boadi', email: 'kwabena.boadi@vikipat.com', role: 'dispatch' },
];

const QUOTE_SEED = [
  { name: 'Kwame Owusu', company: 'Owusu Ventures', phone: '0244000001', email: 'kwame@owusuventures.com', need: 'Corporate Branding', quantity: '500 polo shirts', size: 'Mixed', material: 'Cotton pique', deadline: '2026-10-01', location: 'Accra, East Legon', message: 'Need uniforms for a company-wide launch.' },
  { name: 'Ama Serwaa', company: '', phone: '0244000002', email: 'ama.serwaa@example.com', need: 'Souvenirs', quantity: '200 mugs', location: 'Kumasi' },
  { name: 'Nana Yeboah', company: 'GreenLeaf NGO', phone: '0244000003', email: 'nana@greenleaf.org', need: 'Events', quantity: '1 backdrop + 300 wristbands', deadline: '2026-11-15', location: 'Tema' },
  { name: 'Efua Asante', company: 'Asante Bakery', phone: '0244000004', need: 'Labels', quantity: '2000 labels', material: 'Waterproof vinyl', location: 'Takoradi' },
  { name: 'John Mensah', company: '', phone: '0244000005', email: 'john.mensah@example.com', need: 'Large Format', quantity: '4 pull-up banners', size: '2.7ft x 6.5ft' },
  { name: 'Comfort Adjei', company: 'Adjei & Sons', phone: '0244000006', need: 'Packaging', quantity: '500 mailer boxes', location: 'Accra, Spintex' },
  { name: 'Yaw Boateng', company: '', phone: '0244000007', email: 'yaw.boateng@example.com', need: 'DTF', quantity: '150 printed shirts', deadline: '2026-10-20' },
  { name: 'Abigail Osei', company: 'Osei Events', phone: '0244000008', need: 'Events', quantity: '10 table runners', location: 'Accra' },
  { name: 'Kofi Antwi', company: '', phone: '0244000009', need: 'Corporate Branding', quantity: '100 caps' },
  { name: 'Sarah Nkrumah', company: 'Nkrumah Media', phone: '0244000010', email: 'sarah@nkrumahmedia.com', need: 'Large Format', quantity: '1 backlit display', location: 'Accra' },
  { name: 'Isaac Appiah', company: '', phone: '0244000011', need: 'Souvenirs', quantity: '300 keychains' },
  { name: 'Linda Frimpong', company: 'Frimpong Retail', phone: '0244000012', need: 'Labels', quantity: '5000 barcode labels', location: 'Kumasi' },
  { name: 'Michael Owusu', company: '', phone: '0244000013', email: 'michael.owusu@example.com', need: 'DTF', quantity: '50 hoodies', deadline: '2026-12-01' },
  { name: 'Patricia Boateng', company: 'Boateng & Co', phone: '0244000014', need: 'Packaging', quantity: '1000 kraft bags' },
  { name: 'Emmanuel Darko', company: '', phone: '0244000015', need: 'Corporate Branding', quantity: '250 lanyards + 250 ID holders' },
];

async function ensureStaff() {
  const created = [];
  for (const person of STAFF_SEED) {
    const { status, data } = await api('/admin/staff', { method: 'POST', body: { ...person, temporaryPassword: STAFF_TEMP_PASSWORD }, allow4xx: true });
    if (status === 201 || status === 200) created.push(data);
  }
  console.log(`[staff] ${created.length} new staff account(s) created (temp password: ${STAFF_TEMP_PASSWORD}); existing accounts skipped.`);
}

async function ensureProducts() {
  const { data: existing } = await api('/admin/products');
  const byName = new Map(existing.map((p) => [p.name, p]));
  let createdCount = 0;
  for (const product of EXTRA_PRODUCTS) {
    if (byName.has(product.name)) continue;
    const { status } = await api('/admin/products', { method: 'POST', body: { status: 'Active', featured: false, ...product }, allow4xx: true });
    if (status === 201 || status === 200) createdCount += 1;
  }
  console.log(`[products] ${createdCount} new product(s) created.`);
  const { data: full } = await api('/admin/products');
  return full;
}

async function ensureQuotes() {
  const { data: existing } = await api('/admin/quotes');
  const existingPhones = new Set(existing.map((q) => q.phone));
  let createdCount = 0;
  for (const quote of QUOTE_SEED) {
    if (existingPhones.has(quote.phone)) continue;
    // Public endpoint - no session/CSRF needed, but our helper always attaches
    // the admin cookie if present, which is harmless since the route is public.
    const { status } = await fetchPublicQuote(quote);
    if (status === 201 || status === 200) createdCount += 1;
  }
  console.log(`[quotes] ${createdCount} new quote request(s) created.`);
  const { data: full } = await api('/admin/quotes');
  return full;
}

async function fetchPublicQuote(body) {
  const res = await fetch(`${API}/quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function progressQuotes(quotes) {
  const plan = [
    [0, 'Contacted'], [1, 'Contacted'],
    [2, 'Quoted'], [3, 'Quoted'],
    [4, 'Won'],
    [5, 'Closed'],
  ];
  for (const [index, status] of plan) {
    const quote = quotes[index];
    if (!quote) continue;
    await api(`/admin/quotes/${quote.id}/status`, { method: 'PATCH', body: { status }, allow4xx: true });
  }
  console.log('[quotes] Advanced a sample of quotes through Contacted / Quoted / Won / Closed.');
}

async function fetchServiceCodes() {
  const { data } = await api('/services/large-format');
  return data.map((rule) => rule.code);
}

async function createGuestOrder(payload) {
  const res = await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function createStaffOrder(payload) {
  return api('/admin/orders', { method: 'POST', body: payload, allow4xx: true });
}

function productItem(productId, quantity) {
  return { type: 'product', productId, quantity };
}
function formatItem(serviceCode, width, height, unit, quantity, needsDesign = false) {
  return { type: 'large_format', serviceCode, width, height, unit, quantity, needsDesign };
}

async function seedOrders(products, serviceCodes) {
  const byName = (name) => products.find((p) => p.name === name)?.id;
  const sku = (i) => serviceCodes[i % serviceCodes.length];

  const onlineOrders = [
    { customerName: 'Ama Boateng', customerEmail: 'ama.boateng@example.com', customerPhone: '0201000001', items: [productItem(byName('Custom Ceramic Mug'), 3), productItem(byName('Custom Keychains'), 10)], fulfilmentMethod: 'delivery', deliveryAddress: 'East Legon, Accra' },
    { customerName: 'Kwame Asare', customerEmail: 'kwame.asare@example.com', customerPhone: '0201000002', items: [formatItem(sku(0), 4, 3, 'ft', 2)], fulfilmentMethod: 'pickup' },
    { customerName: 'Efua Owusu', customerEmail: 'efua.owusu@example.com', customerPhone: '0201000003', items: [formatItem(sku(1), 6, 4, 'ft', 1, true)], artworkOption: 'design_service', fulfilmentMethod: 'pickup' },
    { customerName: 'John Mensah', customerEmail: 'john.mensah@example.com', customerPhone: '0201000004', items: [productItem(byName('Premium Logo T-Shirt'), 5), formatItem(sku(2), 3, 3, 'ft', 1)], fulfilmentMethod: 'delivery', deliveryAddress: 'Osu, Accra' },
    { customerName: 'Grace Addo', customerEmail: 'grace.addo@example.com', customerPhone: '0201000005', items: [productItem(byName('Branded Water Bottles'), 20)], fulfilmentMethod: 'delivery', deliveryAddress: 'Spintex, Accra' },
    { customerName: 'Yaw Boadu', customerEmail: 'yaw.boadu@example.com', customerPhone: '0201000006', items: [formatItem(sku(3), 8, 4, 'ft', 1)], fulfilmentMethod: 'pickup' },
    { customerName: 'Comfort Asiedu', customerEmail: 'comfort.asiedu@example.com', customerPhone: '0201000007', items: [productItem(byName('Engraved Pen Sets'), 15)], fulfilmentMethod: 'delivery', deliveryAddress: 'Tema Community 5' },
    { customerName: 'Nana Adjei', customerEmail: 'nana.adjei@example.com', customerPhone: '0201000008', items: [productItem(byName('Premium Product Labels'), 2)], fulfilmentMethod: 'pickup' },
  ];

  let onlineCreated = 0;
  for (const order of onlineOrders) {
    const { status } = await createGuestOrder(order);
    if (status === 201 || status === 200) onlineCreated += 1;
  }
  console.log(`[orders] ${onlineCreated} online order(s) created (unpaid - no live Paystack key in this environment).`);

  const walkInOrders = [
    { customerName: 'Counter Customer 1', customerEmail: 'counter1@example.com', customerPhone: '0202000001', source: 'walk_in', items: [formatItem(sku(4), 3, 3, 'ft', 1)] },
    { customerName: 'Counter Customer 2', customerEmail: 'counter2@example.com', customerPhone: '0202000002', source: 'walk_in', items: [formatItem(sku(5), 4, 3, 'ft', 1, true)], artworkOption: 'design_service' },
    { customerName: 'Counter Customer 3', customerEmail: 'counter3@example.com', customerPhone: '0202000003', source: 'walk_in', items: [formatItem(sku(6), 5, 3, 'ft', 1)] },
    { customerName: 'Counter Customer 4', customerEmail: 'counter4@example.com', customerPhone: '0202000004', source: 'walk_in', items: [formatItem(sku(7), 6, 4, 'ft', 1)] },
    { customerName: 'Counter Customer 5', customerEmail: 'counter5@example.com', customerPhone: '0202000005', source: 'walk_in', items: [formatItem(sku(8), 3, 2, 'ft', 1)] },
    { customerName: 'Counter Customer 6', customerEmail: 'counter6@example.com', customerPhone: '0202000006', source: 'walk_in', items: [formatItem(sku(9), 4, 4, 'ft', 1)] },
    { customerName: 'Counter Customer 7', customerEmail: 'counter7@example.com', customerPhone: '0202000007', source: 'walk_in', items: [formatItem(sku(10), 2, 2, 'ft', 1)] },
    { customerName: 'Counter Customer 8', customerEmail: 'counter8@example.com', customerPhone: '0202000008', source: 'walk_in', items: [formatItem(sku(11), 3, 3, 'ft', 1)] },
    { customerName: 'Counter Customer 9', customerEmail: 'counter9@example.com', customerPhone: '0202000009', source: 'walk_in', items: [formatItem(sku(12), 5, 5, 'ft', 1)] },
    { customerName: 'Counter Customer 10', customerEmail: 'counter10@example.com', customerPhone: '0202000010', source: 'walk_in', items: [formatItem(sku(0), 6, 3, 'ft', 1)] },
  ];
  const salespersonOrders = [
    { customerName: 'Field Client 1', customerEmail: 'field1@example.com', customerPhone: '0203000001', source: 'salesperson', items: [formatItem(sku(1), 4, 3, 'ft', 1)] },
    { customerName: 'Field Client 2', customerEmail: 'field2@example.com', customerPhone: '0203000002', source: 'salesperson', items: [formatItem(sku(2), 3, 3, 'ft', 1)] },
  ];

  const releasableOrders = [];
  for (const order of [...walkInOrders, ...salespersonOrders]) {
    const { status, data } = await createStaffOrder(order);
    if (status === 201 || status === 200) releasableOrders.push(data);
  }
  console.log(`[orders] ${releasableOrders.length} walk-in/salesperson order(s) created.`);
  return releasableOrders;
}

const NEXT_STAGES = {
  intake: ['artwork_review', 'blocked', 'cancelled'],
  artwork_review: ['proofing', 'production_ready', 'blocked', 'cancelled'],
  proofing: ['artwork_review', 'production_ready', 'blocked', 'cancelled'],
  production_ready: ['in_production', 'artwork_review', 'blocked', 'cancelled'],
  in_production: ['quality_check', 'blocked', 'cancelled'],
  quality_check: ['ready', 'in_production', 'blocked', 'cancelled'],
  ready: ['fulfilled', 'quality_check', 'blocked', 'cancelled'],
  fulfilled: [],
  blocked: ['artwork_review', 'cancelled'],
  cancelled: [],
};

function pathTo(start, target) {
  if (start === target) return [];
  const queue = [[start]];
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const next of NEXT_STAGES[last] || []) {
      if (next === target) return [...path.slice(1), next];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  throw new Error(`No workflow path from ${start} to ${target}`);
}

async function advanceJob(jobId, currentStage, targetStage) {
  let stage = currentStage;
  for (const next of pathTo(currentStage, targetStage)) {
    await api(`/admin/orders/production/jobs/${jobId}`, { method: 'PATCH', body: { stage: next } });
    stage = next;
  }
  return stage;
}

async function seedProductionPipeline() {
  const { data: intake } = await api('/admin/orders/production/intake');
  let releasedCount = 0;
  for (const order of intake) {
    await api(`/admin/orders/${order.id}/release`, { method: 'POST', allow4xx: true });
    releasedCount += 1;
  }
  console.log(`[production] Released ${releasedCount} order(s) into production intake.`);

  const { data: jobs } = await api('/admin/orders/production/jobs');
  const targets = ['intake', 'artwork_review', 'proofing', 'production_ready', 'in_production', 'quality_check', 'ready', 'fulfilled', 'blocked', 'cancelled', 'in_production', 'ready'];
  let moved = 0;
  for (let i = 0; i < jobs.length && i < targets.length; i += 1) {
    const job = jobs[i];
    const target = targets[i];
    try {
      await advanceJob(job.id, job.stage, target);
      moved += 1;
    } catch (err) {
      console.log(`[production] Could not move job ${job.jobNumber} to ${target}: ${err.message}`);
    }
  }
  console.log(`[production] Moved ${moved} job(s) across the full stage pipeline (intake -> ... -> fulfilled/blocked/cancelled).`);

  // A couple of staff activity notes for realism.
  const notable = jobs.slice(0, 3);
  for (const job of notable) {
    await api(`/admin/orders/production/jobs/${job.id}/activity`, { method: 'POST', body: { note: 'Pre-flight check complete, proceeding as scheduled.' }, allow4xx: true });
  }
  console.log(`[production] Added activity notes to ${notable.length} job(s).`);
}

async function seedPricingDrafts() {
  const { data: rules } = await api('/admin/pricing/rules');
  const draftTargets = rules.slice(0, 2);
  for (const rule of draftTargets) {
    await api(`/admin/pricing/rules/${rule.id}/draft`, {
      method: 'PATCH',
      body: {
        employeeRatePesewas: rule.employeeRatePesewas,
        marketerRatePesewas: rule.marketerRatePesewas,
        walkInRatePesewas: rule.walkInRatePesewas,
        onlineRatePesewas: rule.onlineRatePesewas + 20,
        designMinimumPesewas: rule.designMinimumPesewas,
        roundingMode: rule.roundingMode,
        changeNote: 'Seed script: draft online rate adjustment for testing the Pricing Studio review flow.',
      },
      allow4xx: true,
    });
  }
  console.log(`[pricing] Saved ${draftTargets.length} pending draft(s) (visible as "Draft" in Pricing Studio, not yet published).`);

  if (rules[2]) {
    const rule = rules[2];
    const draft = await api(`/admin/pricing/rules/${rule.id}/draft`, {
      method: 'PATCH',
      body: {
        employeeRatePesewas: rule.employeeRatePesewas,
        marketerRatePesewas: rule.marketerRatePesewas,
        walkInRatePesewas: rule.walkInRatePesewas,
        onlineRatePesewas: rule.onlineRatePesewas + 10,
        designMinimumPesewas: rule.designMinimumPesewas,
        roundingMode: rule.roundingMode,
        changeNote: 'Seed script: published rate bump to populate version history.',
      },
    });
    await api(`/admin/pricing/drafts/${draft.data.id}/publish`, { method: 'POST' });
    console.log(`[pricing] Published a new version of "${rule.name}" to populate rate version history.`);
  }
}

async function seedStockAdjustments(products) {
  const targets = products.slice(0, 4);
  for (const product of targets) {
    await api(`/admin/products/${product.id}/stock`, {
      method: 'POST',
      body: { stock: product.stock + 25, reason: 'Seed script: incoming stock replenishment' },
      allow4xx: true,
    });
  }
  console.log(`[inventory] Adjusted stock on ${targets.length} product(s) to populate the inventory audit trail.`);
}

async function seedSettings() {
  await api('/admin/settings', {
    method: 'PATCH',
    body: {
      businessName: 'Vikipat Media Solutions',
      phone: '024 236 6523',
      location: 'Mallam–Gbawe Road, opposite Zen Filling Station, Accra',
      currency: 'GHS',
      description: 'Commercial printing press and custom branding studio for businesses, events and everyday people across Ghana.',
      whatsappNotificationsEnabled: false,
      whatsappBusinessNumber: '233555110844',
    },
    allow4xx: true,
  });
  console.log('[settings] Business settings confirmed.');
}

async function main() {
  console.log(`Seeding ${API} ...`);
  let session = await loginAdmin();
  session = (await ensureAdminPasswordChanged(session)) || session;
  console.log(`[auth] Logged in as ${session.user.email} (${session.user.role}).`);

  await ensureStaff();
  const products = await ensureProducts();
  const quotes = await ensureQuotes();
  await progressQuotes(quotes);
  const serviceCodes = await fetchServiceCodes();
  await seedOrders(products, serviceCodes);
  await seedProductionPipeline();
  await seedPricingDrafts();
  await seedStockAdjustments(products);
  await seedSettings();

  console.log('\nDone. The database now has staff across every role, a full product catalogue with');
  console.log('low-stock/out-of-stock/draft products, quotes in every status, online + walk-in +');
  console.log('salesperson orders, production jobs sitting in every workflow stage, pricing drafts');
  console.log('pending publish plus a published version-history entry, and inventory adjustments.');
}

main().catch((err) => {
  console.error('\nSeed script failed:', err.message);
  process.exit(1);
});
