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

  if (!user) return false;

  // Dealers/franchises with territory: allow if listing is in any of their assigned zones (or child zones)
  if (['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'].includes(user.role)) {
    const territories = await prisma.dealerTerritory.findMany({
      where: { userId: user.id, isActive: true },
      select: { geoZoneId: true },
    });
    const territoryZoneIds = new Set(territories.map(t => t.geoZoneId));
    if (territoryZoneIds.has(listing.geoZoneId)) return true;
    // Listing might be in a child of a territory zone (e.g. franchise has city, listing in local area)
    const listingZone = await prisma.geoZone.findUnique({
      where: { id: listing.geoZoneId },
      include: { parent: { include: { parent: true } } },
    });
    if (listingZone) {
      let current = listingZone;
      while (current) {
        if (territoryZoneIds.has(current.id)) return true;
        current = current.parent;
      }
    }
  }

  // If user has no zone, only territory-based access above applies
  if (!user.geoZoneId) return false;

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

  // Admins and collection managers see all listings (match-all)
  const role = user && user.role ? String(user.role).toUpperCase() : '';
  if (['SUPER_ADMIN', 'ADMIN', 'COLLECTION_MANAGER'].includes(role)) {
    return { countryId, OR: [{ id: { not: null } }] };
  }

  // If no user, only show PUBLIC listings
  if (!user) {
    return {
      visibilityLevel: 'PUBLIC',
      countryId,
    };
  }

  // ── TERRITORY-BASED ACCESS (compute first so dealers without geoZoneId still see their zone listings) ──
  const territoryZoneIds = [];
  if (['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'].includes(user.role)) {
    const territories = await prisma.dealerTerritory.findMany({
      where: { userId: user.id, isActive: true },
      select: { geoZoneId: true },
    });
    for (const t of territories) {
      territoryZoneIds.push(t.geoZoneId);
      // Also include children of territory zones (e.g., city franchise sees all local areas in city)
      const children = await prisma.geoZone.findMany({
        where: { parentId: t.geoZoneId, isActive: true },
        select: { id: true },
      });
      territoryZoneIds.push(...children.map(c => c.id));
      // And grandchildren (province manager sees all areas in all cities)
      for (const child of children) {
        const grandchildren = await prisma.geoZone.findMany({
          where: { parentId: child.id, isActive: true },
          select: { id: true },
        });
        territoryZoneIds.push(...grandchildren.map(gc => gc.id));
      }
    }
  }

  // User has no zone and no territory → only PUBLIC listings
  if (!user.geoZoneId && territoryZoneIds.length === 0) {
    return {
      visibilityLevel: 'PUBLIC',
      countryId,
    };
  }

  // Build OR conditions: always include PUBLIC
  const orConditions = [{ visibilityLevel: 'PUBLIC' }];

  // Dealers with territories see ALL listings in their territory zones (any visibility level)
  if (territoryZoneIds.length > 0) {
    orConditions.push({
      geoZoneId: { in: territoryZoneIds },
    });
  }

  // If user has a geoZone, add visibility-based conditions (LOCAL, CITY, etc.)
  let allowedZoneIds = [...territoryZoneIds];
  let userCountry = countryId;
  if (user.geoZoneId) {
    const userZone = await prisma.geoZone.findUnique({
      where: { id: user.geoZoneId },
      include: {
        parent: {
          include: {
            parent: { include: { parent: true } },
          },
        },
      },
    });
    if (userZone) {
      const userCity = findZoneByType(userZone, 'CITY');
      const userProvince = findZoneByType(userZone, 'PROVINCE');
      const countryZone = findZoneByType(userZone, 'COUNTRY');
      // Listing.countryId is a string (e.g. "PK"), not an object — never pass a GeoZone here
      userCountry = (countryZone && countryZone.countryId) ? countryZone.countryId : (userZone.countryId || countryId);
      allowedZoneIds = [userZone.id];
      if (userCity) {
        allowedZoneIds.push(userCity.id);
        const cityChildren = await prisma.geoZone.findMany({
          where: { parentId: userCity.id, type: 'LOCAL_AREA', isActive: true },
          select: { id: true },
        });
        allowedZoneIds.push(...cityChildren.map(c => c.id));
      }
      if (userProvince) {
        allowedZoneIds.push(userProvince.id);
        const provinceCities = await prisma.geoZone.findMany({
          where: { parentId: userProvince.id, type: 'CITY', isActive: true },
          select: { id: true },
        });
        allowedZoneIds.push(...provinceCities.map(c => c.id));
      }
      allowedZoneIds = [...new Set([...allowedZoneIds, ...territoryZoneIds])];
      orConditions.push(
        { AND: [{ visibilityLevel: 'LOCAL' }, { geoZoneId: { in: allowedZoneIds } }] },
        { AND: [{ visibilityLevel: 'NEIGHBOR' }, { geoZoneId: { in: allowedZoneIds } }] },
        { AND: [{ visibilityLevel: 'CITY' }, { geoZoneId: { in: allowedZoneIds } }] },
        { AND: [{ visibilityLevel: 'PROVINCE' }, { geoZoneId: { in: allowedZoneIds } }] },
        { AND: [{ visibilityLevel: 'NATIONAL' }, { countryId: userCountry }] }
      );
    }
  }

  return {
    countryId,
    OR: orConditions,
  };
}

module.exports = {
  canUserViewListing,
  buildGeoFenceWhere,
  findZoneByType,
};
