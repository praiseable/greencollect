const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../services/prisma');
// Auth service uses trustHeaders for routes called via gateway
// Uses validateJWT for /validate endpoint (called by gateway to validate tokens)
const { trustHeaders, validateJWT } = require('../middleware/trustHeaders');
const { v4: uuidv4 } = require('uuid');
const { Portal, Role, ROLE_TO_PORTAL } = require('../../../../packages/shared/src/constants');
const { loginThrottle, resetLoginThrottle } = require('../middleware/loginThrottle');
const { storeRefreshToken, getRefreshToken, deleteRefreshToken, deleteAllRefreshTokens } = require('../utils/refreshToken');
const { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromRequest } = require('../utils/cookieHelper');
const { serializeUser, ok, created } = require('../utils/dto');
// Idempotency for login endpoints (optional but recommended)
// Note: idempotency middleware would need to be copied if needed

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'gc_jwt_refresh_pr0d_k3y_2026_r4n8p';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Changed from 30d to 7d per skill

// Generate tokens with portal claim (skill-compliant JWT payload)
function generateTokens(userId, role, email, portal = null) {
  // Determine portal from role if not provided
  const userPortal = portal || ROLE_TO_PORTAL[role] || Portal.CUSTOMER;
  
  // Convert role to roles array (skill requirement)
  const roles = [role];
  
  // Skill-compliant JWT payload
  const payload = {
    sub: userId,           // User ID (skill uses 'sub' not 'userId')
    email: email || null,
    portal: userPortal,   // REQUIRED — portal claim
    roles: roles,         // REQUIRED — array of roles
    iat: Math.floor(Date.now() / 1000),
  };
  
  const refreshPayload = {
    ...payload,
    type: 'refresh',
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
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

    const tokens = generateTokens(user.id, user.role, user.email);
    const portal = ROLE_TO_PORTAL[user.role] || Portal.CUSTOMER;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, portal, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    // Return access token in response (refresh token is in cookie, not response body)
    // Use DTO serializer to prevent sensitive field exposure
    res.status(201).json(created({
      user: serializeUser(user),
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900, // 15 minutes in seconds
      // Note: refreshToken not in response - it's in HttpOnly cookie
      // Mobile apps can still use request body (backward compatible)
    }));
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

    const tokens = generateTokens(user.id, user.role, user.email);
    const portal = ROLE_TO_PORTAL[user.role] || Portal.CUSTOMER;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, portal, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

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
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900, // 15 minutes in seconds
      // Note: refreshToken not in response - it's in HttpOnly cookie
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

    // Log OTP in dev or when ALLOW_TEST_OTP (so you can check server logs or DB)
    const allowTestOtp = process.env.ALLOW_TEST_OTP === 'true' || process.env.ALLOW_TEST_OTP === '1';
    if (process.env.NODE_ENV !== 'production' || allowTestOtp) {
      console.log(`[OTP] ${normalizedPhone} → ${code}`);
    }

    const payload = { success: true, message: 'OTP sent', expiresIn: 300, cooldownSeconds: otpStore.OTP_RESEND_COOLDOWN_SECONDS };
    if (process.env.NODE_ENV !== 'production' || allowTestOtp) {
      payload.otp = code; // return OTP when dev or ALLOW_TEST_OTP (e.g. staging) so app can show it
    }
    res.json(payload);
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

    // Dev/test: accept 123456 or 111111 when not in production, or when ALLOW_TEST_OTP is set (e.g. staging)
    const allowTestOtp = process.env.ALLOW_TEST_OTP === 'true' || process.env.ALLOW_TEST_OTP === '1';
    const isDevBypass = (process.env.NODE_ENV !== 'production' || allowTestOtp) && (code === '123456' || code === '111111');
    if (isDevBypass) otpStore.clearLockout(normalizedPhone);

    const lockedUntil = otpStore.getLockout(normalizedPhone);
    if (lockedUntil) {
      return res.status(423).json({ error: { code: 'OTP_LOCKED', lockedUntil: lockedUntil.toISOString() } });
    }

    // Dev/test bypass: accept 123456 or 111111 when not in production (no SMS in dev)
    if (isDevBypass) {
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
      const tokens = generateTokens(user.id, user.role, user.email);
      const portal = ROLE_TO_PORTAL[user.role] || Portal.CUSTOMER;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
      await storeRefreshToken(user.id, portal, tokens.refreshToken, expiresAt);

      // Set HttpOnly cookie for refresh token (skill requirement - web clients)
      setRefreshTokenCookie(res, tokens.refreshToken, 7);

      const userPayload = { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName, role: user.role };
      return res.json({
        success: true,
        user: userPayload,
        accessToken: tokens.accessToken, // Only access token in response
        expiresIn: 900, // 15 minutes in seconds
        // Note: refreshToken not in response - it's in HttpOnly cookie
      });
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

    const tokens = generateTokens(user.id, user.role, user.email);
    const portal = ROLE_TO_PORTAL[user.role] || Portal.CUSTOMER;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, portal, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    const userPayload = { id: user.id, phone: user.phone, firstName: user.firstName, lastName: user.lastName, role: user.role };
    res.json({
      success: true,
      user: userPayload,
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900, // 15 minutes in seconds
      // Note: refreshToken not in response - it's in HttpOnly cookie
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: { message: 'OTP verification failed', code: 'INTERNAL_ERROR' } });
  }
}

router.post('/otp/verify', otpVerifyValidators, otpVerifyHandler);
router.post('/verify-otp', otpVerifyValidators, otpVerifyHandler); // mobile app alias

// POST /auth/refresh (skill-compliant endpoint)
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie (web) or request body (mobile - backward compatible)
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(400).json({ error: { message: 'Refresh token required', code: 'REFRESH_TOKEN_MISSING' } });
    }

    // Verify JWT
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Invalid token format', code: 'TOKEN_INVALID' } });
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: { message: 'User not found or inactive', code: 'USER_INVALID' } });
    }
    
    // Extract portal from decoded token (backward compatible)
    const portal = decoded.portal || ROLE_TO_PORTAL[decoded.role] || Portal.CUSTOMER;
    
    // Verify token exists in Redis (primary) or PostgreSQL (fallback)
    const tokenValid = await getRefreshToken(userId, portal, refreshToken);
    if (!tokenValid) {
      return res.status(401).json({ error: { message: 'Invalid refresh token', code: 'TOKEN_INVALID' } });
    }
    
    // Token Family Tracking (skill requirement - detect stolen token reuse)
    const { getRedisClient } = require('../utils/redis');
    const redis = await getRedisClient();
    if (redis) {
      const tokenFamilyKey = `token_family:${portal}:${userId}`;
      const existingFamily = await redis.get(tokenFamilyKey);
      
      // If token family exists and doesn't match current token, it's been reused
      if (existingFamily && existingFamily !== refreshToken) {
        // Token reused - revoke all tokens (security breach)
        await redis.del(tokenFamilyKey);
        await deleteAllRefreshTokens(userId, portal);
        return res.status(401).json({
          error: {
            message: 'Token revoked due to reuse detection. Please login again.',
            code: 'TOKEN_REVOKED'
          }
        });
      }
    }

    // Delete old token (token rotation)
    await deleteRefreshToken(userId, portal, refreshToken);

    // Generate new tokens
    const roles = decoded.roles || [decoded.role];
    const tokens = generateTokens(userId, roles[0], user.email, portal);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store new refresh token in Redis (primary) or PostgreSQL (fallback)
    await storeRefreshToken(userId, portal, tokens.refreshToken, expiresAt);

    // Update token family in Redis (if available)
    if (redis) {
      const tokenFamilyKey = `token_family:${portal}:${userId}`;
      await redis.set(tokenFamilyKey, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 }); // 7 days
    }

    // Set new refresh token cookie (web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    // Return only access token (refresh token is in cookie)
    res.json({ 
      accessToken: tokens.accessToken, 
      expiresIn: 900, // 15 minutes in seconds
      // Note: refreshToken not in response - it's in HttpOnly cookie
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { message: 'Invalid refresh token', code: 'TOKEN_INVALID' } });
    }
    console.error('Refresh token error:', err);
    res.status(401).json({ error: { message: 'Invalid refresh token', code: 'TOKEN_INVALID' } });
  }
});

// POST /auth/refresh-token (backward compatibility alias - same as /refresh)
// Uses same logic as /refresh but keeps old endpoint for backward compatibility
router.post('/refresh-token', async (req, res) => {
  // Reuse the same handler as /refresh
  // Get refresh token from cookie (web) or request body (mobile - backward compatible)
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    return res.status(400).json({ error: { message: 'Refresh token required', code: 'REFRESH_TOKEN_MISSING' } });
  }

  // Verify JWT
  const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  const userId = decoded.sub || decoded.userId;
  if (!userId) {
    return res.status(401).json({ error: { message: 'Invalid token format', code: 'TOKEN_INVALID' } });
  }

  // Get user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: { message: 'User not found or inactive', code: 'USER_INVALID' } });
  }
  
  // Extract portal from decoded token (backward compatible)
  const portal = decoded.portal || ROLE_TO_PORTAL[decoded.role] || Portal.CUSTOMER;
  
  // Verify token exists in Redis (primary) or PostgreSQL (fallback)
  const tokenValid = await getRefreshToken(userId, portal, refreshToken);
  if (!tokenValid) {
    return res.status(401).json({ error: { message: 'Invalid refresh token', code: 'TOKEN_INVALID' } });
  }
  
  // Token Family Tracking
  const { getRedisClient } = require('../utils/redis');
  const redis = await getRedisClient();
  if (redis) {
    const tokenFamilyKey = `token_family:${portal}:${userId}`;
    const existingFamily = await redis.get(tokenFamilyKey);
    
    if (existingFamily && existingFamily !== refreshToken) {
      await redis.del(tokenFamilyKey);
      await deleteAllRefreshTokens(userId, portal);
      return res.status(401).json({
        error: {
          message: 'Token revoked due to reuse detection. Please login again.',
          code: 'TOKEN_REVOKED'
        }
      });
    }
  }

  // Delete old token (token rotation)
  await deleteRefreshToken(userId, portal, refreshToken);

  // Generate new tokens
  const roles = decoded.roles || [decoded.role];
  const tokens = generateTokens(userId, roles[0], user.email, portal);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Store new refresh token in Redis (primary) or PostgreSQL (fallback)
  await storeRefreshToken(userId, portal, tokens.refreshToken, expiresAt);

  // Update token family in Redis (if available)
  if (redis) {
    const tokenFamilyKey = `token_family:${portal}:${userId}`;
    await redis.set(tokenFamilyKey, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 }); // 7 days
  }

  // Set new refresh token cookie (web clients)
  setRefreshTokenCookie(res, tokens.refreshToken, 7);

  // Return only access token (refresh token is in cookie)
  res.json({ 
    accessToken: tokens.accessToken, 
    expiresIn: 900, // 15 minutes in seconds
    // Note: refreshToken not in response - it's in HttpOnly cookie
  });
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

    const tokens = generateTokens(user.id, user.role, user.email, Portal.ADMIN);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
    res.json({ 
      success: true, 
      user: userPayload, 
      accessToken: tokens.accessToken, 
      refreshToken: tokens.refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

// Portal-specific login endpoints (skill requirement)
// POST /auth/admin/login — Issues JWT with portal: "admin"
router.post('/admin/login', loginThrottle, [
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
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'ADMIN_VIEWER', 'COLLECTION_MANAGER'] },
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

    const tokens = generateTokens(user.id, user.role, user.email, Portal.ADMIN);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, Portal.ADMIN, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    // Reset login throttle on successful login
    await resetLoginThrottle(email);

    // Use DTO serializer to prevent sensitive field exposure
    res.json(ok({ 
      user: serializeUser(user),
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900,
      // Note: refreshToken not in response - it's in HttpOnly cookie
    }));
  } catch (err) {
    console.error('Admin portal login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

// POST /auth/customer/login — Issues JWT with portal: "customer"
router.post('/customer/login', loginThrottle, [
  body('email').optional().isEmail(),
  body('phone').optional(),
  body('password').notEmpty(),
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
    if (!['CUSTOMER', 'PREMIUM_CUSTOMER'].includes(user.role)) {
      return res.status(403).json({ error: { message: 'Access denied for this portal', code: 'FORBIDDEN' } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });

    const tokens = generateTokens(user.id, user.role, user.email, Portal.CUSTOMER);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, Portal.CUSTOMER, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Reset login throttle on successful login
    await resetLoginThrottle(email || phone);

    // Use DTO serializer to prevent sensitive field exposure
    res.json(ok({
      user: serializeUser(user),
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900,
      // Note: refreshToken not in response - it's in HttpOnly cookie
    }));
  } catch (err) {
    console.error('Customer portal login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

// POST /auth/dealer/login — Issues JWT with portal: "dealer" (for dealer/franchise portal)
router.post('/dealer/login', loginThrottle, [
  body('email').optional().isEmail(),
  body('phone').optional(),
  body('password').notEmpty(),
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
    if (!['DEALER', 'FRANCHISE_OWNER', 'REGIONAL_MANAGER', 'WHOLESALE_BUYER'].includes(user.role)) {
      return res.status(403).json({ error: { message: 'Access denied for this portal', code: 'FORBIDDEN' } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });

    const tokens = generateTokens(user.id, user.role, user.email, Portal.DEALER);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in Redis (skill requirement) with fallback to PostgreSQL
    await storeRefreshToken(user.id, Portal.DEALER, tokens.refreshToken, expiresAt);

    // Set HttpOnly cookie for refresh token (skill requirement - web clients)
    setRefreshTokenCookie(res, tokens.refreshToken, 7);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Reset login throttle on successful login
    await resetLoginThrottle(email || phone);

    // Use DTO serializer to prevent sensitive field exposure
    res.json(ok({
      user: serializeUser(user),
      accessToken: tokens.accessToken, // Only access token in response
      expiresIn: 900,
      // Note: refreshToken not in response - it's in HttpOnly cookie
    }));
  } catch (err) {
    console.error('Dealer portal login error:', err);
    res.status(500).json({ error: { message: 'Login failed', code: 'INTERNAL_ERROR' } });
  }
});

// POST /auth/logout
router.post('/logout', trustHeaders, async (req, res) => {
  try {
    const portal = req.user.portal || Portal.CUSTOMER;
    
    // Delete all refresh tokens from Redis and PostgreSQL
    await deleteAllRefreshTokens(req.user.id, portal);
    
    // Clear refresh token cookie
    clearRefreshTokenCookie(res);
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    // Still clear cookie even if DB operation fails
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: { message: 'Logout failed' } });
  }
});

// GET /auth/me
router.get('/me', trustHeaders, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        geoZone: true,
        subscription: { include: { plan: true } },
        wallet: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found', code: 'USER_NOT_FOUND' } });
    }
    // Use DTO serializer to prevent sensitive field exposure
    res.json(ok({ user: serializeUser(user) }));
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch profile' } });
  }
});

// GET /auth/validate — Validate token (skill requirement for AuthGuard)
// Used by gateway to validate tokens - validates JWT directly
router.get('/validate', validateJWT, async (req, res) => {
  try {
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        portal: req.user.portal,
        roles: req.user.roles,
      }
    });
  } catch (err) {
    res.status(401).json({
      valid: false,
      error: { message: 'Token validation failed', code: 'TOKEN_INVALID' }
    });
  }
});

module.exports = router;
