/**
 * Escalation Service — Time-Based Listing Visibility Escalation
 * 
 * Flow:
 *   LOCAL → NEIGHBOR → CITY → PROVINCE → NATIONAL → PUBLIC
 * 
 * When a listing is posted:
 *   1. Starts at LOCAL visibility (only area dealer sees it)
 *   2. After X hours with no deal → escalate to NEIGHBOR (adjacent area dealers)
 *   3. After Y hours → CITY (city franchise sees it)
 *   4. After Z hours → PROVINCE (regional manager)
 *   5. After W hours → NATIONAL (all country-level dealers)
 *   6. After V hours → PUBLIC (everyone)
 * 
 * At each escalation, the relevant dealers in the NEW zone are notified.
 */

const prisma = require('./prisma');

// Visibility level ordering
const VISIBILITY_ORDER = ['LOCAL', 'NEIGHBOR', 'CITY', 'PROVINCE', 'NATIONAL', 'PUBLIC'];

/**
 * Find dealers who should be notified for a listing at a given visibility level.
 * Walks up the geo-zone hierarchy to find territory-assigned dealers.
 * 
 * @param {Object} listing - Listing with geoZoneId
 * @param {string} visibilityLevel - The NEW visibility level
 * @returns {Promise<Array>} - Array of user IDs to notify
 */
async function findDealersForLevel(listing, visibilityLevel) {
  const userIds = new Set();

  // Get the listing's zone with full hierarchy
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

  if (!listingZone) return [];

  switch (visibilityLevel) {
    case 'LOCAL': {
      // Notify dealers assigned to this exact zone
      const dealers = await prisma.dealerTerritory.findMany({
        where: { geoZoneId: listingZone.id, isActive: true },
        select: { userId: true },
      });
      dealers.forEach(d => userIds.add(d.userId));
      break;
    }

    case 'NEIGHBOR': {
      // Notify dealers assigned to adjacent zones (siblings in the same city)
      if (listingZone.parentId) {
        const siblingZones = await prisma.geoZone.findMany({
          where: {
            parentId: listingZone.parentId,
            id: { not: listingZone.id },
            isActive: true,
          },
          select: { id: true },
        });
        const siblingIds = siblingZones.map(z => z.id);

        const dealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: { in: siblingIds }, isActive: true },
          select: { userId: true },
        });
        dealers.forEach(d => userIds.add(d.userId));
      }
      break;
    }

    case 'CITY': {
      // Find the city zone and notify franchise owners there
      const cityZone = listingZone.type === 'CITY' ? listingZone :
        listingZone.parent?.type === 'CITY' ? listingZone.parent : null;

      if (cityZone) {
        const dealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: cityZone.id, isActive: true },
          select: { userId: true },
        });
        dealers.forEach(d => userIds.add(d.userId));

        // Also notify ALL local area dealers under this city
        const cityAreas = await prisma.geoZone.findMany({
          where: { parentId: cityZone.id, isActive: true },
          select: { id: true },
        });
        const areaIds = cityAreas.map(a => a.id);
        const areaDealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: { in: areaIds }, isActive: true },
          select: { userId: true },
        });
        areaDealers.forEach(d => userIds.add(d.userId));
      }
      break;
    }

    case 'PROVINCE': {
      // Find province zone and notify regional managers there
      let provinceZone = null;
      let current = listingZone;
      while (current) {
        if (current.type === 'PROVINCE') { provinceZone = current; break; }
        current = current.parent;
      }

      if (provinceZone) {
        const dealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: provinceZone.id, isActive: true },
          select: { userId: true },
        });
        dealers.forEach(d => userIds.add(d.userId));

        // Also notify ALL city-level dealers in this province
        const cities = await prisma.geoZone.findMany({
          where: { parentId: provinceZone.id, type: 'CITY', isActive: true },
          select: { id: true },
        });
        const cityDealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: { in: cities.map(c => c.id) }, isActive: true },
          select: { userId: true },
        });
        cityDealers.forEach(d => userIds.add(d.userId));
      }
      break;
    }

    case 'NATIONAL': {
      // Find country zone and notify all national-level dealers
      const countryZone = await prisma.geoZone.findFirst({
        where: { countryId: listing.countryId || 'PK', type: 'COUNTRY' },
      });

      if (countryZone) {
        const dealers = await prisma.dealerTerritory.findMany({
          where: { geoZoneId: countryZone.id, isActive: true },
          select: { userId: true },
        });
        dealers.forEach(d => userIds.add(d.userId));
      }

      // Also notify all WHOLESALE_BUYER users in the country
      const wholesalers = await prisma.user.findMany({
        where: { role: 'WHOLESALE_BUYER', countryId: listing.countryId || 'PK', isActive: true },
        select: { id: true },
      });
      wholesalers.forEach(w => userIds.add(w.id));
      break;
    }

    case 'PUBLIC': {
      // No specific dealers to notify — PUBLIC means everyone can see it
      // Optionally notify super admins
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
        select: { id: true },
      });
      admins.forEach(a => userIds.add(a.id));
      break;
    }
  }

  // Remove the listing seller from notifications
  userIds.delete(listing.sellerId);

  return Array.from(userIds);
}

/**
 * Run the escalation check — called by cron job.
 * Finds all ACTIVE listings that should be escalated based on time rules.
 * 
 * @param {Object} io - Socket.io server instance for real-time notifications
 */
async function runEscalation(io) {
  console.log('[Escalation] Running escalation check...');

  try {
    // Get active escalation rules, ordered
    const rules = await prisma.escalationRule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (rules.length === 0) {
      console.log('[Escalation] No active escalation rules found.');
      return;
    }

    // Get all ACTIVE listings that are NOT yet PUBLIC
    const listings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        visibilityLevel: { not: 'PUBLIC' },
      },
      include: {
        seller: { select: { id: true, firstName: true, lastName: true } },
        escalationHistory: { orderBy: { escalatedAt: 'desc' }, take: 1 },
      },
    });

    console.log(`[Escalation] Checking ${listings.length} active listings...`);

    let escalatedCount = 0;

    for (const listing of listings) {
      const currentLevel = listing.visibilityLevel;
      const currentIndex = VISIBILITY_ORDER.indexOf(currentLevel);

      if (currentIndex === -1 || currentIndex >= VISIBILITY_ORDER.length - 1) continue;

      const nextLevel = VISIBILITY_ORDER[currentIndex + 1];

      // Find the rule for this transition
      const rule = rules.find(r => r.fromLevel === currentLevel && r.toLevel === nextLevel);
      if (!rule) continue;

      // Calculate when this listing should escalate
      // Use the last escalation time, or listing creation time
      const lastEscalation = listing.escalationHistory[0]?.escalatedAt || listing.createdAt;
      const hoursSinceLastChange = (Date.now() - new Date(lastEscalation).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastChange < rule.delayHours) continue;

      // Check if the listing has active transactions (deals in progress)
      const activeTransactions = await prisma.transaction.count({
        where: {
          listingId: listing.id,
          status: { in: ['OFFER_MADE', 'OFFER_ACCEPTED', 'BOND_CREATED', 'PAYMENT_PENDING'] },
        },
      });

      // Don't escalate if there's an active deal
      if (activeTransactions > 0) {
        console.log(`[Escalation] Listing "${listing.title}" has active transactions, skipping.`);
        continue;
      }

      console.log(`[Escalation] Escalating "${listing.title}": ${currentLevel} → ${nextLevel}`);

      // Perform the escalation
      await prisma.listing.update({
        where: { id: listing.id },
        data: { visibilityLevel: nextLevel },
      });

      // Find dealers to notify at the new level
      const dealerIds = await findDealersForLevel(listing, nextLevel);

      // Log the escalation
      await prisma.escalationLog.create({
        data: {
          listingId: listing.id,
          fromLevel: currentLevel,
          toLevel: nextLevel,
          reason: `Auto-escalated after ${rule.delayHours}h with no deal`,
          notifiedUserIds: dealerIds,
        },
      });

      // Create notifications for each dealer
      if (dealerIds.length > 0) {
        await prisma.notification.createMany({
          data: dealerIds.map(userId => ({
            userId,
            type: 'ESCALATION',
            title: `Listing Escalated to ${nextLevel}`,
            body: `"${listing.title}" is now available in your zone (escalated from ${currentLevel}).`,
            data: { listingId: listing.id, fromLevel: currentLevel, toLevel: nextLevel },
          })),
        });

        // Real-time notifications via Socket.io
        if (io) {
          dealerIds.forEach(userId => {
            io.to(`user-${userId}`).emit('notification', {
              type: 'ESCALATION',
              title: `Listing Escalated to ${nextLevel}`,
              body: `"${listing.title}" is now available in your zone.`,
              data: { listingId: listing.id, fromLevel: currentLevel, toLevel: nextLevel },
            });
          });
        }
      }

      // Notify the seller about escalation
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: 'ESCALATION',
          title: 'Your listing expanded reach',
          body: `"${listing.title}" visibility expanded from ${currentLevel} to ${nextLevel} to reach more buyers.`,
          data: { listingId: listing.id, fromLevel: currentLevel, toLevel: nextLevel },
        },
      });

      escalatedCount++;
    }

    console.log(`[Escalation] Done. ${escalatedCount} listing(s) escalated.`);
  } catch (err) {
    console.error('[Escalation] Error:', err);
  }
}

/**
 * Notify zone dealers when a NEW listing is created.
 * This replaces the old "notify all admins" logic.
 * 
 * @param {Object} listing - The newly created listing (with geoZoneId, sellerId, title)
 * @param {Object} seller - The seller user object
 * @param {Object} io - Socket.io instance
 */
async function notifyZoneDealersOnNewListing(listing, seller, io) {
  try {
    // 1. Notify dealers assigned to the listing's exact zone (LOCAL)
    const localDealerIds = await findDealersForLevel(listing, 'LOCAL');

    // 2. Notify city-level dealers (listing in city, or listing in local area of this city)
    const listingZone = await prisma.geoZone.findUnique({
      where: { id: listing.geoZoneId },
      include: { parent: { include: { parent: true } } },
    });

    const cityZoneId = listingZone?.type === 'CITY' ? listingZone.id :
      listingZone?.parent?.type === 'CITY' ? listingZone.parent.id : null;

    let cityDealerIds = [];
    if (cityZoneId) {
      const cityDealers = await prisma.dealerTerritory.findMany({
        where: { geoZoneId: cityZoneId, isActive: true },
        select: { userId: true },
      });
      cityDealerIds = cityDealers.map(d => d.userId);
    }

    // 3. Fallback: notify dealers whose territory is the listing zone's parent (e.g. province)
    let parentDealerIds = [];
    if (listingZone?.parentId) {
      const parentDealers = await prisma.dealerTerritory.findMany({
        where: { geoZoneId: listingZone.parentId, isActive: true },
        select: { userId: true },
      });
      parentDealerIds = parentDealers.map(d => d.userId);
    }

    // 4. Always notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
      select: { id: true },
    });
    const adminIds = admins.map(a => a.id);

    // Merge all IDs, deduplicate, remove seller
    const allIds = new Set([...localDealerIds, ...cityDealerIds, ...parentDealerIds, ...adminIds]);
    allIds.delete(listing.sellerId);

    if (allIds.size === 0) {
      console.warn(`[Notification] New listing "${listing.title}" (geoZoneId=${listing.geoZoneId}, cityName=${listing.cityName}) → no dealers/admins found to notify. Run seed or assign territories.`);
      return;
    }

    const notifData = Array.from(allIds).map(userId => ({
      userId,
      type: 'NEW_LISTING',
      title: 'New Listing in Your Zone',
      body: `${seller.firstName} posted: "${listing.title}" in ${listing.cityName || 'your area'}`,
      data: { listingId: listing.id, cityName: listing.cityName, geoZoneId: listing.geoZoneId },
    }));

    await prisma.notification.createMany({ data: notifData });

    // Real-time
    if (io) {
      allIds.forEach(userId => {
        io.to(`user-${userId}`).emit('notification', {
          type: 'NEW_LISTING',
          title: 'New Listing in Your Zone',
          body: `${seller.firstName} posted: "${listing.title}"`,
          data: { listingId: listing.id },
        });
      });
    }

    console.log(`[Notification] New listing "${listing.title}" → notified ${allIds.size} dealers/admins`);
  } catch (err) {
    console.error('[Notification] Error notifying zone dealers:', err);
  }
}

/**
 * Collection Escalation — Forced status update & reassignment.
 * 
 * When a collection's deadline passes without the dealer completing it:
 *   1. Collection status → ESCALATED
 *   2. Dealer rating takes a penalty
 *   3. Find next available dealer (adjacent zone / city franchise)
 *   4. Create a new collection assignment for the next dealer
 *   5. Notify the old dealer (penalty) and new dealer (new assignment)
 *   6. If no dealer available, escalate listing visibility level
 * 
 * @param {Object} io - Socket.io server instance
 */
async function runCollectionEscalation(io) {
  console.log('[CollectionEscalation] Running collection deadline check...');

  try {
    // Find all overdue collections (past deadline, not completed/cancelled/escalated)
    const overdueCollections = await prisma.collection.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'ASSIGNED'] },
        // Collections where deadline has passed
        // We use collectionDate as deadline proxy in existing schema
        collectionDate: { lt: new Date() },
        verifiedByAdmin: false,
      },
      include: {
        listing: {
          include: {
            geoZone: {
              include: { parent: true },
            },
          },
        },
        collector: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    console.log(`[CollectionEscalation] Found ${overdueCollections.length} overdue collections.`);
    let escalatedCount = 0;

    for (const collection of overdueCollections) {
      const listing = collection.listing;
      if (!listing) continue;

      // 1. Mark collection as CANCELLED (overdue)
      await prisma.collection.update({
        where: { id: collection.id },
        data: {
          status: 'CANCELLED',
          adminNotes: (collection.adminNotes || '') + '\n[SYSTEM] Deadline passed — escalated to next dealer.',
        },
      });

      // 2. Create a DealerRating penalty entry
      await prisma.dealerRating.create({
        data: {
          dealerId: collection.collectorId,
          raterId: collection.collectorId, // System-generated
          listingId: listing.id,
          collectionId: collection.id,
          rating: 1, // Penalty: lowest rating
          comment: '[SYSTEM] Collection deadline exceeded. Auto-escalated.',
        },
      });

      // 3. Find the next available dealer
      //    Strategy: find sibling zones → city franchise → province
      const geoZone = listing.geoZone;
      let nextDealerIds = [];

      if (geoZone?.parentId) {
        // Find dealers in sibling zones (adjacent areas)
        const siblingZones = await prisma.geoZone.findMany({
          where: {
            parentId: geoZone.parentId,
            id: { not: geoZone.id },
            isActive: true,
          },
          select: { id: true },
        });

        if (siblingZones.length > 0) {
          const dealers = await prisma.dealerTerritory.findMany({
            where: {
              geoZoneId: { in: siblingZones.map(z => z.id) },
              isActive: true,
              userId: { not: collection.collectorId }, // Exclude the failed dealer
            },
            select: { userId: true },
          });
          nextDealerIds = dealers.map(d => d.userId);
        }

        // If no sibling dealers, try city-level franchise
        if (nextDealerIds.length === 0 && geoZone.parent) {
          const cityDealers = await prisma.dealerTerritory.findMany({
            where: {
              geoZoneId: geoZone.parentId,
              isActive: true,
              userId: { not: collection.collectorId },
            },
            select: { userId: true },
          });
          nextDealerIds = cityDealers.map(d => d.userId);
        }
      }

      // 4. Assign to next dealer or escalate listing visibility
      if (nextDealerIds.length > 0) {
        // Pick the first available dealer (in production, pick by rating/distance)
        const nextDealerId = nextDealerIds[0];

        // Create new collection assignment with extended deadline
        const newDeadline = new Date();
        newDeadline.setHours(newDeadline.getHours() + 6); // 6-hour deadline for escalated

        await prisma.collection.create({
          data: {
            listingId: listing.id,
            collectorId: nextDealerId,
            collectionDate: newDeadline,
            status: 'PENDING',
            collectedQuantity: collection.collectedQuantity,
          },
        });

        // Notify the new dealer
        await prisma.notification.create({
          data: {
            userId: nextDealerId,
            type: 'COLLECTION_ESCALATED',
            title: 'Escalated Collection Available',
            body: `"${listing.title}" collection was escalated from another dealer. Deadline: 6 hours.`,
            data: { listingId: listing.id, collectionId: collection.id },
          },
        });

        if (io) {
          io.to(`user-${nextDealerId}`).emit('notification', {
            type: 'COLLECTION_ESCALATED',
            title: 'Escalated Collection Available',
            body: `"${listing.title}" collection was escalated. 6h deadline.`,
            data: { listingId: listing.id },
          });
        }

        console.log(`[CollectionEscalation] Reassigned "${listing.title}" from ${collection.collectorId} → ${nextDealerId}`);
      } else {
        // No dealers available — escalate listing visibility level
        const currentLevelIndex = VISIBILITY_ORDER.indexOf(listing.visibilityLevel);
        if (currentLevelIndex < VISIBILITY_ORDER.length - 1) {
          const nextLevel = VISIBILITY_ORDER[currentLevelIndex + 1];
          await prisma.listing.update({
            where: { id: listing.id },
            data: { visibilityLevel: nextLevel },
          });
          console.log(`[CollectionEscalation] No dealers available. Escalated listing visibility: ${listing.visibilityLevel} → ${nextLevel}`);
        }
      }

      // 5. Notify the failed dealer about penalty
      await prisma.notification.create({
        data: {
          userId: collection.collectorId,
          type: 'COLLECTION_PENALTY',
          title: 'Collection Deadline Missed',
          body: `You missed the deadline for "${listing.title}". Your rating has been affected. The collection has been reassigned.`,
          data: { listingId: listing.id, collectionId: collection.id },
        },
      });

      if (io) {
        io.to(`user-${collection.collectorId}`).emit('notification', {
          type: 'COLLECTION_PENALTY',
          title: 'Collection Deadline Missed',
          body: `You missed the deadline for "${listing.title}". Rating penalty applied.`,
          data: { listingId: listing.id },
        });
      }

      escalatedCount++;
    }

    console.log(`[CollectionEscalation] Done. ${escalatedCount} collection(s) escalated.`);
  } catch (err) {
    console.error('[CollectionEscalation] Error:', err);
  }
}

module.exports = {
  runEscalation,
  runCollectionEscalation,
  findDealersForLevel,
  notifyZoneDealersOnNewListing,
  VISIBILITY_ORDER,
};
