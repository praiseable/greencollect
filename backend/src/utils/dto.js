/**
 * DTO (Data Transfer Object) Serializers
 * 
 * Prevents accidental exposure of sensitive fields (passwordHash, deletedAt, etc.)
 * Skill requirement: Every controller response must use DTO serializers.
 */

/**
 * Serialize user object - removes sensitive fields
 * @param {Object} user - User object from Prisma
 * @param {Array<string>} omitFields - Additional fields to omit
 * @returns {Object} Serialized user object
 */
function serializeUser(user, omitFields = []) {
  if (!user) return null;
  
  const defaultOmit = [
    'passwordHash',
    'deletedAt',
    'accountStatus',
    'createdAt',
    'updatedAt',
  ];
  
  const omit = [...defaultOmit, ...omitFields];
  const serialized = { ...user };
  
  omit.forEach(field => {
    delete serialized[field];
  });
  
  return serialized;
}

/**
 * Serialize listing object - removes sensitive fields
 * @param {Object} listing - Listing object from Prisma
 * @param {Array<string>} omitFields - Additional fields to omit
 * @returns {Object} Serialized listing object
 */
function serializeListing(listing, omitFields = []) {
  if (!listing) return null;
  
  const defaultOmit = [
    'deletedAt',
  ];
  
  const omit = [...defaultOmit, ...omitFields];
  const serialized = { ...listing };
  
  omit.forEach(field => {
    delete serialized[field];
  });
  
  // Convert BigInt pricePaisa to string for JSON serialization
  if (serialized.pricePaisa !== undefined) {
    serialized.pricePaisa = serialized.pricePaisa.toString();
  }
  
  return serialized;
}

/**
 * Serialize array of objects
 * @param {Array} items - Array of objects to serialize
 * @param {Function} serializer - Serializer function to apply to each item
 * @returns {Array} Serialized array
 */
function serializeArray(items, serializer) {
  if (!Array.isArray(items)) return items;
  return items.map(item => serializer(item));
}

/**
 * Generic serializer - removes specified fields
 * @param {Object} obj - Object to serialize
 * @param {Array<string>} omitFields - Fields to omit
 * @returns {Object} Serialized object
 */
function serialize(obj, omitFields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const serialized = { ...obj };
  
  omitFields.forEach(field => {
    delete serialized[field];
  });
  
  return serialized;
}

/**
 * Response helpers - standardized response format
 */
const responseHelpers = {
  ok(data, message = null) {
    return { success: true, data, ...(message && { message }) };
  },
  
  created(data, message = 'Resource created successfully') {
    return { success: true, data, message };
  },
  
  paginated(data, meta) {
    return { success: true, data, meta };
  },
  
  noContent() {
    return { success: true, message: 'Operation completed successfully' };
  },
};

module.exports = {
  serializeUser,
  serializeListing,
  serializeArray,
  serialize,
  ...responseHelpers,
};
