const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Urdu numerals
const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toUrduNumerals(n) {
  return String(n).replace(/[0-9]/g, (d) => urduNumerals[parseInt(d)]);
}

// Format amount from paisa to display string
function formatCurrency(amountPaisa, currency, lang = 'en') {
  const amount = currency.decimalDigits > 0
    ? (Number(amountPaisa) / Math.pow(10, currency.decimalDigits))
    : Number(amountPaisa);

  let formatted;
  if (lang === 'ur') {
    formatted = toUrduNumerals(amount.toLocaleString('en-PK'));
  } else {
    formatted = amount.toLocaleString('en-PK');
  }

  if (currency.symbolPosition === 'PREFIX') {
    return `${currency.symbol} ${formatted}`;
  }
  return `${formatted} ${currency.symbol}`;
}

// Convert between currencies
async function convertCurrency(amountPaisa, fromCurrencyId, toCurrencyId) {
  if (fromCurrencyId === toCurrencyId) return amountPaisa;

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      baseCurrencyId_targetCurrencyId: {
        baseCurrencyId: fromCurrencyId,
        targetCurrencyId: toCurrencyId,
      },
    },
  });

  if (!rate) return amountPaisa; // No rate found, return original
  return Math.round(Number(amountPaisa) * Number(rate.rate));
}

// Get default currency for country
async function getDefaultCurrency(countryId = 'PK') {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    include: { defaultCurrency: true },
  });
  return country?.defaultCurrency || null;
}

// Add formatted prices to listing/transaction response
function addFormattedPrice(item, currency, lang = 'en') {
  if (item.pricePaisa !== undefined) {
    item.priceFormatted = formatCurrency(item.pricePaisa, currency, lang);
  }
  if (item.amountPaisa !== undefined) {
    item.amountFormatted = formatCurrency(item.amountPaisa, currency, lang);
  }
  return item;
}

module.exports = {
  formatCurrency,
  convertCurrency,
  getDefaultCurrency,
  addFormattedPrice,
  toUrduNumerals,
};
