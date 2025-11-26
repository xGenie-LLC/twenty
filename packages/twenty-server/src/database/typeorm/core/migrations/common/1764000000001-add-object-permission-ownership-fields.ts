import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddObjectPermissionOwnershipFields1764000000001
  implements MigrationInterface
{
  name = 'AddObjectPermissionOwnershipFields1764000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."objectPermission" ADD "ownershipFieldNames" text array NOT NULL DEFAULT '{ownerWorkspaceMemberId}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."objectPermission" DROP COLUMN "ownershipFieldNames"`,
    );
  }
}
