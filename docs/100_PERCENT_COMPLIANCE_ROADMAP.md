# 100% Compliance Roadmap

**Current Status:** ~85-90% Compliance  
**Target:** 100% Compliance  
**Date:** 2026-03-14

---

## Executive Summary

To achieve **100% compliance**, we need to address:
1. **Architectural changes** (requires microservices refactoring - 2-3 weeks)
2. **Missing middleware** (can add now - 1-2 days)
3. **Security enhancements** (can add now - 2-3 days)
4. **Design patterns** (can partially adopt - 1 week)

---

## 📊 Current Compliance Breakdown

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Core Auth Patterns** | ✅ 95% | 100% | 5% |
| **Frontend Token Management** | ✅ 90% | 100% | 10% |
| **Architecture** | ❌ 0% | 100% | 100% |
| **Security Middleware** | ⚠️ 40% | 100% | 60% |
| **Design Patterns** | ⚠️ 20% | 100% | 80% |
| **Operations** | ⚠️ 30% | 100% | 70% |

**Overall:** ~85% → **100%**

---

## 🎯 Quick Wins (Can Implement Now - 1-2 Weeks)

### 1. Portal Check Middleware ✅ **HIGH PRIORITY**

**What:** Validate that requests to `/api/admin/*` only accept tokens with `portal: "admin"`.

**Why:** Prevents cross-portal access (e.g., customer token accessing admin routes).

**Implementation:**
```javascript
// backend/src/middleware/portalCheck.js
const { Portal } = require('../../../packages/shared/src/constants');

const portalCheck = (expectedPortal) => (req, res, next) => {
  const tokenPortal = req.user?.portal;
  
  if (!tokenPortal || tokenPortal !== expectedPortal) {
    return res.status(403).json({
      error: {
        message: `Access denied: ${expectedPortal} portal required`,
        code: 'PORTAL_FORBIDDEN'
      }
    });
  }
  
  next();
};

module.exports = { portalCheck };
```

**Usage:**
```javascript
// backend/src/routes/admin.routes.js
const { portalCheck } = require('../middleware/portalCheck');
router.get('/dashboard', authenticate, portalCheck(Portal.ADMIN), getDashboard);
```

**Effort:** 2-3 hours  
**Impact:** +5% compliance

---

### 2. Login Throttle Middleware ✅ **HIGH PRIORITY**

**What:** Prevent brute-force attacks (5 failures per 15-min window).

**Why:** Security requirement from skill.

**Implementation:**
```javascript
// backend/src/middleware/loginThrottle.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({ url: process.env.REDIS_URL });

const loginThrottle = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'login_throttle:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'LOGIN_THROTTLED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by email or phone
    return `login:${req.body.email || req.body.phone}`;
  }
});

module.exports = { loginThrottle };
```

**Usage:**
```javascript
router.post('/admin/login', loginThrottle, [...], async (req, res) => {
  // Login handler
});
```

**Effort:** 3-4 hours  
**Impact:** +5% compliance

---

### 3. Tab Visibility Refresh Enhancement ✅ **MEDIUM PRIORITY**

**What:** Improve `visibilitychange` listener to refresh on tab focus.

**Why:** Skill requirement - refresh if token expires within 2 min on tab focus.

**Current:** We have proactive refresh, but not tab-specific.

**Implementation:**
```javascript
// apps/web-admin/src/services/api-client.js
// Add to existing api-client.js

// Tab visibility refresh (skill requirement)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // Check if token expires within 2 minutes
      if (tokenStore.isExpiringSoon(120)) {
        try {
          await doRefresh();
        } catch (e) {
          // Silent fail - will refresh on next request
        }
      }
    }
  });
}
```

**Effort:** 1 hour  
**Impact:** +2% compliance

---

### 4. Token Family Tracking ✅ **MEDIUM PRIORITY**

**What:** Detect refresh token reuse (stolen token detection).

**Why:** Security requirement - if a refresh token is used twice, revoke all tokens.

**Implementation:**
```javascript
// backend/src/routes/auth.routes.js
// Add to refresh token endpoint

// Store token family in Redis
const tokenFamilyKey = `token_family:${user.id}:${portal}`;
const existingFamily = await redis.get(tokenFamilyKey);

if (existingFamily && existingFamily !== refreshToken) {
  // Token reused - revoke all tokens
  await redis.del(tokenFamilyKey);
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  return res.status(401).json({
    error: { message: 'Token revoked due to reuse detection', code: 'TOKEN_REVOKED' }
  });
}

// Store new family
await redis.set(tokenFamilyKey, refreshToken, 'EX', 7 * 24 * 60 * 60);
```

**Effort:** 4-5 hours  
**Impact:** +3% compliance

---

### 5. Config Validation ✅ **LOW PRIORITY**

**What:** Validate all required env vars at startup.

**Why:** Prevents runtime crashes from missing config.

**Implementation:**
```javascript
// backend/src/config/validate.js
const requiredVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'PORT'
];

function validateConfig() {
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables present');
}

module.exports = { validateConfig };
```

**Usage:**
```javascript
// backend/src/server.js (first line)
const { validateConfig } = require('./config/validate');
validateConfig();
```

**Effort:** 1 hour  
**Impact:** +2% compliance

---

## 🏗️ Architectural Changes (Requires Refactoring - 2-3 Weeks)

### 1. Microservices Architecture ❌ **REQUIRED FOR 100%**

**What:** Split monolithic backend into:
- `services/auth-service/` - Auth only
- `services/gateway/` - API Gateway
- `services/admin-service/` - Admin APIs
- `services/customer-service/` - Customer APIs
- `services/vendor-service/` - Vendor APIs
- `services/agent-service/` - Agent APIs

**Why:** Core skill requirement - cannot achieve 100% without this.

**Effort:** 2-3 weeks  
**Impact:** +40% compliance

**Decision Required:** 
- **Option A:** Full refactor (2-3 weeks) → 100% compliance
- **Option B:** Keep monolithic → Max 90% compliance

---

### 2. API Gateway Pattern ❌ **REQUIRED FOR 100%**

**What:** 
- Gateway validates JWTs via `auth-service /auth/validate`
- Gateway sets `X-User-*` headers before proxying
- Gateway enforces `portalGuard` middleware
- Gateway strips `Authorization` header, injects `X-User-*`

**Why:** Core skill requirement.

**Effort:** Part of microservices refactor  
**Impact:** +15% compliance

---

### 3. X-User-* Headers ❌ **REQUIRED FOR 100%**

**What:** Gateway sets:
- `X-User-Id`
- `X-User-Portal`
- `X-User-Roles`
- `X-User-Email`

**Why:** Services trust headers, not JWTs directly.

**Effort:** Part of microservices refactor  
**Impact:** +5% compliance

---

### 4. Portal Services Trust Headers ❌ **REQUIRED FOR 100%**

**What:** Services verify `X-Internal-Service-Secret` and trust `X-User-*` headers.

**Why:** Security - prevents header forgery.

**Effort:** Part of microservices refactor  
**Impact:** +3% compliance

---

## 🔒 Security Enhancements (Can Add Now)

### 1. HttpOnly Cookies for Refresh Tokens ⚠️ **MEDIUM PRIORITY**

**What:** Store refresh tokens in HttpOnly cookies (not localStorage).

**Why:** Skill requirement - prevents XSS attacks.

**Current:** We use localStorage/request body.

**Implementation:**
```javascript
// Backend: Set HttpOnly cookie
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Frontend: Read from cookie (automatic)
// No localStorage needed for refresh token
```

**Effort:** 2-3 hours  
**Impact:** +3% compliance

**Note:** Mobile apps can't use cookies - they use request body (acceptable).

---

### 2. Redis for Refresh Tokens ⚠️ **MEDIUM PRIORITY**

**What:** Store refresh tokens in Redis (not database).

**Why:** Skill requirement - faster, better for distributed systems.

**Current:** We use PostgreSQL.

**Implementation:**
```javascript
// Store in Redis
await redis.set(
  `refresh:${portal}:${userId}`,
  refreshToken,
  'EX',
  7 * 24 * 60 * 60 // 7 days
);

// Verify from Redis
const stored = await redis.get(`refresh:${portal}:${userId}`);
```

**Effort:** 4-5 hours  
**Impact:** +3% compliance

---

### 3. Gateway Redis Cache ⚠️ **LOW PRIORITY**

**What:** Cache validated JWT payloads in Redis (TTL = remaining token lifetime).

**Why:** Performance - reduces auth-service calls.

**Effort:** Part of gateway implementation  
**Impact:** +2% compliance

---

## 🎨 Design Patterns (Can Partially Adopt)

### 1. Repository Pattern ⚠️ **OPTIONAL**

**What:** Abstract database access behind Repository classes.

**Why:** Better testability, separation of concerns.

**Current:** Direct Prisma calls in routes.

**Effort:** 1 week (partial adoption)  
**Impact:** +5% compliance

---

### 2. DTO Serializers ⚠️ **OPTIONAL**

**What:** Serialize responses through DTO classes (hide sensitive fields).

**Why:** Security - prevents accidental field exposure.

**Current:** Direct Prisma model returns.

**Effort:** 3-4 days  
**Impact:** +3% compliance

---

### 3. Audit Logging ⚠️ **OPTIONAL**

**What:** Log all mutating operations (POST/PATCH/DELETE).

**Why:** Compliance, security auditing.

**Effort:** 2-3 days  
**Impact:** +2% compliance

---

### 4. Idempotency Middleware ⚠️ **OPTIONAL**

**What:** Prevent duplicate operations via `Idempotency-Key` header.

**Why:** Prevents duplicate charges, orders, etc.

**Effort:** 2-3 days  
**Impact:** +2% compliance

---

## 📱 Frontend Enhancements (Can Add Now)

### 1. auth_present Cookie ⚠️ **NEXT.JS SPECIFIC**

**What:** Set `auth_present` cookie on login, check in `middleware.ts`.

**Why:** Next.js requirement - prevents page flash.

**Current:** We use React (not Next.js).

**Effort:** N/A (not applicable)  
**Impact:** 0% (we're not using Next.js)

---

### 2. /auth/validate Endpoint ⚠️ **OPTIONAL**

**What:** Frontend calls `/auth/validate` to confirm token validity.

**Why:** Skill requirement for AuthGuard.

**Implementation:**
```javascript
// backend/src/routes/auth.routes.js
router.get('/validate', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});
```

**Effort:** 1 hour  
**Impact:** +2% compliance

---

## 📋 Implementation Priority

### Phase 1: Quick Wins (1-2 Weeks) → **+15% Compliance**

1. ✅ Portal Check Middleware (2-3 hours)
2. ✅ Login Throttle Middleware (3-4 hours)
3. ✅ Tab Visibility Refresh (1 hour)
4. ✅ Token Family Tracking (4-5 hours)
5. ✅ Config Validation (1 hour)
6. ✅ /auth/validate Endpoint (1 hour)

**Total Effort:** ~2 weeks  
**New Compliance:** ~90-95%

---

### Phase 2: Security Enhancements (1 Week) → **+8% Compliance**

1. ⚠️ HttpOnly Cookies for Refresh Tokens (2-3 hours)
2. ⚠️ Redis for Refresh Tokens (4-5 hours)
3. ⚠️ Gateway Redis Cache (if gateway exists)

**Total Effort:** ~1 week  
**New Compliance:** ~95-98%

---

### Phase 3: Design Patterns (1-2 Weeks) → **+12% Compliance**

1. ⚠️ Repository Pattern (partial) (1 week)
2. ⚠️ DTO Serializers (3-4 days)
3. ⚠️ Audit Logging (2-3 days)
4. ⚠️ Idempotency Middleware (2-3 days)

**Total Effort:** ~2 weeks  
**New Compliance:** ~98-99%

---

### Phase 4: Full Microservices (2-3 Weeks) → **+40% Compliance**

1. ❌ Split into microservices
2. ❌ Implement API Gateway
3. ❌ X-User-* headers
4. ❌ Portal services trust headers

**Total Effort:** 2-3 weeks  
**Final Compliance:** **100%**

---

## 🎯 Recommended Path

### Option A: **Pragmatic Approach** (Recommended)

**Goal:** Achieve ~95% compliance without full refactor

**Steps:**
1. ✅ Implement Phase 1 (Quick Wins) - 1-2 weeks
2. ⚠️ Implement Phase 2 (Security) - 1 week
3. ⚠️ Partially implement Phase 3 (Design Patterns) - 1 week

**Result:** ~95% compliance, production-ready, maintainable

**Total Time:** 3-4 weeks

---

### Option B: **Full Compliance** (If Time Permits)

**Goal:** Achieve 100% compliance

**Steps:**
1. ✅ Implement Phase 1 (Quick Wins) - 1-2 weeks
2. ⚠️ Implement Phase 2 (Security) - 1 week
3. ⚠️ Implement Phase 3 (Design Patterns) - 1-2 weeks
4. ❌ Implement Phase 4 (Microservices) - 2-3 weeks

**Result:** 100% compliance, full skill alignment

**Total Time:** 5-7 weeks

---

## 📊 Compliance Matrix

| Requirement | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Final |
|------------|---------|--------|---------|---------|---------|-------|
| Portal Enum | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JWT Portal Claim | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portal Logins | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Advanced Refresh | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| X-Token-Error | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portal Check | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login Throttle | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tab Visibility | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Token Family | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HttpOnly Cookies | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Redis Refresh | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Config Validation | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Repository Pattern | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ |
| DTO Serializers | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ |
| Microservices | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| API Gateway | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| X-User-* Headers | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **TOTAL** | **85%** | **90%** | **95%** | **98%** | **100%** | **100%** |

---

## 🚀 Next Steps

1. **Decide on approach:**
   - Option A: Pragmatic (~95% in 3-4 weeks)
   - Option B: Full compliance (100% in 5-7 weeks)

2. **Start with Phase 1** (Quick Wins) - highest ROI

3. **Review and prioritize** Phase 2-4 based on business needs

---

**Report Generated:** 2026-03-14  
**Status:** Ready for implementation
