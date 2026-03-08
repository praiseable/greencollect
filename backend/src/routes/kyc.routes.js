const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════
// KYC REGISTRATION — Comprehensive dealer/franchise onboarding
// ═══════════════════════════════════════════════════════════
//
// FLOW (Dealer / Franchise):
//   Step 1 → CNIC: Upload front + back photos of original ID card
//   Step 2 → SIM Verification: OTP sent ONLY to SIM registered in dealer's name
//   Step 3 → Selfie: Photo must match CNIC photo (face verification)
//   Step 4 → Warehouse: Address + 3 photos (inside, street view, front door)
//   Step 5 → Criminal Check: Police verification cert + character certificate
//   Step 6 → Review & Submit → Admin reviews → Approve / Reject
//   Step 7 → Deposit: After approval, dealer deposits required amount
//
// Customers: Free registration, no KYC required.
// Criminal flagging: If flagged, ID is blocked permanently.
// ═══════════════════════════════════════════════════════════

// ── File upload config ──
const uploadsDir = path.join(__dirname, '../../uploads/kyc');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.user?.id || 'unknown');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname || 'doc';
    cb(null, `${prefix}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

// ═══════════════════════════════════════════════════════════
// STEP 1: Upload CNIC (Front + Back)
// POST /api/kyc/cnic
// ═══════════════════════════════════════════════════════════
router.post('/cnic',
  authenticate,
  upload.fields([
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
  ]),
  [
    body('cnicNumber').notEmpty().trim().withMessage('CNIC number is required'),
    body('fullName').notEmpty().trim().withMessage('Full name as on CNIC is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { cnicNumber, fullName } = req.body;
      const cnicFrontFile = req.files?.cnicFront?.[0];
      const cnicBackFile = req.files?.cnicBack?.[0];

      if (!cnicFrontFile || !cnicBackFile) {
        return res.status(400).json({ error: 'Both CNIC front and back photos are required (original photos only)' });
      }

      const cnicFrontUrl = `/uploads/kyc/${req.user.id}/${cnicFrontFile.filename}`;
      const cnicBackUrl = `/uploads/kyc/${req.user.id}/${cnicBackFile.filename}`;

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          cnicNumber,
          cnicFrontImage: cnicFrontUrl,
          cnicBackImage: cnicBackUrl,
          displayName: fullName,
          kycStep: 1,
          accountStatus: req.user.accountStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING_VERIFICATION',
        },
      });

      res.json({
        success: true,
        step: 1,
        message: 'CNIC uploaded successfully. Proceed to SIM verification.',
        data: { cnicFrontUrl, cnicBackUrl, cnicNumber },
      });
    } catch (err) {
      console.error('KYC CNIC upload error:', err);
      res.status(500).json({ error: 'Failed to upload CNIC documents' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 2: SIM Ownership Verification
// POST /api/kyc/sim-verify
// The OTP is ONLY sent to the SIM registered in the dealer's name.
// The dealer must provide the SIM owner name (must match CNIC).
// ═══════════════════════════════════════════════════════════
router.post('/sim-verify',
  authenticate,
  [
    body('simOwnerName').notEmpty().trim().withMessage('SIM owner name is required'),
    body('phone').matches(/^(\+92|0)?3[0-9]{9}$/).withMessage('Valid Pakistan phone number required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { simOwnerName, phone } = req.body;
      const normalizedPhone = phone.startsWith('0')
        ? `+92${phone.substring(1)}`
        : phone.startsWith('+92') ? phone : `+92${phone}`;

      // Check if phone matches user's registered phone
      if (req.user.phone !== normalizedPhone) {
        return res.status(400).json({
          error: 'Phone number must match the number registered to your account. SIM must be registered in your own name.',
        });
      }

      // Generate OTP for SIM verification
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.oTP.create({
        data: {
          userId: req.user.id,
          phone: normalizedPhone,
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        },
      });

      // In production: send OTP via SMS gateway
      // For development: return code in response
      console.log(`🔐 KYC SIM Verification OTP for ${normalizedPhone}: ${code}`);

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          simOwnerName,
        },
      });

      res.json({
        success: true,
        step: 2,
        message: `OTP sent to ${normalizedPhone}. SIM must be registered in name: ${simOwnerName}`,
        // Dev only — remove in production:
        devOtp: process.env.NODE_ENV !== 'production' ? code : undefined,
      });
    } catch (err) {
      console.error('KYC SIM verify error:', err);
      res.status(500).json({ error: 'Failed to initiate SIM verification' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 2b: Verify SIM OTP
// POST /api/kyc/sim-verify/confirm
// ═══════════════════════════════════════════════════════════
router.post('/sim-verify/confirm',
  authenticate,
  [
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { code } = req.body;

      const otp = await prisma.oTP.findFirst({
        where: {
          userId: req.user.id,
          code,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
      }

      await prisma.oTP.update({ where: { id: otp.id }, data: { isUsed: true } });
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          simVerified: true,
          kycStep: 2,
        },
      });

      res.json({
        success: true,
        step: 2,
        message: 'SIM ownership verified successfully. Proceed to selfie upload.',
      });
    } catch (err) {
      console.error('KYC SIM OTP confirm error:', err);
      res.status(500).json({ error: 'Failed to verify SIM OTP' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 3: Selfie / Dealer Photo (must match CNIC photo)
// POST /api/kyc/selfie
// ═══════════════════════════════════════════════════════════
router.post('/selfie',
  authenticate,
  upload.single('dealerPhoto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Selfie photo is required. Your face must match the CNIC photo.' });
      }

      const photoUrl = `/uploads/kyc/${req.user.id}/${req.file.filename}`;

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          dealerPhoto: photoUrl,
          kycStep: 3,
        },
      });

      res.json({
        success: true,
        step: 3,
        message: 'Photo uploaded. Admin will verify it matches your CNIC photo. Proceed to warehouse details.',
        data: { photoUrl },
      });
    } catch (err) {
      console.error('KYC selfie upload error:', err);
      res.status(500).json({ error: 'Failed to upload selfie' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 4: Warehouse Verification
// POST /api/kyc/warehouse
// Address + 3 mandatory photos: inside, street view, front door
// ═══════════════════════════════════════════════════════════
router.post('/warehouse',
  authenticate,
  upload.fields([
    { name: 'warehouseInside', maxCount: 1 },
    { name: 'warehouseStreet', maxCount: 1 },
    { name: 'warehouseFrontDoor', maxCount: 1 },
  ]),
  [
    body('warehouseAddress').notEmpty().trim().withMessage('Warehouse address is required'),
    body('businessName').notEmpty().trim().withMessage('Business/warehouse name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { warehouseAddress, businessName } = req.body;
      const insideFile = req.files?.warehouseInside?.[0];
      const streetFile = req.files?.warehouseStreet?.[0];
      const frontDoorFile = req.files?.warehouseFrontDoor?.[0];

      if (!insideFile || !streetFile || !frontDoorFile) {
        return res.status(400).json({
          error: 'All 3 warehouse photos are required: inside premises, street outside, and front door.',
        });
      }

      const insideUrl = `/uploads/kyc/${req.user.id}/${insideFile.filename}`;
      const streetUrl = `/uploads/kyc/${req.user.id}/${streetFile.filename}`;
      const frontDoorUrl = `/uploads/kyc/${req.user.id}/${frontDoorFile.filename}`;

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          businessName,
          warehouseAddress,
          businessAddress: warehouseAddress,
          warehouseInsidePhoto: insideUrl,
          warehouseStreetPhoto: streetUrl,
          warehouseFrontDoorPhoto: frontDoorUrl,
          kycStep: 4,
        },
      });

      res.json({
        success: true,
        step: 4,
        message: 'Warehouse details submitted. Proceed to criminal record verification.',
        data: {
          warehouseInsidePhoto: insideUrl,
          warehouseStreetPhoto: streetUrl,
          warehouseFrontDoorPhoto: frontDoorUrl,
        },
      });
    } catch (err) {
      console.error('KYC warehouse upload error:', err);
      res.status(500).json({ error: 'Failed to upload warehouse details' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 5: Criminal Record Declaration + Police/Character Certs
// POST /api/kyc/criminal-check
// ═══════════════════════════════════════════════════════════
router.post('/criminal-check',
  authenticate,
  upload.fields([
    { name: 'policeVerification', maxCount: 1 },
    { name: 'characterCertificate', maxCount: 1 },
  ]),
  [
    body('declareCriminalFree').isBoolean().withMessage('Criminal declaration is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { declareCriminalFree } = req.body;
      const policeFile = req.files?.policeVerification?.[0];
      const characterFile = req.files?.characterCertificate?.[0];

      const updateData = { kycStep: 5 };

      if (policeFile) {
        updateData.policeVerificationCert = `/uploads/kyc/${req.user.id}/${policeFile.filename}`;
      }
      if (characterFile) {
        updateData.characterCertificate = `/uploads/kyc/${req.user.id}/${characterFile.filename}`;
      }

      // If the person declares they have criminal involvement, flag immediately
      if (declareCriminalFree === 'false' || declareCriminalFree === false) {
        updateData.criminalCheckStatus = 'FLAGGED';
        updateData.criminalFlagged = true;
        updateData.criminalCheckNotes = 'Self-declared criminal activity during KYC registration';
        updateData.accountStatus = 'REJECTED';
        updateData.kycRejectionReason = 'Criminal activity declared by applicant. ID creation blocked.';

        await prisma.user.update({ where: { id: req.user.id }, data: updateData });

        return res.status(403).json({
          success: false,
          message: 'Registration cannot proceed due to criminal activity declaration. Your ID will not be generated.',
        });
      }

      updateData.criminalCheckStatus = 'PENDING';
      await prisma.user.update({ where: { id: req.user.id }, data: updateData });

      res.json({
        success: true,
        step: 5,
        message: 'Criminal check documents submitted. Proceed to final review.',
      });
    } catch (err) {
      console.error('KYC criminal check error:', err);
      res.status(500).json({ error: 'Failed to submit criminal check documents' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// STEP 6: Final Review & Submit
// POST /api/kyc/submit
// ═══════════════════════════════════════════════════════════
router.post('/submit',
  authenticate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Validate all required steps are complete
      const missing = [];
      if (!user.cnicFrontImage || !user.cnicBackImage) missing.push('CNIC front & back photos');
      if (!user.simVerified) missing.push('SIM ownership verification');
      if (!user.dealerPhoto) missing.push('Selfie photo');
      if (!user.warehouseInsidePhoto || !user.warehouseStreetPhoto || !user.warehouseFrontDoorPhoto) {
        missing.push('Warehouse photos (inside, street, front door)');
      }
      if (user.criminalFlagged) {
        return res.status(403).json({
          error: 'Your application has been blocked due to criminal activity flag.',
        });
      }

      if (missing.length > 0) {
        return res.status(400).json({
          error: `Incomplete KYC. Missing: ${missing.join(', ')}`,
          missing,
        });
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          accountStatus: 'DOCUMENTS_SUBMITTED',
          kycSubmittedAt: new Date(),
          kycStep: 6,
        },
      });

      res.json({
        success: true,
        step: 6,
        message: 'KYC application submitted successfully! Admin will review your documents within 24-48 hours.',
        status: 'DOCUMENTS_SUBMITTED',
      });
    } catch (err) {
      console.error('KYC submit error:', err);
      res.status(500).json({ error: 'Failed to submit KYC application' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// GET KYC STATUS — Check current KYC progress
// GET /api/kyc/status
// ═══════════════════════════════════════════════════════════
router.get('/status',
  authenticate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          kycStep: true,
          accountStatus: true,
          cnicNumber: true,
          cnicFrontImage: true,
          cnicBackImage: true,
          simVerified: true,
          simOwnerName: true,
          dealerPhoto: true,
          warehouseAddress: true,
          warehouseInsidePhoto: true,
          warehouseStreetPhoto: true,
          warehouseFrontDoorPhoto: true,
          policeVerificationCert: true,
          characterCertificate: true,
          criminalCheckStatus: true,
          criminalFlagged: true,
          kycSubmittedAt: true,
          kycApprovedAt: true,
          kycRejectionReason: true,
          depositPaid: true,
          depositAmount: true,
          requiredDeposit: true,
        },
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      const completedSteps = [];
      if (user.cnicFrontImage && user.cnicBackImage) completedSteps.push(1);
      if (user.simVerified) completedSteps.push(2);
      if (user.dealerPhoto) completedSteps.push(3);
      if (user.warehouseInsidePhoto && user.warehouseStreetPhoto && user.warehouseFrontDoorPhoto) completedSteps.push(4);
      if (user.criminalCheckStatus !== 'NOT_CHECKED') completedSteps.push(5);
      if (user.kycSubmittedAt) completedSteps.push(6);

      res.json({
        kycStep: user.kycStep,
        accountStatus: user.accountStatus,
        completedSteps,
        totalSteps: 6,
        isSubmitted: !!user.kycSubmittedAt,
        isApproved: !!user.kycApprovedAt,
        isRejected: user.accountStatus === 'REJECTED',
        isCriminalFlagged: user.criminalFlagged,
        rejectionReason: user.kycRejectionReason,
        depositRequired: user.requiredDeposit > 0 && !user.depositPaid,
        depositAmount: user.requiredDeposit,
        depositPaid: user.depositPaid,
        documents: {
          cnicFront: !!user.cnicFrontImage,
          cnicBack: !!user.cnicBackImage,
          simVerified: user.simVerified,
          selfie: !!user.dealerPhoto,
          warehouseInside: !!user.warehouseInsidePhoto,
          warehouseStreet: !!user.warehouseStreetPhoto,
          warehouseFrontDoor: !!user.warehouseFrontDoorPhoto,
          policeVerification: !!user.policeVerificationCert,
          characterCertificate: !!user.characterCertificate,
        },
      });
    } catch (err) {
      console.error('KYC status error:', err);
      res.status(500).json({ error: 'Failed to fetch KYC status' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ADMIN: List all pending KYC applications
// GET /api/kyc/admin/pending
// ═══════════════════════════════════════════════════════════
router.get('/admin/pending', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {
      role: { in: ['DEALER', 'FRANCHISE_ADMIN', 'COLLECTOR'] },
    };
    if (status) {
      where.accountStatus = status;
    } else {
      where.accountStatus = { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'PENDING_VERIFICATION'] };
    }

    const applications = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, displayName: true,
        phone: true, email: true, role: true, city: true,
        accountStatus: true, cnicNumber: true,
        cnicFrontImage: true, cnicBackImage: true,
        dealerPhoto: true, businessName: true, businessAddress: true,
        warehouseAddress: true, warehouseInsidePhoto: true,
        warehouseStreetPhoto: true, warehouseFrontDoorPhoto: true,
        simVerified: true, simOwnerName: true,
        policeVerificationCert: true, characterCertificate: true,
        criminalCheckStatus: true, criminalFlagged: true,
        criminalCheckNotes: true,
        kycSubmittedAt: true, kycApprovedAt: true, kycRejectionReason: true,
        kycStep: true,
        depositPaid: true, depositAmount: true, requiredDeposit: true,
        createdAt: true,
      },
      orderBy: { kycSubmittedAt: 'desc' },
    });

    res.json({
      applications,
      total: applications.length,
    });
  } catch (err) {
    console.error('KYC admin pending error:', err);
    res.status(500).json({ error: 'Failed to fetch KYC applications' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: Get full KYC detail for a user
// GET /api/kyc/admin/:userId
// ═══════════════════════════════════════════════════════════
router.get('/admin/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        wallet: true,
        geoZone: true,
        dealerTerritories: { include: { geoZone: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      displayName: user.displayName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      city: user.city,
      accountStatus: user.accountStatus,
      // Identity
      cnicNumber: user.cnicNumber,
      cnicFrontImage: user.cnicFrontImage,
      cnicBackImage: user.cnicBackImage,
      dealerPhoto: user.dealerPhoto,
      // SIM
      simOwnerName: user.simOwnerName,
      simVerified: user.simVerified,
      // Warehouse
      businessName: user.businessName,
      warehouseAddress: user.warehouseAddress || user.businessAddress,
      warehouseInsidePhoto: user.warehouseInsidePhoto,
      warehouseStreetPhoto: user.warehouseStreetPhoto,
      warehouseFrontDoorPhoto: user.warehouseFrontDoorPhoto,
      // Criminal
      criminalCheckStatus: user.criminalCheckStatus,
      criminalFlagged: user.criminalFlagged,
      criminalCheckNotes: user.criminalCheckNotes,
      policeVerificationCert: user.policeVerificationCert,
      characterCertificate: user.characterCertificate,
      // KYC Status
      kycStep: user.kycStep,
      kycSubmittedAt: user.kycSubmittedAt,
      kycApprovedAt: user.kycApprovedAt,
      kycRejectionReason: user.kycRejectionReason,
      // Deposit
      requiredDeposit: user.requiredDeposit,
      depositPaid: user.depositPaid,
      depositAmount: user.depositAmount,
      depositPaidAt: user.depositPaidAt,
      // Wallet
      balance: user.wallet ? Number(user.wallet.balancePaisa) / 100 : 0,
      // Banking
      ntnNumber: user.ntnNumber,
      bankName: user.bankName,
      bankAccountTitle: user.bankAccountTitle,
      bankAccountNumber: user.bankAccountNumber,
      // Territory
      territories: user.dealerTerritories.map(t => ({
        id: t.id,
        zone: t.geoZone?.name,
      })),
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('KYC admin detail error:', err);
    res.status(500).json({ error: 'Failed to fetch KYC details' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: Approve KYC application
// POST /api/kyc/admin/:userId/approve
// ═══════════════════════════════════════════════════════════
router.post('/admin/:userId/approve',
  [
    body('requiredDeposit').isInt({ min: 0 }).withMessage('Required deposit amount in PKR'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { requiredDeposit = 0, notes } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.criminalFlagged) {
        return res.status(400).json({
          error: 'Cannot approve: User has been flagged for criminal activity.',
        });
      }

      // If deposit is required, set UNDER_REVIEW until deposit is paid
      // If no deposit needed, set ACTIVE directly
      const newStatus = requiredDeposit > 0 ? 'UNDER_REVIEW' : 'ACTIVE';

      await prisma.user.update({
        where: { id: userId },
        data: {
          accountStatus: newStatus,
          kycApprovedAt: new Date(),
          kycRejectionReason: null,
          criminalCheckStatus: 'CLEARED',
          isVerified: true,
          requiredDeposit,
        },
      });

      // Create wallet if not exists
      const existingWallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!existingWallet) {
        await prisma.wallet.create({
          data: { userId, balancePaisa: 0n, currencyId: 'PKR' },
        });
      }

      res.json({
        success: true,
        message: requiredDeposit > 0
          ? `KYC approved. Dealer must deposit ₨${requiredDeposit} to activate account.`
          : 'KYC approved. Account is now active.',
        accountStatus: newStatus,
        requiredDeposit,
      });
    } catch (err) {
      console.error('KYC approve error:', err);
      res.status(500).json({ error: 'Failed to approve KYC' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ADMIN: Reject KYC application
// POST /api/kyc/admin/:userId/reject
// ═══════════════════════════════════════════════════════════
router.post('/admin/:userId/reject',
  [
    body('reason').notEmpty().trim().withMessage('Rejection reason is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { reason } = req.body;

      await prisma.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'REJECTED',
          kycRejectionReason: reason,
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: 'KYC application rejected.',
        reason,
      });
    } catch (err) {
      console.error('KYC reject error:', err);
      res.status(500).json({ error: 'Failed to reject KYC' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ADMIN: Update criminal check status
// POST /api/kyc/admin/:userId/criminal-check
// If flagged, the user's ID is permanently blocked.
// ═══════════════════════════════════════════════════════════
router.post('/admin/:userId/criminal-check',
  [
    body('status').isIn(['PENDING', 'CLEARED', 'FLAGGED']).withMessage('Invalid criminal check status'),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { status, notes } = req.body;

      const updateData = {
        criminalCheckStatus: status,
        criminalCheckNotes: notes || null,
      };

      if (status === 'FLAGGED') {
        // BLOCK the account permanently
        updateData.criminalFlagged = true;
        updateData.accountStatus = 'REJECTED';
        updateData.isActive = false;
        updateData.kycRejectionReason = `Criminal activity detected: ${notes || 'Flagged by admin'}. ID blocked.`;
      } else if (status === 'CLEARED') {
        updateData.criminalFlagged = false;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      res.json({
        success: true,
        message: status === 'FLAGGED'
          ? 'User flagged for criminal activity. Account blocked permanently.'
          : `Criminal check status updated to ${status}`,
        criminalCheckStatus: status,
      });
    } catch (err) {
      console.error('Criminal check update error:', err);
      res.status(500).json({ error: 'Failed to update criminal check' });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// ADMIN: Record deposit payment
// POST /api/kyc/admin/:userId/deposit
// After deposit is received, account becomes ACTIVE.
// ═══════════════════════════════════════════════════════════
router.post('/admin/:userId/deposit',
  [
    body('amount').isInt({ min: 1 }).withMessage('Deposit amount in PKR is required'),
    body('method').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { amount, method } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.criminalFlagged) {
        return res.status(400).json({ error: 'Cannot accept deposit: User is flagged for criminal activity.' });
      }

      // Update user deposit status
      await prisma.user.update({
        where: { id: userId },
        data: {
          depositPaid: true,
          depositAmount: amount,
          depositPaidAt: new Date(),
          accountStatus: 'ACTIVE',
          isActive: true,
        },
      });

      // Add to wallet
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (wallet) {
        await prisma.wallet.update({
          where: { userId },
          data: {
            balancePaisa: wallet.balancePaisa + BigInt(amount * 100),
          },
        });
      } else {
        await prisma.wallet.create({
          data: {
            userId,
            balancePaisa: BigInt(amount * 100),
            currencyId: 'PKR',
          },
        });
      }

      res.json({
        success: true,
        message: `Deposit of ₨${amount} recorded. Account is now ACTIVE.`,
        accountStatus: 'ACTIVE',
        depositAmount: amount,
      });
    } catch (err) {
      console.error('Deposit record error:', err);
      res.status(500).json({ error: 'Failed to record deposit' });
    }
  }
);

module.exports = router;
