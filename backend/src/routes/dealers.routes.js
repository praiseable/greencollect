const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

// ═══════════════════════════════════════════════════════════
// DEALER ONBOARDING — Admin creates dealer accounts
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/admin/dealers
 * Admin-only: Create a new dealer / franchise / wholesale account
 * with full KYC details. This is the ONLY way to create Pro accounts.
 */
router.post('/',
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  body('role').isIn(['DEALER', 'FRANCHISE_ADMIN', 'COLLECTOR']),
  body('city').notEmpty().trim(),
  body('area').notEmpty().trim(),
  body('cnicNumber').notEmpty().trim(),
  body('businessName').notEmpty().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const {
        firstName, lastName, phone, email, role, city, area, geoZoneId,
        cnicNumber, businessName, businessAddress,
        cnicFrontImage, cnicBackImage,
        policeVerificationCert, characterCertificate,
        dealerPhoto, shopPhoto,
        warehouseAddress, warehouseInsidePhoto, warehouseStreetPhoto, warehouseFrontDoorPhoto,
        simOwnerName,
        ntnNumber, bankName, bankAccountTitle, bankAccountNumber,
        initialBalance = 0, requiredDeposit = 0,
      } = req.body;

      // Check if phone already exists
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) return res.status(409).json({ error: 'Phone number already registered' });

      // Create user with full KYC
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          phone,
          email: email || null,
          role,
          city,
          geoZoneId: geoZoneId || null,
          isActive: true,
          isVerified: true,
          accountStatus: 'ACTIVE',
          cnicNumber,
          businessName,
          businessAddress: businessAddress || null,
          cnicFrontImage: cnicFrontImage || null,
          cnicBackImage: cnicBackImage || null,
          policeVerificationCert: policeVerificationCert || null,
          characterCertificate: characterCertificate || null,
          dealerPhoto: dealerPhoto || null,
          shopPhoto: shopPhoto || null,
          warehouseAddress: warehouseAddress || businessAddress || null,
          warehouseInsidePhoto: warehouseInsidePhoto || null,
          warehouseStreetPhoto: warehouseStreetPhoto || null,
          warehouseFrontDoorPhoto: warehouseFrontDoorPhoto || null,
          simOwnerName: simOwnerName || null,
          simVerified: true, // Admin-created accounts skip SIM verification
          criminalCheckStatus: 'CLEARED', // Admin verifies before creation
          requiredDeposit: parseInt(requiredDeposit) || 0,
          depositPaid: initialBalance > 0,
          depositAmount: initialBalance > 0 ? parseInt(initialBalance) : 0,
          depositPaidAt: initialBalance > 0 ? new Date() : null,
          ntnNumber: ntnNumber || null,
          bankName: bankName || null,
          bankAccountTitle: bankAccountTitle || null,
          bankAccountNumber: bankAccountNumber || null,
          kycSubmittedAt: new Date(),
          kycApprovedAt: new Date(),
        },
      });

      // Create wallet with initial balance
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balancePaisa: BigInt(Math.round(initialBalance * 100)), // Store in paisa
          currencyId: 'PKR',
        },
      });

      // Assign territory if geoZoneId is provided
      if (geoZoneId) {
        await prisma.dealerTerritory.create({
          data: {
            userId: user.id,
            geoZoneId,
          },
        });
      }

      res.status(201).json({
        message: 'Dealer account created successfully',
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          accountStatus: user.accountStatus,
        },
      });
    } catch (err) {
      console.error('Dealer creation error:', err);
      res.status(500).json({ error: 'Failed to create dealer account' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// BALANCE MANAGEMENT — Admin adds/deducts balance
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/admin/dealers/:userId/balance/add
 * Admin adds balance to a dealer's wallet
 */
router.post('/:userId/balance/add',
  body('amount').isFloat({ gt: 0 }),
  body('note').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { amount, note } = req.body;
      const amountPaisa = BigInt(Math.round(amount * 100));

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

      const updated = await prisma.wallet.update({
        where: { userId },
        data: { balancePaisa: wallet.balancePaisa + amountPaisa },
      });

      // Ensure account is ACTIVE when balance > 0
      await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: 'ACTIVE' },
      });

      // Log the transaction
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BALANCE_ADD',
          details: JSON.stringify({
            amount,
            note: note || '',
            newBalance: Number(updated.balancePaisa) / 100,
          }),
        },
      });

      res.json({
        message: `₨${amount} added successfully`,
        newBalance: Number(updated.balancePaisa) / 100,
      });
    } catch (err) {
      console.error('Balance add error:', err);
      res.status(500).json({ error: 'Failed to add balance' });
    }
  }
);

/**
 * POST /api/admin/dealers/:userId/balance/deduct
 * Admin deducts balance from a dealer's wallet
 */
router.post('/:userId/balance/deduct',
  body('amount').isFloat({ gt: 0 }),
  body('reason').notEmpty().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { amount, reason } = req.body;
      const amountPaisa = BigInt(Math.round(amount * 100));

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

      const newBalance = wallet.balancePaisa - amountPaisa;
      const finalBalance = newBalance < 0n ? 0n : newBalance;

      const updated = await prisma.wallet.update({
        where: { userId },
        data: { balancePaisa: finalBalance },
      });

      // If balance is now 0, the app will automatically lock for this user
      // (balance-gate check happens on every navigation in the Pro app)

      // Log the deduction
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BALANCE_DEDUCT',
          details: JSON.stringify({
            amount,
            reason,
            newBalance: Number(updated.balancePaisa) / 100,
          }),
        },
      });

      res.json({
        message: `₨${amount} deducted`,
        newBalance: Number(updated.balancePaisa) / 100,
        locked: Number(updated.balancePaisa) === 0,
      });
    } catch (err) {
      console.error('Balance deduct error:', err);
      res.status(500).json({ error: 'Failed to deduct balance' });
    }
  }
);

/**
 * GET /api/admin/dealers/wallets
 * Admin gets all dealer wallets with balances
 */
router.get('/wallets', async (req, res) => {
  try {
    const dealers = await prisma.user.findMany({
      where: {
        role: { in: ['DEALER', 'FRANCHISE_ADMIN', 'COLLECTOR'] },
      },
      include: {
        wallet: true,
        geoZone: true,
        dealerTerritories: { include: { geoZone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = dealers.map(d => ({
      id: d.id,
      name: `${d.firstName} ${d.lastName}`,
      displayName: d.displayName,
      phone: d.phone,
      email: d.email,
      role: d.role,
      city: d.city,
      area: d.geoZone?.name || d.city,
      accountStatus: d.accountStatus,
      balance: d.wallet ? Number(d.wallet.balancePaisa) / 100 : 0,
      kycStatus: d.kycApprovedAt ? 'APPROVED' : d.kycSubmittedAt ? 'SUBMITTED' : 'PENDING',
      territories: d.dealerTerritories.map(t => t.geoZone?.name),
      createdAt: d.createdAt,
    }));

    res.json({ dealers: result, total: result.length });
  } catch (err) {
    console.error('Dealer wallets error:', err);
    res.status(500).json({ error: 'Failed to fetch dealer wallets' });
  }
});

/**
 * PATCH /api/admin/dealers/:userId/status
 * Admin changes dealer account status (suspend, activate, reject)
 */
router.patch('/:userId/status',
  body('status').isIn(['PENDING_VERIFICATION', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED']),
  body('reason').optional().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const updateData = { accountStatus: status };
      if (status === 'REJECTED' && reason) {
        updateData.kycRejectionReason = reason;
      }
      if (status === 'SUSPENDED') {
        updateData.isActive = false;
      }
      if (status === 'ACTIVE') {
        updateData.isActive = true;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_STATUS_CHANGE',
          details: JSON.stringify({ newStatus: status, reason: reason || '' }),
        },
      });

      res.json({
        message: `Account status updated to ${status}`,
        accountStatus: user.accountStatus,
      });
    } catch (err) {
      console.error('Status change error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

module.exports = router;
