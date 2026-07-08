# Kabariya money base unit: rupees transition

The business/API base unit is now PKR rupees, not paisa.

Phase 1 intentionally preserves legacy `*Paisa` field names as deprecated compatibility aliases while:

- existing DB numeric values are migrated from paisa-scale to rupee-scale;
- new API clients may send `*Rupees` fields such as `priceRupees` and `amountRupees`;
- API responses include `*Rupees` aliases;
- currency formatting treats raw numeric values as rupees;
- old `*Paisa` names remain temporarily so older code paths do not break during rollout.

Run `scripts/kabariya_money_rupees_phase1_migration.sh` exactly once after backup. It is idempotent and guarded by `PlatformConfig.money_base_unit = rupees`.

A later cleanup phase may physically rename columns from `*Paisa` to `*Rupees` after all apps/admin/web clients are confirmed to use the rupee aliases only.