const prisma = require('./prisma');

/**
 * Check if a user can view a listing based on geo-fencing and visibility level
 * @param {Object} user - User object with geoZoneId
 * @param {Object} listing - Listing object with geoZoneId and visibilityLevel
 * @returns {Promise<boolean>} - True if user can view the listing
 */
async function canUserViewListing(user, listing) {
  // PUBLIC visibility: everyone can see
  if (listing.visibilityLevel === 'PUBLIC') {
    return true;
  }

  // If user is not logged in, only PUBLIC listings are visible
  if (!user || !user.geoZoneId) {
    return false;
  }

  // If listing has no geoZone, allow viewing (fallback)
  if (!listing.geoZoneId) {
    return true;
  }

  // If user and listing are in the same zone, allow viewing
  if (user.geoZoneId === listing.geoZoneId) {
    return true;
  }

  // Get user's geoZone hierarchy
  const userZone = await prisma.geoZone.findUnique({
    where: { id: user.geoZoneId },
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: true, // Up to COUNTRY level
            },
          },
        },
      },
    },
  });

  if (!userZone) {
    return false;
  }

  // Get listing's geoZone hierarchy
  const listingZone = await prisma.geoZone.findUnique({
    where: { id: listing.geoZoneId },
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
  });

  if (!listingZone) {
    return false;
  }

  // Check visibility level
  switch (listing.visibilityLevel) {
    case 'LOCAL':
      // Same local area only
      return userZone.id === listingZone.id;

    case 'NEIGHBOR':
      // Same city (parent must be CITY)
      const userCity = userZone.type === 'CITY' ? userZone : userZone.parent;
      const listingCity = listingZone.type === 'CITY' ? listingZone : listingZone.parent;
      return userCity?.id === listingCity?.id;

    case 'CITY':
      // Same city
      const userCityZone = userZone.type === 'CITY' ? userZone : userZone.parent;
      const listingCityZone = listingZone.type === 'CITY' ? listingZone : listingZone.parent;
      return userCityZone?.id === listingCityZone?.id;

    case 'PROVINCE':
      // Same province
      const userProvince = findZoneByType(userZone, 'PROVINCE');
      const listingProvince = findZoneByType(listingZone, 'PROVINCE');
      return userProvince?.id === listingProvince?.id;

    case 'NATIONAL':
      // Same country
      const userCountry = findZoneByType(userZone, 'COUNTRY') || userZone.countryId;
      const listingCountry = findZoneByType(listingZone, 'COUNTRY') || listingZone.countryId;
      return userCountry === listingCountry || userZone.countryId === listingZone.countryId;

    case 'PUBLIC':
      return true;

    default:
      return false;
  }
}

/**
 * Find zone by type in hierarchy (traverse up the parent chain)
 * @param {Object} zone - GeoZone object with parent chain
 * @param {string} type - GeoZoneType to find
 * @returns {Object|null} - Zone of the specified type or null
 */
function findZoneByType(zone, type) {
  if (!zone) return null;
  if (zone.type === type) return zone;
  if (zone.parent) return findZoneByType(zone.parent, type);
  return null;
}

/**
 * Build Prisma where clause to filter listings based on user's geo-zone and visibility levels
 * @param {Object} user - User object with geoZoneId (optional)
 * @param {Object} options - Additional filter options
 * @returns {Promise<Object>} - Prisma where clause
 */
async function buildGeoFenceWhere(user, options = {}) {
  const { countryId = 'PK' } = options;

  // If no user, only show PUBLIC listings
  if (!user || !user.geoZoneId) {
    return {
      visibilityLevel: 'PUBLIC',
      countryId,
    };
  }

  // Get user's geoZone hierarchy
  const userZone = await prisma.geoZone.findUnique({
    where: { id: user.geoZoneId },
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
  });

  if (!userZone) {
    // User has invalid geoZone, show only PUBLIC
    return {
      visibilityLevel: 'PUBLIC',
      countryId,
    };
  }

  // Build visibility level conditions
  const userCity = findZoneByType(userZone, 'CITY');
  const userProvince = findZoneByType(userZone, 'PROVINCE');
  const userCountry = findZoneByType(userZone, 'COUNTRY') || userZone.countryId;

  // Collect allowed geoZoneIds based on visibility levels
  const allowedZoneIds = [userZone.id]; // LOCAL: same zone

  if (userCity) {
    // NEIGHBOR and CITY: same city
    allowedZoneIds.push(userCity.id);
    // Also include all local areas in the same city
    const cityChildren = await prisma.geoZone.findMany({
      where: {
        parentId: userCity.id,
        type: 'LOCAL_AREA',
        isActive: true,
      },
      select: { id: true },
    });
    allowedZoneIds.push(...cityChildren.map(c => c.id));
  }

  if (userProvince) {
    // PROVINCE: same province
    allowedZoneIds.push(userProvince.id);
    // Also include all cities in the same province
    const provinceCities = await prisma.geoZone.findMany({
      where: {
        parentId: userProvince.id,
        type: 'CITY',
        isActive: true,
      },
      select: { id: true },
    });
    allowedZoneIds.push(...provinceCities.map(c => c.id));
  }

  // NATIONAL: same country (already filtered by countryId)

  // Build OR conditions for visibility levels
  // Structure: (visibilityLevel = PUBLIC) OR (visibilityLevel = LOCAL AND geoZoneId matches) OR ...
  return {
    countryId,
    OR: [
      // PUBLIC: everyone can see
      { visibilityLevel: 'PUBLIC' },
      // LOCAL: same zone
      {
        AND: [
          { visibilityLevel: 'LOCAL' },
          { geoZoneId: userZone.id },
        ],
      },
      // NEIGHBOR: same city
      {
        AND: [
          { visibilityLevel: 'NEIGHBOR' },
          { geoZoneId: { in: allowedZoneIds } },
        ],
      },
      // CITY: same city
      {
        AND: [
          { visibilityLevel: 'CITY' },
          { geoZoneId: { in: allowedZoneIds } },
        ],
      },
      // PROVINCE: same province
      {
        AND: [
          { visibilityLevel: 'PROVINCE' },
          { geoZoneId: { in: allowedZoneIds } },
        ],
      },
      // NATIONAL: same country
      {
        AND: [
          { visibilityLevel: 'NATIONAL' },
          { countryId: userCountry || userZone.countryId },
        ],
      },
    ],
  };
}

module.exports = {
  canUserViewListing,
  buildGeoFenceWhere,
  findZoneByType,
};
