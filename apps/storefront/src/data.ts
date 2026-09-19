/**
 * Editorial content that does not belong to the API. Products, departments and
 * store settings all come from the catalogue endpoint; only the written
 * material lives here.
 */
export type Faq = {
  code: string;
  group: string;
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    code: '01',
    group: 'Ordering & Quotes',
    question: 'How do I place an order or request a quote?',
    answer:
      'Browse our catalogue, select your desired products and quantities, and click "Add to List". When you are ready, open your Order List and click "Send on WhatsApp". WhatsApp will open with your complete specifications, product refs, and estimated total already formatted. Our team will review your order, check stock/specs, and confirm within minutes.',
  },
  {
    code: '02',
    group: 'Ordering & Quotes',
    question: 'Do I need to register or create an account?',
    answer:
      'No. We believe in frictionless commerce. Your quote list is saved locally on your device. You do not need to remember any passwords or fill in lengthy registration forms—you interact directly with our studio production team.',
  },
  {
    code: '03',
    group: 'Ordering & Quotes',
    question: 'Can I request customizations not listed on the website?',
    answer:
      'Absolutely! Vikipat handles bespoke commercial projects every day. If you require custom dimensions, specialized paper stock, embossing, metallic foil stamping, or custom apparel cuts, simply reach out to us directly on WhatsApp or call our counter.',
  },
  {
    code: '04',
    group: 'Artwork & Design',
    question: 'What file formats do you accept for printing?',
    answer:
      'We accept vector files (PDF, AI, EPS, SVG) and high-resolution raster files (PNG, TIFF, PSD, JPG at 300 DPI or higher with CMYK color profile). If you have artwork with bleeds, please include 3mm bleed margins on all sides.',
  },
  {
    code: '05',
    group: 'Artwork & Design',
    question: 'What if I don’t have print-ready artwork or need a design created?',
    answer:
      'Our in-house creative design team can assist! From our "Logo Design Starter" package to production pre-flight checks and layout adjustments, we ensure your visual assets look crisp, vibrant, and aligned with your brand identity before we press print.',
  },
  {
    code: '06',
    group: 'Artwork & Design',
    question: 'Do you provide a proof before final production?',
    answer:
      'Yes. For every customized print or branded order, we send a digital visual proof (mockup) for your approval before full production commences. For high-volume corporate contracts, physical sample proofs can also be prepared.',
  },
  {
    code: '07',
    group: 'Turnaround & Delivery',
    question: 'What is your standard production turnaround time?',
    answer:
      'Standard turnaround is typically 1 to 3 business days depending on order size and finishing options. Fast-track and same-day turnaround are available in Accra for select urgent business print and stationery jobs when requested early.',
  },
  {
    code: '08',
    group: 'Turnaround & Delivery',
    question: 'Where do you deliver, and can I pick up my order in person?',
    answer:
      'We deliver daily across Greater Accra via direct dispatch, and nationwide across Ghana via reliable regional courier services. You can also pick up your order from our workshop on Mallam–Gbawe Road, opposite Zen Filling Station.',
  },
  {
    code: '09',
    group: 'Payment & Pricing',
    question: 'How does payment work?',
    answer:
      'We accept Mobile Money (MTN, Telecel, AT), direct Ghanaian bank transfers, and cash upon counter pickup. Once your order specs, physical proof, and delivery terms are agreed on WhatsApp, we issue an invoice with our official payment details.',
  },
  {
    code: '10',
    group: 'Payment & Pricing',
    question: 'Do you offer bulk volume discounts for corporate clients?',
    answer:
      'Yes. We regularly supply corporate organizations, churches, universities, event planners, NGOs, and startups. We provide attractive tiered pricing on high-volume apparel, stationery, mugs, and merchandise. Mention your target quantity for a custom volume quote.',
  },
];
