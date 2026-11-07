export interface Variant {
  id: number;
  a: boolean;
  o: string[];
}

export interface CatalogItem {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  sizes: string[];
  variants: Variant[];
  url: string;
}

export interface CatalogLook {
  name: string;
  description: string;
  image: string;
  products: string[];
}

export interface CatalogData {
  source: string;
  looks: CatalogLook[];
  items: CatalogItem[];
}

export interface BagEntry {
  id: number;
  quantity: number;
}

export const ASSET_BASE = 'https://reel-ref-try-the-look.vercel.app/assets/';

export const NATIVE_CATALOG: CatalogData = {
  source: 'https://nike-makknzjs.myshopify.com/pages/runway',
  looks: [
    {
      name: 'The City Edit',
      description: 'A charcoal knit and easy denim.',
      image: `${ASSET_BASE}original-look-1.webp`,
      products: ['tatum-5-orbit-copy', 'tshirt', 'sweatshirt'],
    },
    {
      name: 'Gallery Opening',
      description: 'A clean white tee and relaxed denim.',
      image: `${ASSET_BASE}original-look-5.webp`,
      products: ['tatum-5-orbit', 'hoodie-black', 'tshirt'],
    },
    {
      name: 'Gallery Opening',
      description: 'Olive knitwear. A grounded palette.',
      image: `${ASSET_BASE}original-look-4.webp`,
      products: ['sweatshirt-plus', 'tatum-5-orbit', 'tshirt'],
    },
    {
      name: 'Studio Day',
      description: 'Black, white and laid-back denim.',
      image: `${ASSET_BASE}original-look-6.webp`,
      products: ['hoodie-black', 'tatum-5-orbit-copy', 'tshirt'],
    },
    {
      name: 'Studio Day',
      description: 'Burgundy layers. A tailored perspective.',
      image: `${ASSET_BASE}original-look-3.webp`,
      products: ['sweatshirt', 'tatum-5-orbit', 'tshirt'],
    },
    {
      name: 'Studio Day',
      description: 'A grey crew and your favourite denim.',
      image: `${ASSET_BASE}original-look-2.webp`,
      products: ['hoodie', 'air-jordan-12-retro-copy', 'tshirt'],
    },
  ],
  items: [
    {
      id: 'tatum-5-orbit-copy',
      name: 'Air Jordan 12 Retro',
      type: 'From the original lookbook',
      price: 149.0,
      image: `${ASSET_BASE}source-tatum-5-orbit-copy.webp`,
      sizes: ['40', '41', '42', '43', '44', '45', '46'],
      variants: [
        { id: 57015167025457, a: true, o: ['40'] },
        { id: 57015167058225, a: true, o: ['41'] },
        { id: 57015167090993, a: true, o: ['42'] },
        { id: 57015167123761, a: true, o: ['43'] },
        { id: 57015167156529, a: true, o: ['44'] },
        { id: 57015167189297, a: true, o: ['45'] },
        { id: 57015167222065, a: true, o: ['46'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/tatum-5-orbit-copy',
    },
    {
      id: 'tshirt',
      name: 'Tshirt',
      type: 'From the original lookbook',
      price: 199.0,
      image: `${ASSET_BASE}source-tshirt.webp`,
      sizes: ['S', 'L', 'M', 'XL'],
      variants: [
        { id: 56835911582001, a: true, o: ['S'] },
        { id: 56835911614769, a: true, o: ['L'] },
        { id: 56835911647537, a: true, o: ['M'] },
        { id: 56835911680305, a: true, o: ['XL'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/tshirt',
    },
    {
      id: 'sweatshirt',
      name: 'Sweatshirt',
      type: 'From the original lookbook',
      price: 199.0,
      image: `${ASSET_BASE}source-sweatshirt.webp`,
      sizes: ['S', 'L', 'M', 'XL'],
      variants: [
        { id: 56835806396721, a: true, o: ['S'] },
        { id: 56835806429489, a: true, o: ['L'] },
        { id: 56835806462257, a: true, o: ['M'] },
        { id: 56835806495025, a: true, o: ['XL'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/sweatshirt',
    },
    {
      id: 'tatum-5-orbit',
      name: 'Tatum 5 Orbit',
      type: 'From the original lookbook',
      price: 149.0,
      image: `${ASSET_BASE}source-tatum-5-orbit.webp`,
      sizes: ['40', '41', '42', '43', '44', '45', '46'],
      variants: [
        { id: 57015166730545, a: true, o: ['40'] },
        { id: 57015166763313, a: true, o: ['41'] },
        { id: 57015166796081, a: true, o: ['42'] },
        { id: 57015166828849, a: true, o: ['43'] },
        { id: 57015166861617, a: true, o: ['44'] },
        { id: 57015166894385, a: true, o: ['45'] },
        { id: 57015166927153, a: true, o: ['46'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/tatum-5-orbit',
    },
    {
      id: 'hoodie-black',
      name: 'Hoodie Black',
      type: 'From the original lookbook',
      price: 199.0,
      image: `${ASSET_BASE}source-hoodie-black.webp`,
      sizes: ['S', 'L', 'M', 'XL'],
      variants: [
        { id: 56836251681073, a: true, o: ['S'] },
        { id: 56836251713841, a: true, o: ['L'] },
        { id: 56836251746609, a: true, o: ['M'] },
        { id: 56836251779377, a: true, o: ['XL'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/hoodie-black',
    },
    {
      id: 'sweatshirt-plus',
      name: 'Sweatshirt Plus',
      type: 'From the original lookbook',
      price: 199.0,
      image: `${ASSET_BASE}source-sweatshirt-plus.webp`,
      sizes: ['S', 'L', 'M', 'XL'],
      variants: [
        { id: 56836143743281, a: true, o: ['S'] },
        { id: 56836143776049, a: true, o: ['L'] },
        { id: 56836143808817, a: true, o: ['M'] },
        { id: 56836143841585, a: true, o: ['XL'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/sweatshirt-plus',
    },
    {
      id: 'hoodie',
      name: 'Hoodie',
      type: 'From the original lookbook',
      price: 199.0,
      image: `${ASSET_BASE}source-hoodie.webp`,
      sizes: ['S', 'L', 'M', 'XL'],
      variants: [
        { id: 56836002185521, a: true, o: ['S'] },
        { id: 56836002218289, a: true, o: ['L'] },
        { id: 56836002251057, a: true, o: ['M'] },
        { id: 56836002283825, a: true, o: ['XL'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/hoodie',
    },
    {
      id: 'air-jordan-12-retro-copy',
      name: 'Luka 5',
      type: 'From the original lookbook',
      price: 149.0,
      image: `${ASSET_BASE}source-air-jordan-12-retro-copy.webp`,
      sizes: ['40', '41', '42', '43', '44', '45', '46'],
      variants: [
        { id: 57015176364337, a: true, o: ['40'] },
        { id: 57015176397105, a: true, o: ['41'] },
        { id: 57015176429873, a: true, o: ['42'] },
        { id: 57015176462641, a: true, o: ['43'] },
        { id: 57015176495409, a: true, o: ['44'] },
        { id: 57015176528177, a: true, o: ['45'] },
        { id: 57015176560945, a: true, o: ['46'] },
      ],
      url: 'https://nike-makknzjs.myshopify.com/products/air-jordan-12-retro-copy',
    },
  ],
};

export function validateCatalog(data: unknown): CatalogData {
  if (!data || typeof data !== 'object') {
    throw new Error('The product list is unavailable.');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.items)) {
    throw new Error('The product list is unavailable.');
  }
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') {
      throw new Error('The product list is unavailable.');
    }
    const it = item as Record<string, unknown>;
    if (
      typeof it.id !== 'string' ||
      !it.id ||
      typeof it.name !== 'string' ||
      !it.name ||
      typeof it.price !== 'number' ||
      !Number.isFinite(it.price) ||
      it.price < 0 ||
      !Array.isArray(it.variants)
    ) {
      throw new Error('The product list is unavailable.');
    }
    for (const v of it.variants) {
      if (!v || typeof v !== 'object') {
        throw new Error('The product list is unavailable.');
      }
      const vr = v as Record<string, unknown>;
      if (
        typeof vr.id !== 'number' ||
        !Number.isSafeInteger(vr.id) ||
        typeof vr.a !== 'boolean' ||
        !Array.isArray(vr.o) ||
        !vr.o.every((opt) => typeof opt === 'string')
      ) {
        throw new Error('The product list is unavailable.');
      }
    }
  }
  return data as CatalogData;
}

export function sanitizeBagEntries(raw: unknown): BagEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid: BagEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.id === 'number' &&
      Number.isSafeInteger(e.id) &&
      typeof e.quantity === 'number' &&
      Number.isSafeInteger(e.quantity) &&
      e.quantity >= 1 &&
      e.quantity <= 20
    ) {
      valid.push({ id: e.id, quantity: e.quantity });
      if (valid.length >= 50) break;
    }
  }
  return valid;
}

export function findVariantInCatalog(
  catalog: CatalogData,
  variantId: number
): { item: CatalogItem; variant: Variant } | null {
  for (const item of catalog.items) {
    for (const variant of item.variants) {
      if (variant.id === variantId) {
        return { item, variant };
      }
    }
  }
  return null;
}

export function addItemsToBagEntries(
  current: BagEntry[],
  toAdd: { id: number; quantity?: number }[],
  catalog: CatalogData
): BagEntry[] {
  const next = current.map((e) => ({ ...e }));
  for (const req of toAdd) {
    const id = Number(req.id);
    const qty = req.quantity ?? 1;
    const match = findVariantInCatalog(catalog, id);
    if (!match || !match.variant.a) {
      throw new Error('Please choose an available size.');
    }
    const existing = next.find((e) => e.id === id);
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + qty);
    } else if (next.length < 50) {
      next.push({ id, quantity: Math.max(1, Math.min(20, qty)) });
    }
  }
  return next;
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(amount: number): string {
  return usdFormatter.format(amount);
}

export function formatShortlistText(entries: BagEntry[], catalog: CatalogData): string {
  const parts: string[] = [
    'RUNWAY — STYLING SHORTLIST',
    'Reference prices; no order or payment has been placed.',
    '',
  ];
  for (const entry of entries) {
    const match = findVariantInCatalog(catalog, entry.id);
    if (!match) continue;
    const size = match.variant.o.join(' / ');
    parts.push(`${match.item.name} · Size ${size} · Quantity ${entry.quantity}\n${match.item.url}`);
  }
  return parts.join('\n\n');
}
