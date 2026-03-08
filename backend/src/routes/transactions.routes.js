const router = require('express').Router();
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { addFormattedPrice } = require('../services/currency.service');

// GET /transactions — My transactions (as buyer or seller)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {
      OR: [
        { buyerId: req.user.id },
        { listing: { sellerId: req.user.id } },
      ],
    };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true, images: { take: 1 }, seller: { select: { id: true, firstName: true, lastName: true } } } },
          buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    const formatted = transactions.map(t => ({
      ...t,
      offeredPricePaisa: t.offeredPricePaisa?.toString(),
      finalPricePaisa: t.finalPricePaisa?.toString(),
      totalPaisa: t.totalPaisa?.toString(),
      offeredPriceFormatted: addFormattedPrice(t.offeredPricePaisa, t.currencyId || 'PKR'),
      finalPriceFormatted: t.finalPricePaisa ? addFormattedPrice(t.finalPricePaisa, t.currencyId || 'PKR') : null,
    }));

    res.json({ transactions: formatted, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('GET /transactions error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch transactions' } });
  }
});

// GET /transactions/:id — Transaction detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { include: { images: { take: 3 }, seller: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        bond: true,
      },
    });
    if (!transaction) return res.status(404).json({ error: { message: 'Transaction not found' } });
    res.json({
      ...transaction,
      offeredPricePaisa: transaction.offeredPricePaisa?.toString(),
      finalPricePaisa: transaction.finalPricePaisa?.toString(),
      totalPaisa: transaction.totalPaisa?.toString(),
    });
  } catch (err) {
    console.error('GET /transactions/:id error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch transaction' } });
  }
});

// POST /transactions — Create offer (make an offer on a listing)
router.post('/', authenticate, async (req, res) => {
  try {
    const { listingId, offeredPricePaisa, quantity, message } = req.body;
    if (!listingId || !offeredPricePaisa) {
      return res.status(400).json({ error: { message: 'listingId and offeredPricePaisa are required' } });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: { message: 'Listing not found' } });
    if (listing.sellerId === req.user.id) return res.status(400).json({ error: { message: 'Cannot make offer on your own listing' } });

    const transaction = await prisma.transaction.create({
      data: {
        listingId,
        buyerId: req.user.id,
        offeredPricePaisa: BigInt(offeredPricePaisa),
        quantity: quantity || listing.quantity,
        unitId: listing.unitId,
        currencyId: listing.currencyId || 'PKR',
        status: 'OFFERED',
        message,
      },
    });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'OFFER_RECEIVED',
        title: 'New offer received',
        body: `An offer of ₨${Number(offeredPricePaisa) / 100} was made on your listing "${listing.title}"`,
        data: { listingId, transactionId: transaction.id },
      },
    }).catch(() => {});

    res.status(201).json({ ...transaction, offeredPricePaisa: transaction.offeredPricePaisa.toString() });
  } catch (err) {
    console.error('POST /transactions error:', err);
    res.status(500).json({ error: { message: 'Failed to create offer' } });
  }
});

// PUT /transactions/:id/counter — Counter offer
router.put('/:id/counter', authenticate, async (req, res) => {
  try {
    const { counterPricePaisa, message } = req.body;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        counterPricePaisa: BigInt(counterPricePaisa),
        status: 'NEGOTIATING',
        message,
      },
    });
    res.json({ ...transaction, offeredPricePaisa: transaction.offeredPricePaisa?.toString(), counterPricePaisa: transaction.counterPricePaisa?.toString() });
  } catch (err) {
    console.error('PUT /transactions/:id/counter error:', err);
    res.status(500).json({ error: { message: 'Failed to counter offer' } });
  }
});

// PUT /transactions/:id/accept — Accept offer
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: { message: 'Transaction not found' } });

    const finalPrice = existing.counterPricePaisa || existing.offeredPricePaisa;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        finalPricePaisa: finalPrice,
        totalPaisa: finalPrice * BigInt(Math.round(Number(existing.quantity || 1))),
      },
    });
    res.json({ ...transaction, finalPricePaisa: transaction.finalPricePaisa?.toString(), totalPaisa: transaction.totalPaisa?.toString() });
  } catch (err) {
    console.error('PUT /transactions/:id/accept error:', err);
    res.status(500).json({ error: { message: 'Failed to accept offer' } });
  }
});

// PUT /transactions/:id/reject — Reject offer
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    res.json(transaction);
  } catch (err) {
    console.error('PUT /transactions/:id/reject error:', err);
    res.status(500).json({ error: { message: 'Failed to reject offer' } });
  }
});

// PUT /transactions/:id/finalize — Finalize deal + generate bond
router.put('/:id/finalize', authenticate, async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { listing: true },
    });
    if (!existing) return res.status(404).json({ error: { message: 'Transaction not found' } });

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
    });

    // Create bond record
    const bond = await prisma.bond.create({
      data: {
        transactionId: transaction.id,
        bondNumber: `BND-${Date.now()}`,
        status: 'ACTIVE',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    }).catch(() => null);

    // Update listing status
    await prisma.listing.update({
      where: { id: existing.listingId },
      data: { status: 'SOLD' },
    }).catch(() => {});

    res.json({ transaction, bond });
  } catch (err) {
    console.error('PUT /transactions/:id/finalize error:', err);
    res.status(500).json({ error: { message: 'Failed to finalize deal' } });
  }
});

// GET /transactions/:id/bond — Get bond for finalized transaction
router.get('/:id/bond', authenticate, async (req, res) => {
  try {
    const bond = await prisma.bond.findFirst({
      where: { transactionId: req.params.id },
      include: {
        transaction: {
          include: {
            listing: { include: { seller: { select: { id: true, firstName: true, lastName: true } } } },
            buyer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!bond) return res.status(404).json({ error: { message: 'Bond not found' } });
    res.json(bond);
  } catch (err) {
    console.error('GET /transactions/:id/bond error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch bond' } });
  }
});

module.exports = router;
