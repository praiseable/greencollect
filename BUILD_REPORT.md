# Kabariya v3 Implementation Report

## Scope implemented in this patch

This patch focuses on the missing backend use cases required by the Kabariya v3 buyer-funded deposit model. It hardens the financial and transaction paths first because the requirements identify wallet integrity, contact gating, and Secure Handshake finalization as highest-priority acceptance criteria.

## Completed use-case slices

### Wallet, ledger, and deposit escrow

- Added a transaction-wrapped wallet service.
- Added ledger-backed wallet credit and debit helpers.
- Added buyer-funded listing deposits.
- Enforced one active deposit per buyer/listing pair.
- Enforced integer-paisa money handling.
- Added deposit calculation using `max(deposit_percent × listing_price, deposit_min_flat_paisa)`.
- Captures commission only from buyer deposit/wallet.
- Seller wallet is not debited for listing, offer, acceptance, finalization, or commission.

### Contact unlock gating

- Listing list/detail responses now mask seller phone, listing contact number, exact address, and precise coordinates until the requesting buyer has a held/captured deposit.
- Listing owner and admin still receive unmasked details.
- Offer submission now requires a held/captured buyer deposit.
- Chat routes now require deposit-based unlock between buyer and seller.

### Transaction flow and variance correction

- Added post-weighing amendment fields to transactions.
- Buyer can submit actual quantity and actual settlement price.
- Seller must acknowledge an amendment before handshake generation.
- Price-increasing amendments check buyer shortfall coverage before handshake/finalization.
- Insufficient funds keep the transaction amended and send an in-app notification requesting top-up.

### Secure Handshake OTP finalization

- Direct `PUT /transactions/:id/finalize` is now blocked with `HANDSHAKE_REQUIRED`.
- Seller-only OTP generation stores a bcrypt hash and expiry timestamp only.
- Buyer-only OTP verification is the only code path that writes `status = FINALIZED`.
- OTP is single-use: hash is cleared after success.
- Five wrong attempts lock the transaction for 15 minutes.
- Commission capture and bond generation occur in the same transaction after successful OTP verification.

### Bonds and tax/compliance data

- Added optional NTN, STRN, and business type fields.
- These fields are optional and do not gate listing, deposit, or transacting.
- Finalization creates/updates a bond row with settlement price, actual quantity, commission, and a tax snapshot only when either party has tax fields present.

### Anti-disintermediation flagging

- Added an automated scan service for high unlock/no-deal ratios.
- Scan excludes held deposits still inside the valid hold window.
- Scan creates `admin_flagged_users` rows only.
- No wallet debit, suspension, forfeiture, or penalty is applied automatically.
- Added admin routes for scan, queue listing, and review status updates.

### Auth/KYC/admin hardening

- Registration now creates a zero wallet and forces base `CUSTOMER` role to prevent self-service role escalation.
- Suspended/inactive users now get `403 ACCOUNT_SUSPENDED`.
- KYC approval now keeps seller/pro activation deposit-free.
- Admin dealer wallet adjustments are now ledger-backed and admin-portal protected.

## Test harness added

### Integration tests

Added `backend/tests/integration/kabariya-core.test.js` covering:

1. Core happy path: register buyer/seller, top up, deposit, unlock, offer, accept, amend, acknowledge, generate OTP, verify OTP, finalize, capture commission on actual price, refund remainder.
2. Insufficient deposit boundary: exactly one paisa below required deposit rejects and writes no deposit ledger row.
3. Data-leak boundary: unauthenticated and no-deposit buyer listing detail responses mask phone/address/coordinates.
4. Variance insufficient-funds boundary: price-increasing amendment blocks handshake/finalization and dispatches top-up notification.
5. Handshake abuse boundary: five wrong OTPs lock the transaction; lock expiry allows correct OTP.
6. Disintermediation boundary: high unlock/no-deal ratio creates an admin review flag without automatic penalty.

### Smoke test script

Added `backend/tests/smoke-test.js`, runnable through:

```bash
npm run smoke-test
```

It executes a runtime-DB lifecycle:

1. Onboard test buyer and seller with wallets.
2. Create a free seller listing.
3. Top up buyer and place a buyer-funded deposit.

## Verification performed in this sandbox

Passed static syntax checks for all changed backend files:

```bash
node --check backend/src/services/wallet.service.js
node --check backend/src/services/disintermediation.service.js
node --check backend/src/routes/auth.routes.js
node --check backend/src/routes/users.routes.js
node --check backend/src/routes/listings.routes.js
node --check backend/src/routes/payments.routes.js
node --check backend/src/routes/wallet.routes.js
node --check backend/src/routes/transactions.routes.js
node --check backend/src/routes/chat.routes.js
node --check backend/src/routes/admin.routes.js
node --check backend/src/routes/dealers.routes.js
node --check backend/src/routes/kyc.routes.js
node --check backend/src/index.js
node --check backend/prisma/seed.js
node --check backend/tests/integration/kabariya-core.test.js
node --check backend/tests/smoke-test.js
```

Runtime Jest and smoke execution could not be completed in this sandbox because Prisma client generation requires downloading Prisma engine binaries from `binaries.prisma.sh`, and the sandbox returned DNS `EAI_AGAIN`. The commands and test files are present and should run after installing dependencies and generating Prisma Client in a normal dev/CI environment.

## Commands to run locally/CI

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run test:integration
npm run smoke-test
```

For production migrations, replace `npx prisma db push` with the project migration process once a baseline migration is created.

## Docker runtime verification addendum

- Updated `backend/Dockerfile` to Node 20 Alpine to match the locked backend runtime.
- Added `scripts/docker-kabariya-v3-verify.sh` for running smoke and integration tests from a temporary Node 20 container attached to the same Docker network as `gc-app-backend-1`.
- Added `docs/DOCKER_RUNTIME_TESTING.md` with exact runtime verification commands for the current Dockerized deployment.
