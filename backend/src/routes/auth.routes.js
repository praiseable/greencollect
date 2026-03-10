const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'gc_jwt_refresh_pr0d_k3y_2026_r4n8p';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Generate tokens
function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, role, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

// POST /auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^(\+92|0)?3[0-9]{9}$/).withMessage('Invalid Pakistan phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { firstName, lastName, email, phone, password, role, city } = req.body;

    // Check existing user
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: { message: 'Email already registered', code: 'DUPLICATE_EMAIL' } });
    }
    if (phone) {
      const normalizedPhone = phone.startsWith('0') ? `+92${phone.substring(1)}` : phone.startsWith('+92') ? phone : `+92${phone}`;
      const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (existing) return res.status(409).json({ error: { message: 'Phone already registered', code: 'DUPLICATE_PHONE' } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedPhone = phone ? (phone.startsWith('0') ? `+92${phone.substring(1)}` : phone.startsWith('+92') ? phone : `+92${phone}`) : null;

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        email: email || null,
        phone: normalizedPhone,
        passwordHash,
        role: role || 'CUSTOMER',
        city: city || null,
        countryId: 'PK',
        currencyId: 'PKR',
        languageId: 'en',
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true },
    });

    const tokens = generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ user, ...tokens });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: { message: 'Registration failed', code: 'INTERNAL_ERROR' } });
  }
});

// POST /auth/login
router.post('/login', [
  body('email').optional().isEmail(),
  body('phone').optional(),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, phone, password } = req.body;

    let user;
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    } else if (phone) {
      const normalizedPhone = phone.startsWith('0') ? `+92${phone.substring(1)}` : phone.startsWith('+92') ? phone : `+92${phone}`;
      user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    }

    if (!user) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    if (!user.isActive) return res.status(403).json({ error: { message: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' } });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });

    const tokens = generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        languageId: user.languageId,
        countryId: user.countryId,
      },
      ...tokens,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

const otpStore = require('../utils/otpStore');

// POST /auth/otp/send — Send OTP to Pakistan phone (spec: suspended 403, lockout 423, cooldown 429)
router.post('/otp/send', [
  body('phone').matches(/^(\+92|0)?3[0-9]{9}$/).withMessage('Invalid Pakistan phone number (+92 format)'),
  body('purpose').optional().isIn(['LOGIN', 'REGISTER', 'RESET_PASSWORD']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { phone, purpose = 'LOGIN' } = req.body;
    const normalizedPhone = phone.startsWith('0') ? `+92${phone.substring(1)}` : phone.startsWith('+92') ? phone : `+92${phone}`;

    // Suspended/banned user gets 403 immediately (spec 2.4)
    const existingUser = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingUser && ['SUSPENDED', 'REJECTED'].includes(existingUser.accountStatus)) {
      return res.status(403).json({ error: { message: 'Account is suspended or rejected', code: 'ACCOUNT_SUSPENDED' } });
    }

    const lockedUntil = otpStore.getLockout(normalizedPhone);
    if (lockedUntil) {
      return res.status(423).json({ error: { code: 'OTP_LOCKED', lockedUntil: lockedUntil.toISOString() } });
    }

    const cooldownSec = otpStore.getCooldown(normalizedPhone);
    if (cooldownSec !== null) {
      return res.status(429).json({ error: { message: 'Please wait before requesting another OTP', code: 'OTP_COOLDOWN', cooldownSeconds: cooldownSec } });
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP
    await prisma.oTP.create({
      data: {
        phone: normalizedPhone,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    otpStore.setCooldown(normalizedPhone);

    // TODO: Send via Twilio in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`OTP for ${normalizedPhone}: ${code}`);
    }

    res.json({ success: true, message: 'OTP sent', expiresIn: 300, cooldownSeconds: otpStore.OTP_RESEND_COOLDOWN_SECONDS });
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ error: { message: 'Failed to send OTP', code: 'OTP_FAILED' } });
  }
});

// OTP verify (spec: lockout 423, wrong code -> attemptsLeft). Accepts both code and otp for mobile.
const otpVerifyValidators = [
  body('phone').matches(/^(\+92|0)?3[0-9]{9}$/),
  body('code').optional().isLength({ min: 6, max: 6 }),
  body('otp').optional().isLength({ min: 6, max: 6 }),
];
async function otpVerifyHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { phone, code: codeBody, otp: otpBody } = req.body;
    const code = codeBody || otpBody;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: { message: 'Code must be 6 digits', code: 'VALIDATION_ERROR' } });
    }
    const normalizedPhone = phone.startsWith('0') ? `+92${phone.substring(1)}` : phone.startsWith('+92') ? phone : `+92${phone}`;

    const lockedUntil = otpStore.getLockout(normalizedPhone);
    if (lockedUntil) {
      return res.status(423).json({ error: { code: 'OTP_LOCKED', lockedUntil: lockedUntil.toISOString() } });
    }

    const otp = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: { message: 'Invalid or expired OTP', code: 'OTP_INVALID', attemptsLeft: otpStore.getAttemptsLeft(normalizedPhone) } });
    }

    if (otp.code !== code) {
      const n = otpStore.recordFailedAttempt(normalizedPhone);
      const attemptsLeft = otpStore.getAttemptsLeft(normalizedPhone);
      if (n >= otpStore.OTP_MAX_ATTEMPTS) {
        const lockedUntil = otpStore.getLockout(normalizedPhone);
        return res.status(423).json({ error: { message: 'Too many failed attempts. Account locked.', code: 'OTP_LOCKED', lockedUntil: lockedUntil ? lockedUntil.toISOString() : null } });
      }
      return res.status(400).json({ error: { message: `Incorrect OTP (${attemptsLeft} attempts left)`, code: 'OTP_INVALID', attemptsLeft } });
    }

    await prisma.oTP.update({ where: { id: otp.id }, data: { isUsed: true } });
    otpStore.clearAttempts(normalizedPhone);

    let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          firstName: 'User',
          lastName: normalizedPhone.slice(-4),
          role: 'CUSTOMER',
          isVerified: true,
          countryId: 'PK',
          currencyId: 'PKR',
          languageId: 'en',
        },
      });
    }

    const tokens = generateTokens(user.id, user.role);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    const userPayload = { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName, role: user.role };
    res.json({
      success: true,
      user: userPayload,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: { message: 'OTP verification failed', code: 'INTERNAL_ERROR' } });
  }
}

router.post('/otp/verify', otpVerifyValidators, otpVerifyHandler);
router.post('/verify-otp', otpVerifyValidators, otpVerifyHandler); // mobile app alias

// POST /auth/refresh-token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: { message: 'Refresh token required' } });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored) return res.status(401).json({ error: { message: 'Invalid refresh token' } });

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = generateTokens(decoded.userId, decoded.role);
    await prisma.refreshToken.create({
      data: { userId: decoded.userId, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: { message: 'Invalid refresh token' } });
  }
});

// POST /auth/admin-login — spec 2.4 (portal only: email + password, role admin|super_admin)
router.post('/admin-login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        email: email || undefined,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: { message: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' } });
    }

    const tokens = generateTokens(user.id, user.role);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
    res.json({ success: true, user: userPayload, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Logout failed' } });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        geoZone: true,
        subscription: { include: { plan: true } },
        wallet: true,
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch profile' } });
  }
});

module.exports = router;
