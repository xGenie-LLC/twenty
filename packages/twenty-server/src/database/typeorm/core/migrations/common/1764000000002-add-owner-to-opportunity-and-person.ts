import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddOwnerToOpportunityAndPerson1764000000002
  implements MigrationInterface
{
  name = 'AddOwnerToOpportunityAndPerson1764000000002';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: CRM object tables are created per-workspace at runtime by the metadata sync.
    // Keeping this migration as a placeholder to preserve timestamp ordering.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op placeholder.
  }
}
