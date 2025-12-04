import { STANDARD_OBJECT_IDS } from 'twenty-shared/metadata';
import {
  RecordAccessLevel,
  type ObjectsPermissions,
} from 'twenty-shared/types';
import {
  Brackets,
  type EntityTarget,
  type ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { type QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { type FeatureFlagMap } from 'src/engine/core-modules/feature-flag/interfaces/feature-flag-map.interface';
import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';

import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { computeTwentyORMException } from 'src/engine/twenty-orm/error-handling/compute-twenty-orm-exception';
import {
  TwentyORMException,
  TwentyORMExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';
import { validateQueryIsPermittedOrThrow } from 'src/engine/twenty-orm/repository/permissions.utils';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { WorkspaceDeleteQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-delete-query-builder';
import { WorkspaceInsertQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-insert-query-builder';
import { WorkspaceSoftDeleteQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-soft-delete-query-builder';
import { WorkspaceUpdateQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-update-query-builder';
import { formatResult } from 'src/engine/twenty-orm/utils/format-result.util';
import { getObjectMetadataFromEntityTarget } from 'src/engine/twenty-orm/utils/get-object-metadata-from-entity-target.util';

export class WorkspaceSelectQueryBuilder<
  T extends ObjectLiteral,
> extends SelectQueryBuilder<T> {
  objectRecordsPermissions: ObjectsPermissions;
  shouldBypassPermissionChecks: boolean;
  internalContext: WorkspaceInternalContext;
  authContext: AuthContext;
  featureFlagMap: FeatureFlagMap;
  private recordAccessFilterApplied = false;
  constructor(
    queryBuilder: SelectQueryBuilder<T>,
    objectRecordsPermissions: ObjectsPermissions,
    internalContext: WorkspaceInternalContext,
    shouldBypassPermissionChecks: boolean,
    authContext: AuthContext,
    featureFlagMap: FeatureFlagMap,
  ) {
    super(queryBuilder);
    this.objectRecordsPermissions = objectRecordsPermissions;
    this.internalContext = internalContext;
    this.shouldBypassPermissionChecks = shouldBypassPermissionChecks;
    this.authContext = authContext;
    this.featureFlagMap = featureFlagMap;
  }

  getFindOptions() {
    return this.findOptions;
  }

  override clone(): this {
    const clonedQueryBuilder = super.clone();

    return new WorkspaceSelectQueryBuilder(
      clonedQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    ) as this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override async execute(): Promise<any> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      const mainAliasTarget = this.getMainAliasTarget();

      const objectMetadata = getObjectMetadataFromEntityTarget(
        mainAliasTarget,
        this.internalContext,
      );

      const result = await super.execute();

      const formattedResult = formatResult<T[]>(
        result,
        objectMetadata,
        this.internalContext.flatObjectMetadataMaps,
        this.internalContext.flatFieldMetadataMaps,
      );

      return {
        raw: result,
        generatedMaps: formattedResult,
        identifiers: result.identifiers,
      };
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override async getMany(): Promise<T[]> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      const mainAliasTarget = this.getMainAliasTarget();

      const objectMetadata = getObjectMetadataFromEntityTarget(
        mainAliasTarget,
        this.internalContext,
      );

      const result = await super.getMany();

      const formattedResult = formatResult<T[]>(
        result,
        objectMetadata,
        this.internalContext.flatObjectMetadataMaps,
        this.internalContext.flatFieldMetadataMaps,
      );

      return formattedResult;
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override getRawOne<U = any>(): Promise<U | undefined> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      return super.getRawOne();
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override getRawMany<U = any>(): Promise<U[]> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      return super.getRawMany();
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override async getOne(): Promise<T | null> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      const mainAliasTarget = this.getMainAliasTarget();

      const objectMetadata = getObjectMetadataFromEntityTarget(
        mainAliasTarget,
        this.internalContext,
      );

      this.take(1);

      const result = await super.getOne();

      const formattedResult = formatResult<T>(
        result,
        objectMetadata,
        this.internalContext.flatObjectMetadataMaps,
        this.internalContext.flatFieldMetadataMaps,
      );

      return formattedResult;
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override async getOneOrFail(): Promise<T> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      const mainAliasTarget = this.getMainAliasTarget();

      const objectMetadata = getObjectMetadataFromEntityTarget(
        mainAliasTarget,
        this.internalContext,
      );

      const result = await super.getOneOrFail();

      const formattedResult = formatResult<T>(
        result,
        objectMetadata,
        this.internalContext.flatObjectMetadataMaps,
        this.internalContext.flatFieldMetadataMaps,
      );

      return formattedResult[0];
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override getCount(): Promise<number> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      return super.getCount();
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override getExists(): Promise<boolean> {
    throw new PermissionsException(
      'getExists is not supported because it calls dataSource.createQueryBuilder()',
      PermissionsExceptionCode.METHOD_NOT_ALLOWED,
    );
  }

  override async getManyAndCount(): Promise<[T[], number]> {
    try {
      this.applyRecordAccessFilter();
      this.validatePermissions();

      const mainAliasTarget = this.getMainAliasTarget();

      const objectMetadata = getObjectMetadataFromEntityTarget(
        mainAliasTarget,
        this.internalContext,
      );

      const [result, count] = await super.getManyAndCount();

      const formattedResult = formatResult<T[]>(
        result,
        objectMetadata,
        this.internalContext.flatObjectMetadataMaps,
        this.internalContext.flatFieldMetadataMaps,
      );

      return [formattedResult, count];
    } catch (error) {
      throw computeTwentyORMException(error);
    }
  }

  override insert(): WorkspaceInsertQueryBuilder<T> {
    const insertQueryBuilder = super.insert();

    return new WorkspaceInsertQueryBuilder<T>(
      insertQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    );
  }

  override update(): WorkspaceUpdateQueryBuilder<T>;

  override update(
    updateSet: QueryDeepPartialEntity<T>,
  ): WorkspaceUpdateQueryBuilder<T>;

  override update(
    updateSet?: QueryDeepPartialEntity<T>,
  ): WorkspaceUpdateQueryBuilder<T> {
    const updateQueryBuilder = updateSet
      ? super.update(updateSet)
      : super.update();

    return new WorkspaceUpdateQueryBuilder<T>(
      updateQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    );
  }

  override delete(): WorkspaceDeleteQueryBuilder<T> {
    const deleteQueryBuilder = super.delete();

    return new WorkspaceDeleteQueryBuilder<T>(
      deleteQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    );
  }

  override softDelete(): WorkspaceSoftDeleteQueryBuilder<T> {
    const softDeleteQueryBuilder = super.softDelete();

    return new WorkspaceSoftDeleteQueryBuilder<T>(
      softDeleteQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    );
  }

  override restore(): WorkspaceSoftDeleteQueryBuilder<T> {
    const restoreQueryBuilder = super.restore();

    return new WorkspaceSoftDeleteQueryBuilder<T>(
      restoreQueryBuilder,
      this.objectRecordsPermissions,
      this.internalContext,
      this.shouldBypassPermissionChecks,
      this.authContext,
      this.featureFlagMap,
    );
  }

  override executeExistsQuery(): Promise<boolean> {
    throw new PermissionsException(
      'executeExistsQuery is not supported because it calls dataSource.createQueryBuilder()',
      PermissionsExceptionCode.METHOD_NOT_ALLOWED,
    );
  }

  private validatePermissions(): void {
    validateQueryIsPermittedOrThrow({
      expressionMap: this.expressionMap,
      objectsPermissions: this.objectRecordsPermissions,
      flatObjectMetadataMaps: this.internalContext.flatObjectMetadataMaps,
      flatFieldMetadataMaps: this.internalContext.flatFieldMetadataMaps,
      objectIdByNameSingular: this.internalContext.objectIdByNameSingular,
      shouldBypassPermissionChecks: this.shouldBypassPermissionChecks,
    });
  }

  private applyRecordAccessFilter(): void {
    if (this.shouldBypassPermissionChecks || this.recordAccessFilterApplied) {
      return;
    }

    const mainAliasTarget = this.expressionMap.mainAlias?.target;

    if (!mainAliasTarget) {
      throw new TwentyORMException(
        'Main alias target is missing',
        TwentyORMExceptionCode.MISSING_MAIN_ALIAS_TARGET,
      );
    }

    const objectMetadata = getObjectMetadataFromEntityTarget(
      mainAliasTarget,
      this.internalContext,
    );

    const objectPermissions = this.objectRecordsPermissions[objectMetadata.id];
    const isFavorite = objectMetadata.standardId === STANDARD_OBJECT_IDS.favorite;

    if (
      !objectPermissions ||
      objectPermissions.recordAccessLevel !== RecordAccessLevel.OWNED_ONLY ||
      objectMetadata.isSystem === true ||
      isFavorite
    ) {
      return;
    }

    const workspaceMemberId = this.authContext?.workspaceMemberId;

    if (!workspaceMemberId) {
      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
    }

    const ownershipFieldNames =
      objectPermissions.ownershipFieldNames?.length &&
      objectPermissions.ownershipFieldNames.length > 0
        ? objectPermissions.ownershipFieldNames
        : ['ownerWorkspaceMemberId'];

    const { fieldIdByName, fieldIdByJoinColumnName } =
      buildFieldMapsFromFlatObjectMetadata(
        this.internalContext.flatFieldMetadataMaps,
        objectMetadata,
      );

    const ownershipColumns = ownershipFieldNames
      .map((fieldName) => {
        const fieldId =
          fieldIdByName[fieldName] ?? fieldIdByJoinColumnName[fieldName];

        if (!fieldId) {
          return null;
        }

        const fieldMetadata =
          this.internalContext.flatFieldMetadataMaps.byId[fieldId];

        if (!fieldMetadata) {
          return null;
        }

        const joinColumnName =
          // Settings is loosely typed; joinColumnName exists for relation fields
          (
            fieldMetadata.settings as
              | { joinColumnName?: string }
              | null
              | undefined
          )?.joinColumnName;

        return joinColumnName ?? fieldName;
      })
      .filter((columnName): columnName is string => columnName !== null)
      .filter(
        (columnName, index, array) =>
          array.findIndex((value) => value === columnName) === index,
      );

    if (ownershipColumns.length === 0) {
      return;
    }

    const alias = this.expressionMap.mainAlias?.name ?? this.alias;

    this.andWhere(
      new Brackets((qb) => {
        ownershipColumns.forEach((columnName, index) => {
          const condition = `"${alias}"."${columnName}" = :recordAccessWorkspaceMemberId`;

          if (index === 0) {
            qb.where(condition, {
              recordAccessWorkspaceMemberId: workspaceMemberId,
            });
          } else {
            qb.orWhere(condition, {
              recordAccessWorkspaceMemberId: workspaceMemberId,
            });
          }
        });
      }),
    );

    this.recordAccessFilterApplied = true;
  }

  private getMainAliasTarget(): EntityTarget<T> {
    const mainAliasTarget = this.expressionMap.mainAlias?.target;

    if (!mainAliasTarget) {
      throw new TwentyORMException(
        'Main alias target is missing',
        TwentyORMExceptionCode.MISSING_MAIN_ALIAS_TARGET,
      );
    }

    return mainAliasTarget;
  }

}
