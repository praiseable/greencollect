// Money base-unit compatibility middleware.
// Canonical business unit is now PKR rupees. Legacy *Paisa keys are preserved as API aliases
// during the transition so existing backend code and older clients keep working.

const RUPEE_ALIAS_MARKER = '__moneyUnitRupeesAliasesApplied';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(Buffer.isBuffer(value));
}

function rupeesToPaisaKey(key) {
  if (key.endsWith('Rupees')) return `${key.slice(0, -6)}Paisa`;
  if (key.endsWith('_rupees')) return `${key.slice(0, -7)}_paisa`;
  return null;
}

function paisaToRupeesKey(key) {
  if (key.endsWith('Paisa')) return `${key.slice(0, -5)}Rupees`;
  if (key.endsWith('_paisa')) return `${key.slice(0, -6)}_rupees`;
  return null;
}

function mapRequestAliases(value) {
  if (Array.isArray(value)) {
    value.forEach(mapRequestAliases);
    return value;
  }
  if (!isPlainObject(value)) return value;

  Object.keys(value).forEach((key) => {
    const nested = value[key];
    mapRequestAliases(nested);

    const legacyKey = rupeesToPaisaKey(key);
    if (legacyKey && value[legacyKey] === undefined) {
      value[legacyKey] = value[key];
    }
  });
  return value;
}

function addResponseAliases(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    return value.map((item) => addResponseAliases(item, seen));
  }
  if (!isPlainObject(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);

  Object.keys(value).forEach((key) => {
    value[key] = addResponseAliases(value[key], seen);
    const aliasKey = paisaToRupeesKey(key);
    if (aliasKey && value[aliasKey] === undefined) {
      value[aliasKey] = value[key];
    }
  });

  if (value.moneyBaseUnit === undefined) value.moneyBaseUnit = 'rupees';
  return value;
}

function moneyUnitRequestAliasMiddleware(req, _res, next) {
  mapRequestAliases(req.body);
  mapRequestAliases(req.query);
  mapRequestAliases(req.params);
  next();
}

function moneyUnitResponseAliasMiddleware(_req, res, next) {
  if (res[RUPEE_ALIAS_MARKER]) return next();
  res[RUPEE_ALIAS_MARKER] = true;
  const originalJson = res.json.bind(res);
  res.json = function jsonWithRupeeAliases(payload) {
    return originalJson(addResponseAliases(payload));
  };
  next();
}

module.exports = {
  moneyUnitRequestAliasMiddleware,
  moneyUnitResponseAliasMiddleware,
  addResponseAliases,
  mapRequestAliases,
};