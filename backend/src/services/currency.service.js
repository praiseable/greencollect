const prisma = require('./prisma');

// Urdu numerals
const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toUrduNumerals(value) {
  return String(value).replace(/[0-9]/g, (d) => urduNumerals[Number(d)]);
}

function normalizeCurrency(currency) {
  if (!currency || typeof currency === 'string') {
    const id = currency || 'PKR';
    return {
      id,
      symbol: id === 'PKR' ? '₨' : id,
      symbolNative: id === 'PKR' ? '₨' : id,
      symbolPosition: 'PREFIX',
      decimalDigits: id === 'PKR' ? 2 : 2,
    };
  }
  return {
    id: currency.id || 'PKR',
    symbol: currency.symbol || currency.symbolNative || currency.id || 'PKR',
    symbolNative: currency.symbolNative || currency.symbol || currency.id || 'PKR',
    symbolPosition: currency.symbolPosition || 'PREFIX',
    decimalDigits: Number.isInteger(currency.decimalDigits) ? currency.decimalDigits : 2,
  };
}

function toBigIntPaisa(amountPaisa) {
  if (typeof amountPaisa === 'bigint') return amountPaisa;
  if (amountPaisa && typeof amountPaisa === 'object' && typeof amountPaisa.toString === 'function') {
    return BigInt(amountPaisa.toString());
  }
  if (typeof amountPaisa === 'number') {
    if (!Number.isSafeInteger(amountPaisa)) {
      throw new Error('Money values must be safe integer paisa values');
    }
    return BigInt(amountPaisa);
  }
  if (typeof amountPaisa === 'string' && /^-?\d+$/.test(amountPaisa.trim())) {
    return BigInt(amountPaisa.trim());
  }
  throw new Error('Money values must be integer paisa values');
}

function groupThousands(digits) {
  return String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function decimalPower(decimalDigits) {
  return 10n ** BigInt(Math.max(0, decimalDigits));
}

function formatPaisaNumber(amountPaisa, decimalDigits = 2, lang = 'en') {
  const raw = toBigIntPaisa(amountPaisa);
  const negative = raw < 0n;
  const n = negative ? -raw : raw;
  const scale = decimalPower(decimalDigits);
  const whole = decimalDigits > 0 ? n / scale : n;
  const fractional = decimalDigits > 0 ? n % scale : 0n;
  let formatted = groupThousands(whole.toString());

  if (decimalDigits > 0 && fractional > 0n) {
    let fraction = fractional.toString().padStart(decimalDigits, '0');
    fraction = fraction.replace(/0+$/, '');
    if (fraction) formatted += `.${fraction}`;
  }

  if (negative) formatted = `-${formatted}`;
  return lang === 'ur' ? toUrduNumerals(formatted) : formatted;
}

// Format amount from integer paisa to display string. This function intentionally
// avoids floating point math so PKR/foreign-currency values stay paisa-exact.
function formatCurrency(amountPaisa, currency = 'PKR', lang = 'en') {
  const c = normalizeCurrency(currency);
  const formatted = formatPaisaNumber(amountPaisa, c.decimalDigits, lang);
  const symbol = lang === 'ur' ? (c.symbolNative || c.symbol) : c.symbol;
  if (c.symbolPosition === 'SUFFIX') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol} ${formatted}`;
}

// Convert between currencies using integer paisa and Decimal exchange rates.
async function convertCurrency(amountPaisa, fromCurrencyId, toCurrencyId) {
  const amount = toBigIntPaisa(amountPaisa);
  if (fromCurrencyId === toCurrencyId) return amount;

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      baseCurrencyId_targetCurrencyId: {
        baseCurrencyId: fromCurrencyId,
        targetCurrencyId: toCurrencyId,
      },
    },
  });

  if (!rate) return amount;
  const scaledRate = BigInt(Math.round(Number(rate.rate) * 1_000_000));
  return (amount * scaledRate) / 1_000_000n;
}

// Get default currency for country
async function getDefaultCurrency(countryId = 'PK') {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    include: { defaultCurrency: true },
  });
  return country?.defaultCurrency || null;
}

// Backward-compatible helper: if called with a primitive amount, return a string;
// if called with an object, add formatted fields in-place and return that object.
function addFormattedPrice(itemOrAmount, currency = 'PKR', lang = 'en') {
  if (itemOrAmount === null || itemOrAmount === undefined) return itemOrAmount;

  const primitiveMoney = ['bigint', 'number', 'string'].includes(typeof itemOrAmount);
  const decimalMoney = itemOrAmount && typeof itemOrAmount === 'object'
    && itemOrAmount.constructor
    && ['Decimal', 'DecimalJsLike'].includes(itemOrAmount.constructor.name);
  if (primitiveMoney || decimalMoney) {
    return formatCurrency(itemOrAmount, currency, lang);
  }

  const item = itemOrAmount;
  if (item.pricePaisa !== undefined && item.pricePaisa !== null) {
    item.priceFormatted = formatCurrency(item.pricePaisa, item.currency || currency, lang);
  }
  if (item.amountPaisa !== undefined && item.amountPaisa !== null) {
    item.amountFormatted = formatCurrency(item.amountPaisa, item.currency || currency, lang);
  }
  if (item.totalPaisa !== undefined && item.totalPaisa !== null) {
    item.totalFormatted = formatCurrency(item.totalPaisa, item.currency || currency, lang);
  }
  if (item.actualPricePaisa !== undefined && item.actualPricePaisa !== null) {
    item.actualPriceFormatted = formatCurrency(item.actualPricePaisa, item.currency || currency, lang);
  }
  return item;
}

module.exports = {
  formatCurrency,
  formatPaisaNumber,
  convertCurrency,
  getDefaultCurrency,
  addFormattedPrice,
  toUrduNumerals,
  toBigIntPaisa,
};
