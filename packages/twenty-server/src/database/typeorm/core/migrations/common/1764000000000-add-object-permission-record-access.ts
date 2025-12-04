import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddObjectPermissionRecordAccess1764000000000
  implements MigrationInterface
{
  name = 'AddObjectPermissionRecordAccess1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "core"."objectPermission_recordAccessLevel_enum" AS ENUM('EVERYTHING', 'OWNED_ONLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."objectPermission" ADD "recordAccessLevel" "core"."objectPermission_recordAccessLevel_enum" NOT NULL DEFAULT 'EVERYTHING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."objectPermission" DROP COLUMN "recordAccessLevel"`,
    );
    await queryRunner.query(
      `DROP TYPE "core"."objectPermission_recordAccessLevel_enum"`,
    );
  }
}
