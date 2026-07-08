const prisma = require('./prisma');

const urduNumerals = ['Û°', 'Û±', 'Û²', 'Û³', 'Û´', 'Ûµ', 'Û¶', 'Û·', 'Û¸', 'Û¹'];

function toUrduNumerals(value) {
  return String(value).replace(/[0-9]/g, (d) => urduNumerals[Number(d)]);
}

function toBigIntRupees(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('Money amount must be an integer rupee value');
    return BigInt(value);
  }
  const text = String(value ?? '').trim();
  if (!/^-?\d+$/.test(text)) throw new Error('Money amount must be an integer rupee value');
  return BigInt(text);
}

// Backward-compatible alias: the application base unit is rupees now.
const toBigIntPaisa = toBigIntRupees;

function normalizeCurrency(currency = 'PKR') {
  if (typeof currency === 'string') {
    return {
      id: currency,
      symbol: currency === 'PKR' ? 'â‚¨' : currency,
      symbolNative: currency === 'PKR' ? 'â‚¨' : currency,
      symbolPosition: 'PREFIX',
      decimalDigits: 0,
    };
  }
  return {
    id: currency.id || 'PKR',
    symbol: currency.symbol || currency.symbolNative || 'â‚¨',
    symbolNative: currency.symbolNative || currency.symbol || 'â‚¨',
    symbolPosition: currency.symbolPosition || 'PREFIX',
    decimalDigits: 0,
  };
}

function groupThousands(value) {
  const s = String(value);
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatRupeesNumber(amountRupees, _decimalDigits = 0, lang = 'en') {
  let amount = toBigIntRupees(amountRupees);
  const negative = amount < 0n;
  if (negative) amount = -amount;
  let formatted = groupThousands(amount.toString());
  if (negative) formatted = `-${formatted}`;
  return lang === 'ur' ? toUrduNumerals(formatted) : formatted;
}

// Backward-compatible alias: raw values are rupees now.
const formatPaisaNumber = formatRupeesNumber;

function formatCurrency(amountRupees, currency = 'PKR', lang = 'en') {
  const c = normalizeCurrency(currency);
  const symbol = c.symbolNative || c.symbol || c.id || 'PKR';
  const formatted = formatRupeesNumber(amountRupees, 0, lang);
  return c.symbolPosition === 'SUFFIX' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}

async function getCurrency(currencyId = 'PKR') {
  const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
  return currency || normalizeCurrency(currencyId);
}

function formatMoneyFields(itemOrAmount, currency = 'PKR', lang = 'en') {
  if (itemOrAmount === null || itemOrAmount === undefined) return itemOrAmount;
  if (typeof itemOrAmount === 'bigint' || typeof itemOrAmount === 'number' || typeof itemOrAmount === 'string') {
    return formatCurrency(itemOrAmount, currency, lang);
  }
  const item = itemOrAmount;
  const c = item.currency || currency;

  const pairs = [
    ['pricePaisa', 'priceFormatted'],
    ['priceRupees', 'priceFormatted'],
    ['amountPaisa', 'amountFormatted'],
    ['amountRupees', 'amountFormatted'],
    ['offeredPricePaisa', 'offeredPriceFormatted'],
    ['offeredPriceRupees', 'offeredPriceFormatted'],
    ['counterPricePaisa', 'counterPriceFormatted'],
    ['counterPriceRupees', 'counterPriceFormatted'],
    ['finalPricePaisa', 'finalPriceFormatted'],
    ['finalPriceRupees', 'finalPriceFormatted'],
    ['actualPricePaisa', 'actualPriceFormatted'],
    ['actualPriceRupees', 'actualPriceFormatted'],
    ['settlementPricePaisa', 'settlementPriceFormatted'],
    ['settlementPriceRupees', 'settlementPriceFormatted'],
    ['commissionPaisa', 'commissionFormatted'],
    ['commissionRupees', 'commissionFormatted'],
    ['totalPaisa', 'totalFormatted'],
    ['totalRupees', 'totalFormatted'],
    ['availableBalancePaisa', 'availableBalanceFormatted'],
    ['availableBalanceRupees', 'availableBalanceFormatted'],
    ['escrowedBalancePaisa', 'escrowedBalanceFormatted'],
    ['escrowedBalanceRupees', 'escrowedBalanceFormatted'],
    ['balancePaisa', 'balanceFormatted'],
    ['balanceRupees', 'balanceFormatted'],
  ];

  pairs.forEach(([rawKey, formattedKey]) => {
    if (item[rawKey] !== undefined && item[rawKey] !== null) {
      item[formattedKey] = formatCurrency(item[rawKey], c, lang);
    }
  });

  item.moneyBaseUnit = 'rupees';
  return item;
}

module.exports = {
  toUrduNumerals,
  toBigIntRupees,
  toBigIntPaisa,
  formatRupeesNumber,
  formatPaisaNumber,
  formatCurrency,
  formatMoneyFields,
  getCurrency,
};