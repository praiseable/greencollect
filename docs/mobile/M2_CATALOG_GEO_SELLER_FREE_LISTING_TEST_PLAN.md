# M2 — Catalog, Geo, and Seller-Free Listing Test Plan

M2 locks the app-side contract for UC-CAT-01..03 and UC-LIST-01..06 before
wallet/deposit UI is wired.

## Scope

- Dynamic categories, product types, units, and geo-zones come from backend APIs.
- Listing create/edit payloads use `priceRupees` in strict rupees mode.
- Seller listing is free and gated only by phone verification.
- No wallet balance, subscription, or KYC approval is required to list.
- Anonymous/pre-deposit listing detail must not reveal non-empty seller contact data.
- Geo-fenced detail errors must be treated as safe if they contain no contact fields.

## User App use cases

- UC-CAT-01 browse categories/product-types/units.
- UC-CAT-03 filter listings by city/geo-zone.
- UC-LIST-01 create free listing.
- UC-LIST-02 browse/search listing with masked contact.
- UC-LIST-03 edit/deactivate/reactivate own listing.
- UC-LIST-04 free renewal after expiry.
- UC-LIST-05 report listing.
- UC-LIST-06 favorite listing.

## Pro App use cases

- Same seller-free listing contract as User App.
- Pro inventory listing must not show a seller paywall.
- Territory-aware sourcing uses dynamic geo-zones, not hardcoded cities.
- Pro users may be KYC-routed for professional dashboard access, but KYC must not
  become a general listing paywall for normal customer listing behavior.

## Unit-test gate

Run:

```powershell
cd D:\gc-app\apps\mobile
flutter pub get
flutter test test/core
```

Required M2 contract tests:

- `catalog_geo_contract_test.dart`
- `seller_free_listing_contract_test.dart`

## Analyzer gate

```powershell
cd D:\gc-app\apps\mobile
$analyzeLog = "D:\gc-app\apps\mobile\flutter_analyze_m2.log"
cmd /c "flutter analyze --no-fatal-infos --no-fatal-warnings" 2>&1 |
  Tee-Object -FilePath $analyzeLog
Write-Host "FLUTTER_ANALYZE_EXIT_CODE=$LASTEXITCODE"
Select-String -Path $analyzeLog -Pattern "^\s*error\s+-"
```

Acceptable result: exit code 0 and no `error -` lines. Existing warning/info
backlog remains separate lint debt.

## Integration skeleton

`apps/mobile/integration_test/catalog_listing_smoke_test.dart` tracks the future
end-to-end automation for dynamic catalog, geo-fence handling, seller-free create,
masking, edit/deactivate/reactivate, report, and favorite.
