# Skill Validation Report: Multi-Portal Unified Backend

**Date:** 2026-03-14  
**Skill:** `app-development` (multi-portal-unified-backend)  
**Project:** gc-app (GreenCollect/Kabariya)

---

## Executive Summary

**Overall Compliance: ❌ 15%**

The current project architecture is **monolithic** while the skill requires a **microservices architecture** with API Gateway pattern. Most core requirements are not met, but the project follows a different (simpler) architectural pattern that may be intentional for this use case.

---

## 1. Architecture Pattern ❌

### Skill Requirement
- **Microservices architecture** with separate services:
  - `services/auth-service/` - Dedicated auth service
  - `services/gateway/` - API Gateway (Express proxy)
  - `services/admin-service/` - Admin portal APIs
  - `services/customer-service/` - Customer portal APIs
  - `services/vendor-service/` - Vendor portal APIs
  - `services/agent-service/` - Agent portal APIs

### Current Implementation
- **Monolithic backend** at `backend/`
- Single Express app handling all routes
- No separate gateway service
- No microservices separation

### Status: ❌ **NOT COMPLIANT**

**Impact:** High - This is a fundamental architectural difference. The skill is designed for microservices, but the project uses a monolithic approach.

---

## 2. JWT Payload Structure ❌

### Skill Requirement
```js
{
  sub:      "uuid-v4",          // User ID
  email:    "user@example.com",
  portal:   "admin",            // REQUIRED — one of Portal enum values
  roles:    ["super_admin"],    // REQUIRED — array of Role enum values
  entityId: "vendor-uuid",      // Optional
  iat:      1700000000,
  exp:      1700000900
}
```

**Key Requirements:**
- `portal` field is **mandatory**
- `roles` must be an **array**
- Portal value must be from Portal enum

### Current Implementation
```js
// backend/src/routes/auth.routes.js:16
function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  // Missing: portal, roles (array), email, sub, entityId
}
```

**Current Payload:**
```js
{
  userId: "uuid",    // Should be "sub"
  role: "ADMIN"      // Should be roles: ["admin"], missing portal
}
```

### Status: ❌ **NOT COMPLIANT**

**Missing:**
- ❌ `portal` field (mandatory)
- ❌ `roles` as array (currently single `role` string)
- ❌ `sub` (using `userId` instead)
- ❌ `email` in payload
- ❌ `entityId` support

---

## 3. API Gateway Pattern ❌

### Skill Requirement
- Separate `services/gateway/` service
- Gateway validates JWTs by calling `auth-service /auth/validate`
- Gateway sets `X-User-*` headers before proxying
- Gateway enforces `portalGuard` middleware
- Gateway routing table:
  ```
  /auth/*          → auth-service:5000
  /api/admin/*     → admin-service:5001
  /api/customer/*  → customer-service:5002
  /api/vendor/*    → vendor-service:5003
  /api/agent/*     → agent-service:5004
  ```

### Current Implementation
- No separate gateway service
- Backend handles all routes directly
- No `X-User-*` header pattern
- No portal-based routing

### Status: ❌ **NOT COMPLIANT**

---

## 4. Portal-Specific Login Endpoints ❌

### Skill Requirement
- `POST /auth/admin/login` - Issues JWT with `portal: "admin"`
- `POST /auth/customer/login` - Issues JWT with `portal: "customer"`
- `POST /auth/vendor/login` - Issues JWT with `portal: "vendor"`
- `POST /auth/agent/login` - Issues JWT with `portal: "agent"`

### Current Implementation
- `POST /auth/login` - Generic login (no portal)
- `POST /auth/admin-login` - Admin-specific (but no portal claim in token)
- `POST /auth/otp/send` - OTP-based login (mobile)

### Status: ❌ **NOT COMPLIANT**

**Missing:** Portal-specific login endpoints and portal claims in tokens.

---

## 5. Shared Constants Package ❌

### Skill Requirement
- `packages/shared/src/constants.js` with:
  ```js
  const Portal = Object.freeze({
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    AGENT: 'agent',
  });
  
  const Role = Object.freeze({
    SUPER_ADMIN: 'super_admin',
    ADMIN_VIEWER: 'admin_viewer',
    // ... etc
  });
  
  const PORTAL_ROLES = { ... };
  ```

### Current Implementation
- No `packages/shared/` directory
- No Portal enum
- Roles are string literals throughout codebase
- No centralized constants

### Status: ❌ **NOT COMPLIANT**

---

## 6. Frontend Token Management ❌

### Skill Requirement
**Advanced token refresh patterns:**
1. ✅ Concurrent 401 queue (only one refresh at a time)
2. ✅ Proactive silent refresh (60s before expiry)
3. ✅ Expiry timestamp in localStorage
4. ✅ Multi-tab sync via storage events
5. ✅ Refresh loop guard
6. ✅ X-Token-Error header handling

**Portal-specific token storage:**
- `admin_access_token` / `admin_token_expires_at`
- `customer_access_token` / `customer_token_expires_at`
- etc.

### Current Implementation
```js
// apps/web-admin/src/services/api.js
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

**Missing:**
- ❌ Concurrent 401 queue
- ❌ Proactive refresh
- ❌ Expiry timestamp tracking
- ❌ Multi-tab sync
- ❌ Refresh loop guard
- ❌ X-Token-Error handling

### Status: ❌ **NOT COMPLIANT**

---

## 7. Project Structure ❌

### Skill Requirement
```
project-root/
├── services/
│   ├── auth-service/
│   ├── gateway/
│   ├── admin-service/
│   ├── customer-service/
│   └── ...
├── packages/
│   └── shared/
├── apps/
│   ├── portal-admin/
│   ├── portal-customer/
│   └── ...
```

### Current Implementation
```
project-root/
├── backend/          ← Monolithic (not services/)
├── apps/
│   ├── mobile/       ← Flutter (not in skill spec)
│   ├── web-admin/    ← React (not portal-admin/)
│   └── web-client/   ← React (not portal-customer/)
```

### Status: ❌ **NOT COMPLIANT**

---

## 8. X-User-* Headers Pattern ❌

### Skill Requirement
Gateway sets these headers before proxying:
```
X-User-Id:       <sub from JWT>
X-User-Email:    <email from JWT>
X-User-Portal:   <portal from JWT>
X-User-Roles:    <comma-separated roles>
X-User-EntityId: <entityId from JWT>
```

Services trust these headers (never re-validate JWT).

### Current Implementation
- No gateway → no X-User-* headers
- Services validate JWT directly in middleware

### Status: ❌ **NOT COMPLIANT**

---

## 9. Portal Check Middleware ❌

### Skill Requirement
Each portal service must have `portalCheck` middleware that:
- Validates `X-User-Portal` header
- Rejects requests with wrong portal

### Current Implementation
- No portal check middleware
- Role-based authorization only (`authorize(...roles)`)

### Status: ❌ **NOT COMPLIANT**

---

## 10. Refresh Token Pattern ⚠️ PARTIAL

### Skill Requirement
- Refresh tokens: 7-day expiry, HttpOnly cookie, Redis-backed
- Portal-scoped refresh tokens: `refresh:{portal}:{userId}`
- Token rotation on refresh

### Current Implementation
- Refresh tokens: 30-day expiry (not 7 days)
- Stored in PostgreSQL (not Redis)
- No portal scoping
- Token rotation: ✅ Implemented

### Status: ⚠️ **PARTIALLY COMPLIANT**

---

## 11. Token Expiry ⚠️ PARTIAL

### Skill Requirement
- Access tokens: **15 minutes**
- Refresh tokens: **7 days**

### Current Implementation
- Access tokens: **15 minutes** ✅
- Refresh tokens: **30 days** ❌ (should be 7 days)

### Status: ⚠️ **PARTIALLY COMPLIANT**

---

## 12. Auth Service Endpoints ⚠️ PARTIAL

### Skill Requirement
- `POST /auth/{portal}/login` for each portal
- `POST /auth/refresh` with portal-scoped validation
- `POST /auth/logout` (revoke from Redis)
- `GET /auth/validate` (internal, gateway-only)

### Current Implementation
- `POST /auth/login` ✅ (generic)
- `POST /auth/admin-login` ✅ (admin-specific)
- `POST /auth/refresh` ✅ (but no portal scoping)
- `POST /auth/logout` ✅ (but uses PostgreSQL, not Redis)
- `GET /auth/validate` ❌ (doesn't exist)

### Status: ⚠️ **PARTIALLY COMPLIANT**

---

## Summary Table

| Requirement | Status | Compliance |
|------------|--------|------------|
| Microservices Architecture | ❌ | 0% |
| JWT Portal Claim | ❌ | 0% |
| API Gateway | ❌ | 0% |
| Portal-Specific Logins | ❌ | 0% |
| Shared Constants Package | ❌ | 0% |
| Advanced Token Refresh | ❌ | 0% |
| Project Structure | ❌ | 0% |
| X-User-* Headers | ❌ | 0% |
| Portal Check Middleware | ❌ | 0% |
| Refresh Token Pattern | ⚠️ | 40% |
| Token Expiry | ⚠️ | 50% |
| Auth Endpoints | ⚠️ | 60% |

**Overall Compliance: ~15%**

---

## Recommendations

### Option 1: Refactor to Match Skill (Major Refactoring)
If you want to align with the skill requirements:

1. **Split monolithic backend into microservices:**
   - Create `services/auth-service/`
   - Create `services/gateway/`
   - Create `services/admin-service/`
   - Create `services/customer-service/`
   - Move shared code to `packages/shared/`

2. **Update JWT payload:**
   - Add `portal` field (mandatory)
   - Change `role` to `roles` (array)
   - Add `sub`, `email`, `entityId`

3. **Implement API Gateway:**
   - Create gateway service
   - Implement portal routing
   - Add X-User-* headers

4. **Update frontend token management:**
   - Implement concurrent 401 queue
   - Add proactive refresh
   - Add multi-tab sync

**Estimated Effort:** 2-3 weeks

### Option 2: Keep Current Architecture (Recommended)
The current monolithic architecture is simpler and may be more appropriate for this project size. Consider:

1. **Create a new skill** tailored to monolithic multi-portal architecture
2. **Document the architectural decision** and why monolithic was chosen
3. **Keep the skill as reference** for future microservices migration

### Option 3: Hybrid Approach
Keep monolithic but adopt some skill patterns:

1. ✅ Add `portal` field to JWT payload
2. ✅ Create `packages/shared/constants.js` with Portal/Role enums
3. ✅ Implement advanced token refresh in frontend
4. ✅ Add portal-specific login endpoints
5. ⚠️ Keep monolithic structure (no microservices split)

**Estimated Effort:** 1 week

---

## Conclusion

The current project does **not** comply with the skill requirements. The skill is designed for a **microservices architecture with API Gateway**, while the project uses a **monolithic backend**.

**Key Decision Point:** Do you want to:
- **A)** Refactor to microservices (major effort, matches skill)
- **B)** Keep monolithic and create a new skill (recommended)
- **C)** Hybrid: adopt some patterns while keeping monolithic

---

**Report Generated:** 2026-03-14  
**Validated Against:** `C:\Users\Ali\.cursor\skills\app-development\SKILL.md`
