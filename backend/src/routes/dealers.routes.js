const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { portalCheck } = require('../middleware/portalCheck');
const { Portal } = require('../../../packages/shared/src/constants');
const { creditWallet, debitWallet, serializeWallet, WalletError } = require('../services/wallet.service');

router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'), portalCheck(Portal.ADMIN));

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
  body('role').isIn(['DEALER', 'FRANCHISE_OWNER', 'WHOLESALE_BUYER', 'REGIONAL_MANAGER']),
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
          requiredDeposit: 0,
          depositPaid: true,
          depositAmount: 0,
          depositPaidAt: null,
          ntnNumber: ntnNumber || null,
          bankName: bankName || null,
          bankAccountTitle: bankAccountTitle || null,
          bankAccountNumber: bankAccountNumber || null,
          kycSubmittedAt: new Date(),
          kycApprovedAt: new Date(),
        },
      });

      // Create a zero wallet. Any optional buyer-side top-up below is ledger-backed; sellers are never charged to activate.
      await prisma.wallet.create({
        data: {
          userId: user.id,
          availableBalancePaisa: 0n,
          escrowedBalancePaisa: 0n,
          balancePaisa: 0n,
          currencyId: 'PKR',
        },
      });

      if (Number(initialBalance) > 0) {
        await creditWallet(user.id, BigInt(Math.round(Number(initialBalance) * 100)), {
          referenceType: 'MANUAL_ADJUSTMENT',
          note: 'Admin-created buyer wallet top-up',
          metadata: { source: 'admin_dealer_creation' },
        });
      }

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

      const updated = await creditWallet(userId, amountPaisa, {
        referenceType: 'MANUAL_ADJUSTMENT',
        note: note || 'Admin wallet credit',
        metadata: { source: 'admin_dealers_balance_add' },
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
          entity: 'Wallet',
          entityId: updated.id,
          newData: {
            amount,
            note: note || '',
            newBalancePaisa: updated.availableBalancePaisa?.toString() || updated.balancePaisa?.toString(),
          },
        },
      });

      res.json({
        message: `₨${amount} added successfully`,
        wallet: serializeWallet(updated),
        newBalance: Number(updated.availableBalancePaisa ?? updated.balancePaisa) / 100,
      });
    } catch (err) {
      console.error('Balance add error:', err);
      if (err instanceof WalletError) return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
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

      const updated = await debitWallet(userId, amountPaisa, {
        referenceType: 'MANUAL_ADJUSTMENT',
        note: reason || 'Admin wallet debit',
        metadata: { source: 'admin_dealers_balance_deduct' },
      });

      // v3: wallet balance never locks seller/pro access; this is a buyer-side manual adjustment only.

      // Log the deduction
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BALANCE_DEDUCT',
          entity: 'Wallet',
          entityId: updated.id,
          newData: {
            amount,
            reason,
            newBalancePaisa: updated.availableBalancePaisa?.toString() || updated.balancePaisa?.toString(),
          },
        },
      });

      res.json({
        message: `₨${amount} deducted`,
        wallet: serializeWallet(updated),
        newBalance: Number(updated.availableBalancePaisa ?? updated.balancePaisa) / 100,
        locked: false,
      });
    } catch (err) {
      console.error('Balance deduct error:', err);
      if (err instanceof WalletError) return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
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
        role: { in: ['DEALER', 'FRANCHISE_OWNER', 'WHOLESALE_BUYER', 'REGIONAL_MANAGER'] },
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
      balance: d.wallet ? Number(d.wallet.availableBalancePaisa ?? d.wallet.balancePaisa) / 100 : 0,
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
          entity: 'User',
          entityId: userId,
          newData: { newStatus: status, reason: reason || '' },
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
