-- Kabariya money base-unit migration v2
-- Converts existing monetary numeric values from paisa to rupees.
-- Schema-adaptive: converts every numeric column whose name ends with/contains Paisa,
-- and skips optional columns that do not exist in the deployed DB.
-- Idempotent guard: if PlatformConfig money_base_unit=rupees, this script exits without conversion.

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  rec RECORD;
  base_unit TEXT;
  converted_count INTEGER := 0;
BEGIN
  SELECT "value" INTO base_unit
  FROM "PlatformConfig"
  WHERE "key" = 'money_base_unit'
  LIMIT 1;

  IF COALESCE(base_unit, 'paisa') = 'rupees' THEN
    RAISE NOTICE 'Money base unit already rupees; skipping conversion.';
    RETURN;
  END IF;

  RAISE NOTICE 'Converting monetary columns from paisa to rupees...';

  FOR rec IN
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name LIKE '%Paisa%'
      AND data_type IN ('bigint', 'integer', 'numeric', 'decimal', 'double precision', 'real')
    ORDER BY table_name, column_name
  LOOP
    RAISE NOTICE 'Converting %.% column %', rec.table_schema, rec.table_name, rec.column_name;
    EXECUTE format(
      'UPDATE %I.%I SET %I = CASE WHEN %I IS NULL THEN NULL ELSE ROUND(%I::numeric / 100)::bigint END',
      rec.table_schema,
      rec.table_name,
      rec.column_name,
      rec.column_name,
      rec.column_name
    );
    converted_count := converted_count + 1;
  END LOOP;

  -- Platform config values that still carry *_paisa names become rupee numeric values.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PlatformConfig'
  ) THEN
    UPDATE "PlatformConfig"
    SET "value" = CASE
      WHEN "value" ~ '^-?[0-9]+(\.[0-9]+)?$' THEN ROUND("value"::numeric / 100)::bigint::text
      ELSE "value"
    END
    WHERE lower("key") LIKE '%paisa%';

    UPDATE "PlatformConfig"
    SET "value" = 'rupees'
    WHERE "key" = 'money_base_unit';

    IF NOT FOUND THEN
      INSERT INTO "PlatformConfig" ("key", "value")
      VALUES ('money_base_unit', 'rupees');
    END IF;
  END IF;

  RAISE NOTICE 'Money base conversion complete. Converted % numeric *Paisa* columns.', converted_count;
END $$;

COMMIT;

-- Verification summary
SELECT "key", "value"
FROM "PlatformConfig"
WHERE "key" IN ('money_base_unit', 'deposit_min_flat_paisa')
ORDER BY "key";
