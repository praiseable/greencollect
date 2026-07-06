const prisma = require('./prisma');

async function getConfig(key, fallback, client = prisma) {
  const row = await client.platformConfig.findUnique({ where: { key } }).catch(() => null);
  return row?.value ?? fallback;
}

async function runDisintermediationScan(client = prisma) {
  const threshold = Number(await getConfig('disintermediation_ratio_threshold', '0.35', client));
  const windowSize = Number.parseInt(await getConfig('disintermediation_window_size', '10', client), 10) || 10;
  const now = new Date();

  const grouped = await client.listingDeposit.groupBy({
    by: ['buyerId'],
    _count: { buyerId: true },
  }).catch(() => []);

  const createdFlags = [];
  for (const group of grouped) {
    const deposits = await client.listingDeposit.findMany({
      where: { buyerId: group.buyerId },
      orderBy: { createdAt: 'desc' },
      take: windowSize,
      include: { listing: { select: { id: true } } },
    });

    // Exclude still-valid holds: these may be legitimate in-progress deals.
    const eligible = deposits.filter((d) => !(d.status === 'HELD' && d.expiresAt && d.expiresAt > now));
    if (eligible.length < Math.min(windowSize, 3)) continue;

    const relatedTransactions = await client.transaction.findMany({
      where: {
        buyerId: group.buyerId,
        listingId: { in: eligible.map((d) => d.listingId) },
      },
      select: { listingId: true, status: true },
    });
    const finalizedListingIds = new Set(relatedTransactions.filter((t) => ['FINALIZED', 'COMPLETED'].includes(t.status)).map((t) => t.listingId));

    const unlockCount = eligible.length;
    const cancelCount = eligible.filter((d) => !finalizedListingIds.has(d.listingId)).length;
    const ratio = unlockCount === 0 ? 0 : cancelCount / unlockCount;

    if (ratio > threshold) {
      const existing = await client.adminFlaggedUser.findFirst({
        where: { userId: group.buyerId, reason: 'SUSPECTED_PLATFORM_DISINTERMEDIATION', status: 'open' },
      });
      if (existing) continue;
      const flag = await client.adminFlaggedUser.create({
        data: {
          userId: group.buyerId,
          reason: 'SUSPECTED_PLATFORM_DISINTERMEDIATION',
          metrics: { unlockCount, cancelCount, ratio, windowSize, threshold },
        },
      });
      createdFlags.push(flag);
    }
  }
  return createdFlags;
}

module.exports = { runDisintermediationScan };
