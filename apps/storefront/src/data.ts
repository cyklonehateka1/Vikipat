/**
 * Written help content that does not belong to the API. Keep every answer true
 * to how the storefront and the workshop actually work.
 */
export type Faq = {
  group: string;
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    group: 'Ordering',
    question: 'How do I order?',
    answer:
      'Pick a job under Print (banners, signs, stickers and more) or a product in the Shop. You see the price as you choose the size and quantity. Add it to your cart, check out, and pay with Mobile Money. If you prefer, you can send the whole cart to us on WhatsApp instead.',
  },
  {
    group: 'Ordering',
    question: 'Do I need an account?',
    answer:
      'No. Your cart is saved on your phone. At checkout you give us your name, phone number and email, and you track your order with your order number and a code we email you.',
  },
  {
    group: 'Ordering',
    question: 'Can you make something that is not on the site?',
    answer:
      'Yes. Send us the details through the quote form or on WhatsApp: what it is, the size, how many, and a photo or sketch if you have one.',
  },
  {
    group: 'Ordering',
    question: 'Do you give prices for large orders?',
    answer:
      'Yes. For large quantities, for example uniforms for a whole team, send us the item, the quantity and your deadline and we will quote you.',
  },
  {
    group: 'Artwork',
    question: 'What files can I send?',
    answer:
      'You can upload PDF, PNG, JPG or WebP files up to 10 MB. For AI, EPS or bigger files, share a Google Drive, WeTransfer or Dropbox link. Use high-resolution files (300 DPI at the printed size) and leave 3 mm of bleed on each side.',
  },
  {
    group: 'Artwork',
    question: 'I do not have a design. Can you make one?',
    answer:
      'Yes. Choose "Design it for me" when you add a print job. The starting design price is shown there, and we confirm the final design price with you before you pay.',
  },
  {
    group: 'Artwork',
    question: 'Will I see the design before you print?',
    answer:
      'Yes. For custom and branded work we send you a digital proof to approve before we print anything.',
  },
  {
    group: 'Payment',
    question: 'How do I pay?',
    answer:
      'At checkout you pay with Mobile Money (MTN, Telecel or AT) on Paystack’s secure page. If your order includes design work, we confirm the price with you first and you pay after that. Card payments are not available yet.',
  },
  {
    group: 'Delivery and pickup',
    question: 'How long does printing take?',
    answer:
      'Most jobs are ready in 1 to 3 working days, depending on the size and finishing. If you have a deadline, add it at checkout and we will tell you if we can meet it.',
  },
  {
    group: 'Delivery and pickup',
    question: 'Can I pick up my order, or do you deliver?',
    answer:
      'Both. Pickup is free at our workshop on Mallam–Gbawe Road, opposite Zen Filling Station. We also deliver in Accra and across Ghana, and confirm the delivery fee with you before we send it.',
  },
  {
    group: 'Delivery and pickup',
    question: 'How do I track my order?',
    answer:
      'Open Track, enter the order number from your email and the email you ordered with, then type the code we send you.',
  },
];
