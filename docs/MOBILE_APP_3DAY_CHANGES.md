# Mobile app: last 3 days commits and feature impact

## Summary

**Commit c602ead** (Mar 11, 2026): *"Apply API/env fixes, validation report; consolidate docs"* is the one that removed a large amount of app behavior. It replaced rich, mock-driven screens with slimmer “real API” versions and **dropped many in-screen features** (GPS verify, weight/notes, quality rating, step flows, etc.) instead of reimplementing them against the API.

**Net change in mobile (e5e3e31 → fd367d6):** ~6,590 lines removed, ~4,713 added (**~1,877 lines lost**), plus 1 file deleted (`README.md`).

---

## Commits that touched the app (last 3 days)

| Date       | Commit    | Message (short) | Impact on app |
|-----------|-----------|------------------|----------------|
| Mar 12    | fd367d6   | Login, listings, create-form, OTP, product-types | api_config useDev→kDebugMode (reverted), listing parse, dropdowns |
| Mar 11    | 26b8e80   | Login/OTP normalization, dev OTP, lockout, scroll | Auth/OTP fixes only |
| Mar 11    | c602ead   | **Apply API/env fixes, validation report; consolidate docs** | **Bulk of feature loss: 30 files, −6,932 / +4,086 lines** |
| Mar 10    | 19ed269   | Deployment docs, Kabariya spec, API helpers, OTP | listing_detail_screen only |
| Mar 10    | 002af89   | Per user chat inbox, listing create, admin parity | Added chat inbox, expanded create_listing, listing_detail, etc. |
| Mar 9     | e5e3e31   | **feat: complete Kabariya app** (branding, chat, KYC, collections, carbon, ratings, escalation, balance gate) | **Reference “full feature” state** |

---

## What c602ead changed (app side)

Single commit **c602ead** rewrote or heavily trimmed these screens and removed behavior:

| File | Before (e5e3e31) | After (c602ead → now) | Features / behavior removed or reduced |
|------|-------------------|------------------------|-----------------------------------------|
| **collection_detail_screen** | ~1,057 lines, Riverpod, mock data | ~244 lines, ApiService only | **GPS verify**, **weight/notes inputs**, **quality rating**, full **step flow** (advance status with timestamps, dealerArriveLat/Lng, collectedAt, deliveredAt), rich status UI |
| **collections_screen** | ~518 lines (richer list + flows) | Much smaller | List/flow UI and behavior reduced |
| **dealer_rating_screen** | ~441 lines | Much smaller | Rating flow / UI reduced |
| **create_listing_screen** | ~1,345 lines (full form, maps, validations) | Slimmed | Form fields, map/location picker, validations reduced |
| **listing_detail_screen** | ~691 lines | Slimmed | Detail UI, actions, map reduced |
| **listings_screen** | ~572 lines | Slimmed | List/filter UI reduced |
| **home_screen** | ~629 lines | Slimmed | Home sections, quick actions reduced |
| **profile_screen** | ~458 lines | Slimmed | Profile sections, stats, actions reduced |
| **subscription_screen** | ~577 lines | Slimmed | Plan comparison, features list reduced |
| **negotiation_screen** | ~726 lines | Slimmed | Negotiation flow/UI reduced |
| **bond_viewer_screen** | ~410 lines | Slimmed | Bond display/actions reduced |
| **transactions_screen** | ~465 lines | Slimmed | Transaction list/filters reduced |
| **chat_screen** | ~576 lines | Slimmed | Chat UI, persistence, offline behavior reduced |
| **chat_inbox_screen** | 301 → fewer | Trimmed | Inbox list/behavior reduced |
| **login_screen** | Expanded then refactored | Timeouts, errors, OTP flow | Largely preserved/improved for auth |
| **api_config** | useDev = false | useDev = kDebugMode (later reverted) | Debug builds pointed to local backend (reverted) |

Other changes in c602ead: **auth.provider** (phone norm, errors), **chat.provider** / **listings.provider** / **notifications.provider** (simplified), **api_service** (trimmed), **main.dart** (providers), **listing.model** / **listing_card** (new/updated). **README.md** (235 lines) was deleted.

---

## Why the app “lost” features

1. **c602ead** replaced full, mock-driven UIs with “real API” versions and **removed** a lot of in-screen logic and UI (GPS, weight, quality, step flows, rich lists, etc.) instead of reconnecting them to the backend.
2. **fd367d6** set **useDev = kDebugMode**, so debug builds used the local backend; if that wasn’t running, every API call failed and the app looked even more broken. That part has been reverted (useDev = false again).

So: **structural feature loss = c602ead (Mar 11).** **“Everything broken in debug” = useDev (now reverted).**

---

## How to restore behavior (options)

1. **Restore specific screens from before c602ead (e5e3e31)**  
   - Check out the file from e5e3e31 and then re-apply only the minimal changes needed to use the real API (e.g. replace MockData with API calls, keep GPS/weight/quality/step flow UI).
   - Example:
     ```bash
     git show e5e3e31:apps/mobile/lib/features/collections/collection_detail_screen.dart > apps/mobile/lib/features/collections/collection_detail_screen_old.dart
     ```
   - Then merge back: keep current API integration, re-add GPS verify, weight/notes, quality rating, and full status flow from the old screen.

2. **Revert c602ead for the whole mobile app**  
   - Restores the Mar 9 “full Kabariya” app state for `apps/mobile`, but you lose the API/env fixes and validation report from that commit (and any later fixes that depend on c602ead).
   - Example:
     ```bash
     git checkout e5e3e31 -- apps/mobile/
     ```
   - Then re-apply only the changes you want from 002af89, 19ed269, 26b8e80, fd367d6 (e.g. chat inbox, listing create, auth/OTP, listing parse, dropdowns).

3. **Re-implement missing features on current code**  
   - Keep current screens and APIs, and add back each feature one by one (e.g. GPS verify, weight/notes, quality rating, bond viewer, negotiation flow) using the backend APIs where they exist.

Recommendation: use **option 1 or 3** so you keep current API integration and only restore or re-add the features you need.
