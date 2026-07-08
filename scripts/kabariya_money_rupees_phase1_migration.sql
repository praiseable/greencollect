-- Kabariya money base-unit migration: paisa -> PKR rupees.
-- Safe/idempotent: guarded by PlatformConfig key money_base_unit=rupees.
-- IMPORTANT: This keeps legacy physical column names such as pricePaisa for rollback/API compatibility,
-- but values stored in those columns become rupee values after this migration.

DO $$
DECLARE
  current_unit text;
BEGIN
  SELECT value INTO current_unit FROM "PlatformConfig" WHERE key = 'money_base_unit';
  IF current_unit = 'rupees' THEN
    RAISE NOTICE 'Money base unit is already rupees; skipping migration.';
    RETURN;
  END IF;

  RAISE NOTICE 'Converting monetary BigInt values from paisa to rupees...';

  IF to_regclass('public."PriceHistory"') IS NOT NULL THEN
    UPDATE "PriceHistory"
      SET "minPricePaisa" = ROUND("minPricePaisa"::numeric / 100)::bigint,
          "maxPricePaisa" = ROUND("maxPricePaisa"::numeric / 100)::bigint,
          "avgPricePaisa" = ROUND("avgPricePaisa"::numeric / 100)::bigint;
  END IF;

  IF to_regclass('public."Listing"') IS NOT NULL THEN
    UPDATE "Listing" SET "pricePaisa" = ROUND("pricePaisa"::numeric / 100)::bigint WHERE "pricePaisa" IS NOT NULL;
  END IF;

  IF to_regclass('public."Transaction"') IS NOT NULL THEN
    UPDATE "Transaction"
      SET "amountPaisa" = ROUND("amountPaisa"::numeric / 100)::bigint,
          "offeredPricePaisa" = CASE WHEN "offeredPricePaisa" IS NULL THEN NULL ELSE ROUND("offeredPricePaisa"::numeric / 100)::bigint END,
          "counterPricePaisa" = CASE WHEN "counterPricePaisa" IS NULL THEN NULL ELSE ROUND("counterPricePaisa"::numeric / 100)::bigint END,
          "finalPricePaisa" = CASE WHEN "finalPricePaisa" IS NULL THEN NULL ELSE ROUND("finalPricePaisa"::numeric / 100)::bigint END,
          "totalPaisa" = CASE WHEN "totalPaisa" IS NULL THEN NULL ELSE ROUND("totalPaisa"::numeric / 100)::bigint END,
          "actualPricePaisa" = CASE WHEN "actualPricePaisa" IS NULL THEN NULL ELSE ROUND("actualPricePaisa"::numeric / 100)::bigint END,
          "settlementPricePaisa" = CASE WHEN "settlementPricePaisa" IS NULL THEN NULL ELSE ROUND("settlementPricePaisa"::numeric / 100)::bigint END;
  END IF;

  IF to_regclass('public."Bond"') IS NOT NULL THEN
    UPDATE "Bond"
      SET "settlementPricePaisa" = CASE WHEN "settlementPricePaisa" IS NULL THEN NULL ELSE ROUND("settlementPricePaisa"::numeric / 100)::bigint END,
          "commissionPaisa" = CASE WHEN "commissionPaisa" IS NULL THEN NULL ELSE ROUND("commissionPaisa"::numeric / 100)::bigint END;
  END IF;

  IF to_regclass('public."Payment"') IS NOT NULL THEN
    UPDATE "Payment" SET "amountPaisa" = ROUND("amountPaisa"::numeric / 100)::bigint WHERE "amountPaisa" IS NOT NULL;
  END IF;

  IF to_regclass('public."Wallet"') IS NOT NULL THEN
    UPDATE "Wallet"
      SET "availableBalancePaisa" = ROUND("availableBalancePaisa"::numeric / 100)::bigint,
          "escrowedBalancePaisa" = ROUND("escrowedBalancePaisa"::numeric / 100)::bigint,
          "balancePaisa" = ROUND("balancePaisa"::numeric / 100)::bigint;
  END IF;

  IF to_regclass('public."WalletLedger"') IS NOT NULL THEN
    UPDATE "WalletLedger"
      SET "amountPaisa" = ROUND("amountPaisa"::numeric / 100)::bigint,
          "balanceAfterPaisa" = ROUND("balanceAfterPaisa"::numeric / 100)::bigint,
          "availableAfterPaisa" = ROUND("availableAfterPaisa"::numeric / 100)::bigint,
          "escrowedAfterPaisa" = ROUND("escrowedAfterPaisa"::numeric / 100)::bigint;
  END IF;

  IF to_regclass('public."ListingDeposit"') IS NOT NULL THEN
    UPDATE "ListingDeposit" SET "amountPaisa" = ROUND("amountPaisa"::numeric / 100)::bigint WHERE "amountPaisa" IS NOT NULL;
  END IF;

  IF to_regclass('public."SubscriptionPrice"') IS NOT NULL THEN
    UPDATE "SubscriptionPrice" SET "pricePaisa" = ROUND("pricePaisa"::numeric / 100)::bigint WHERE "pricePaisa" IS NOT NULL;
  END IF;

  UPDATE "PlatformConfig"
     SET value = ROUND(value::numeric / 100)::bigint::text,
         label = COALESCE(label, 'Deposit minimum flat rupees')
   WHERE key = 'deposit_min_flat_paisa'
     AND value ~ '^\d+$';

  INSERT INTO "PlatformConfig" (id, key, value, label)
  VALUES ('money-base-unit', 'money_base_unit', 'rupees', 'Money Base Unit')
  ON CONFLICT (key) DO UPDATE SET value = 'rupees', label = 'Money Base Unit';

  RAISE NOTICE 'Money base-unit migration complete: stored values are now PKR rupees.';
END $$;