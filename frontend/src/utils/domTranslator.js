const phraseMap = {
  dashboard: 'Dashibodi',
  properties: 'Mali',
  property: 'Mali',
  units: 'Vitengo',
  tenants: 'Wapangaji',
  payments: 'Malipo',
  billing: 'Malipo ya Mfumo',
  analytics: 'Takwimu',
  financial: 'Fedha',
  maintenance: 'Matengenezo',
  media: 'Midia',
  email: 'Barua pepe',
  profile: 'Wasifu',
  notifications: 'Arifa',
  workflows: 'Mtiririko wa kazi',
  timeline: 'Muda',
  inventory: 'Hesabu',
  visitors: 'Wageni',
  utilities: 'Huduma',
  utility: 'Huduma',
  insurance: 'Bima',
  disputes: 'Migogoro',
  emergency: 'Dharura',
  register: 'Jisajili',
  login: 'Ingia',
  logout: 'Toka',
  settings: 'Mipangilio',
  save: 'Hifadhi',
  update: 'Sasisha',
  delete: 'Futa',
  add: 'Ongeza',
  create: 'Tengeneza',
  cancel: 'Ghairi',
  search: 'Tafuta',
  loading: 'Inapakia',
  submit: 'Tuma',
  success: 'Imefanikiwa',
  failed: 'Imeshindikana',
  pending: 'Inasubiri',
  amount: 'Kiasi',
  status: 'Hali',
  date: 'Tarehe',
  due: 'Inadaiwa',
  overdue: 'Imechelewa',
  name: 'Jina',
  phone: 'Simu',
  address: 'Anwani',
  notes: 'Maelezo',
  more: 'Zaidi',
  light: 'Mwanga',
  dark: 'Giza',
  language: 'Lugha',
  english: 'Kiingereza',
  swahili: 'Kiswahili',
  history: 'Historia',
  pay: 'Lipa',
  rent: 'Kodi',
  payment: 'Malipo',
  tenant: 'Mpangaji',
  owner: 'Mmiliki',
  landlord: 'Mwenye nyumba',
  summary: 'Muhtasari',
  reports: 'Ripoti',
  warning: 'Tahadhari',
  yes: 'Ndiyo',
  no: 'Hapana',
};

const fullPhraseMap = {
  'pay rent': 'Lipa Kodi',
  'payment history': 'Historia ya Malipo',
  'tenant rating': 'Ukadiriaji wa Mpangaji',
  'payment alerts': 'Arifa za Malipo',
  'tax deductions': 'Makato ya Kodi',
  'voice notes': 'Vidokezo vya Sauti',
  'landlord network': 'Mtandao wa Wenye Nyumba',
  'pet policy': 'Sera ya Wanyama',
  'qr inspections': 'Ukaguzi wa QR',
  'admin monetization': 'Usimamizi wa Mapato',
  'occupancy forecast': 'Utabiri wa Ujazi',
  'maintenance inventory': 'Hesabu ya Matengenezo',
  'visitor log': 'Daftari la Wageni',
  'utility meters': 'Mita za Huduma',
  'insurance warranty': 'Bima na Dhamana',
  'dispute log': 'Daftari la Migogoro',
  'use current location': 'Tumia Eneo la Sasa',
  'add tenant': 'Ongeza Mpangaji',
  'add property': 'Ongeza Mali',
  'add unit': 'Ongeza Kitengo',
  'add payment': 'Ongeza Malipo',
};

const textNodeOriginal = new WeakMap();
const attrOriginal = new WeakMap();
let observer = null;
let isTranslating = false;

const skippableTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE']);

function isProbablyDynamicValue(value) {
  if (!value) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  if (/^\d+([.,]\d+)?$/.test(trimmed)) return true;
  if (/^[-+]?\d+([.,]\d+)?%$/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

function toSwahiliText(input) {
  if (!input || isProbablyDynamicValue(input)) return input;
  const source = String(input);
  const fullKey = source.trim().toLowerCase();

  if (fullPhraseMap[fullKey]) {
    return fullPhraseMap[fullKey];
  }

  return source.replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, (match) => {
    const key = match.toLowerCase();
    const mapped = phraseMap[key];
    if (!mapped) return match;
    if (match[0] === match[0].toUpperCase()) {
      return mapped[0].toUpperCase() + mapped.slice(1);
    }
    return mapped;
  });
}

function translateTextNode(node, lang) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const parent = node.parentElement;
  if (!parent || skippableTags.has(parent.tagName)) return;

  if (!textNodeOriginal.has(node)) {
    textNodeOriginal.set(node, node.nodeValue);
  }
  const original = textNodeOriginal.get(node) || '';
  const nextValue = lang === 'sw' ? toSwahiliText(original) : original;
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateAttributes(el, lang) {
  if (!el || !el.getAttribute) return;
  const attrs = ['placeholder', 'title', 'aria-label'];
  let originalRecord = attrOriginal.get(el);
  if (!originalRecord) {
    originalRecord = {};
    attrOriginal.set(el, originalRecord);
  }

  attrs.forEach((attr) => {
    const current = el.getAttribute(attr);
    if (current == null) return;
    if (!(attr in originalRecord)) {
      originalRecord[attr] = current;
    }
    const original = originalRecord[attr];
    const nextValue = lang === 'sw' ? toSwahiliText(original) : original;
    if (el.getAttribute(attr) !== nextValue) {
      el.setAttribute(attr, nextValue);
    }
  });
}

function walkAndTranslate(root, lang) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current, lang);
    current = walker.nextNode();
  }

  const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
  all.forEach((el) => translateAttributes(el, lang));
}

export function translateDomToLanguage(root, lang) {
  if (!root || typeof document === 'undefined') return;
  isTranslating = true;
  try {
    walkAndTranslate(root, lang === 'sw' ? 'sw' : 'en');
  } finally {
    isTranslating = false;
  }
}

export function startTranslationObserver(lang) {
  if (typeof document === 'undefined') return;
  stopTranslationObserver();
  const target = document.body;
  if (!target) return;

  observer = new MutationObserver((mutations) => {
    if (isTranslating) return;
    isTranslating = true;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node, lang);
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          walkAndTranslate(node, lang);
        }
      });
    });
    isTranslating = false;
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
  });
}

export function stopTranslationObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
