import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A walk-in customer often gives only a phone number, so a phone has to be a
 * full identity, not just a detail hanging off an email. Email becomes
 * nullable (several phone-only customers can then coexist under the unique
 * index, since NULLs do not collide) and a canonical phone key column is
 * added so lookups are exact and indexed.
 */
export class CustomerPhoneIdentity1720000011000 implements MigrationInterface {
  name = 'CustomerPhoneIdentity1720000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phoneIndex" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL`);
    // Rows created before this used '' to mean "no email"; NULL is the value
    // the unique index tolerates more than once.
    await queryRunner.query(`UPDATE "customers" SET "email" = NULL WHERE "email" = ''`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_phone_index" ON "customers" ("phoneIndex")`);

    // Backfill the phone keys from the phone lists already stored, applying
    // the same Ghana normalisation the application uses (+233/00233 -> 0).
    await queryRunner.query(`
      UPDATE "customers" c SET "phoneIndex" = sub.keys
      FROM (
        SELECT c2.id,
               ',' || string_agg(DISTINCT
                 CASE
                   WHEN digits LIKE '00233%' THEN '0' || substring(digits from 6)
                   WHEN digits LIKE '233%' AND length(digits) >= 12 THEN '0' || substring(digits from 4)
                   ELSE digits
                 END, ',') || ',' AS keys
        FROM "customers" c2
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE WHEN c2."phones" ~ '^\\[' THEN c2."phones"::jsonb ELSE '[]'::jsonb END
        ) AS raw(value)
        CROSS JOIN LATERAL (SELECT regexp_replace(raw.value, '\\D', '', 'g') AS digits) AS n
        WHERE n.digits <> ''
        GROUP BY c2.id
      ) AS sub
      WHERE c.id = sub.id`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customers_phone_index"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "phoneIndex"`);
    await queryRunner.query(`UPDATE "customers" SET "email" = '' WHERE "email" IS NULL`);
    await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL`);
  }
}
