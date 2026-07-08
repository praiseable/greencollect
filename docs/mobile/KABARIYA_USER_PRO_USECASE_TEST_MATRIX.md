# Kabariya Mobile Use-Case Test Matrix

This matrix is the frontend acceptance plan for both mobile flavors:

- **Kabariya User App** (`APP_VARIANT=customer`)
- **Kabariya Pro App** (`APP_VARIANT=pro`)

The backend baseline is strict rupees mode. New mobile code must use `amountRupees`, `priceRupees`, and related `*Rupees` fields. Legacy `*Paisa` fields may appear only as transitional response aliases and must not be used for new create/update payloads.

## Global non-negotiable rules

1. Sellers are free: no wallet gate, subscription gate, listing fee, or seller commission.
2. Buyer wallet balance is required only for buyer actions: top-up, deposit, contact unlock, offer, subscription purchase, withdrawal.
3. Contact details stay masked until the requesting buyer has a held/captured deposit on that listing.
4. Finalization must use Secure Handshake OTP; no standalone finalize button.
5. All mobile money UI displays rupees. No screen should say paisa.
6. Urdu must be RTL, must use Urdu numerals where money is localized, and must fall back to English for missing translation keys.

## Phase M0 — Shared core

| Use case | User App | Pro App | Test coverage |
|---|---|---|---|
| M0-01 Force/update bootstrap | Splash calls `/config/app-version` and `/health` | Same | Widget + integration |
| M0-02 Flavor identity | Shows Kabariya branding | Shows Kabariya Pro branding | Unit |
| M0-03 Secure session | Access/refresh token in secure storage | Same | Unit + integration |
| M0-04 Strict rupees | Uses `amountRupees` and `priceRupees` | Same | Unit + grep |
| M0-05 Error mapping | 401, 402, 403, 409 screens | Same | Unit + widget |
| M0-06 Offline banner | Cached content + retry | Same | Widget |
| M0-07 Deep links | listing/chat/transaction/bond/dispute | Same plus collections | Integration |

## Phase M1 — Auth and onboarding

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-AUTH-01 Register | phone/password/OTP, duplicate phone, OTP lockout | same, then role choice |
| UC-AUTH-02 Login | success, wrong password, refresh, logout | success, pending KYC route, suspended route |
| UC-AUTH-03 Upgrade to Pro | upgrade CTA opens Pro application | choose dealer/franchise/wholesale role |
| UC-AUTH-04 Force update | non-dismissible update screen | same |

## Phase M2 — KYC, tax, profile

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-KYC-01 Submit KYC | optional trust KYC, upload retry | required commercial KYC, upload retry |
| UC-KYC-02 Review result | approved/rejected notification, resubmit | role unlock on approval, reason on rejection |
| UC-KYC-03 Tax fields | optional NTN/STRN/business type | commercial profile, bond preview |

## Phase M3 — Catalog, geo, discovery

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-CAT-01 Public catalog | categories, units, product types, cache | same |
| UC-CAT-02 Dynamic catalog | no hardcoded categories/attributes | advanced filters use backend catalog |
| UC-CAT-03 Geo zones | city/local filters, geo-fence safe error | territory map, territory filters |

## Phase M4 — Seller-free listings

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-LIST-01 Create listing | zero-balance seller creates listing with `priceRupees` | dealer/franchise creates free listing |
| UC-LIST-02 Browse/search | filters, sorting, masked contact | sourcing filters, territory filters |
| UC-LIST-03 Edit/deactivate/reactivate | owner-only edit, inactive hidden | inventory manager status actions |
| UC-LIST-04 Expiry/renew | expired listing can renew free | bulk renew free |
| UC-LIST-05 Report | fifth distinct report flags listing | same |
| UC-LIST-06 Favorite | toggle idempotent | saved sourcing list |

## Phase M5 — Wallet/deposit/contact unlock

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-WAL-01 Top up | JazzCash, Easypaisa, Stripe fallback, pending/fail/success | same plus high-value suggestions |
| UC-WAL-02 Deposit | 10,000 rupee listing => 500 rupee deposit floor/5%, insufficient funds CTA | subscription-tier rate display |
| UC-WAL-03 Refund | released deposit returns to wallet | same |
| UC-WAL-04 Commission capture | buyer-side capture only | settlement breakdown |
| UC-WAL-05 Withdraw | cannot withdraw escrowed funds | payout details |
| UC-WAL-06 Forfeiture | admin/dispute-only display | same |
| UC-WAL-07 Wallet history | available + escrowed + ledger | ledger filters/export |

## Phase M6 — Chat and offers

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-CHAT-01 Contact reveal | masked before deposit, visible after deposit only for that buyer | same |
| UC-CHAT-02 Chat | socket message, unread, pagination | inbox grouped by listing/deal |
| UC-CHAT-03 Block/report | server rejects blocked message | same |
| UC-OFFER-01 Submit offer | requires deposit, creates transaction | deal-desk offer |
| UC-OFFER-02 Accept/reject/counter | seller action cards | offer queue |

## Phase M7 — Transactions, variance, handshake, bond

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-TXN-01 Transaction detail | accepted transaction visible to both parties | deal detail |
| UC-TXN-02 Logistics | status timeline | pickup schedule |
| UC-TXN-03 Cancel | reason + no commission | same |
| UC-TXN-04 No standalone finalize | no finalize button | no finalize button |
| UC-TXN-05 Dispute | raise/view dispute | commercial dispute evidence |
| UC-TXN-06 Amendment | actual quantity/price, seller ack, insufficient funds blocks | weighing-first UX |
| UC-TXN-07 Secure Handshake | buyer enters seller OTP, wrong/expired/lockout states | seller generates OTP |
| UC-BOND-01 Bond | view/download/share | commercial receipt with tax fields |

## Phase M8 — Collections/logistics

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-COLL-01 Collection job | status timeline only where relevant | accept, en route, GPS, proof photo, weight, delivered, rating |

## Phase M9 — Disputes

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-DISP-01 Resolve dispute | status, ledger reversal, notifications | evidence, commercial bond link, resolution timeline |

## Phase M10 — Buyer subscriptions

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-SUB-01 Purchase buyer plan | optional, never seller-gated, debits wallet | Pro/Enterprise sourcing benefits |
| UC-SUB-02 Expiry | warnings, revert to Basic, existing held deposits unchanged | same |

## Phase M11 — Notifications

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-NOTIF-01 Push catalog | deposit, refund, chat, offer, finalized, bond, dispute, KYC, subscription | same plus collection routing |
| UC-NOTIF-02 Notification center | pagination, mark one, mark all, ownership check | same |

## Phase M12 — Payments

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-PAY-01 JazzCash/Easypaisa | gateway order, invalid HMAC no credit, duplicate idempotent | same |
| UC-PAY-02 Stripe fallback | PKR equivalent and exchange snapshot | wholesale/international fallback |

## Phase M13 — Localization/currency

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-I18N-01 EN/UR | no hardcoded strings, RTL, English fallback | same |
| UC-I18N-02 Rupees | `1500 => ₨ 1,500`, Urdu numerals, no paisa labels | same |

## Phase M14 — Analytics

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-ANL-01 Seller analytics | free for all sellers | free with advanced filters |
| UC-ANL-02 Buyer analytics | basic vs premium gate | sourcing dashboard and category trends |

## Phase M15 — Anti-disintermediation awareness

| UC | User App test cases | Pro App test cases |
|---|---|---|
| UC-ADM-08 Review-only flag | no auto-suspension/debit/forfeit | same; no penalty UI unless admin action exists |

## Required integration suites

Create and keep these files as the app test harness grows:

```text
apps/mobile/integration_test/customer_smoke_test.dart
apps/mobile/integration_test/customer_full_deal_flow_test.dart
apps/mobile/integration_test/pro_smoke_test.dart
apps/mobile/integration_test/pro_full_deal_flow_test.dart
apps/mobile/integration_test/pro_collections_test.dart
apps/mobile/integration_test/localization_rtl_test.dart
apps/mobile/integration_test/notifications_deeplink_test.dart
```

Each suite must run against a live backend in strict rupees mode and must fail if any new frontend code sends `amountPaisa` or `pricePaisa` in create/update requests.
