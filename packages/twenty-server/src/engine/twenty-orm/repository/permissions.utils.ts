import { isNonEmptyString } from '@sniptt/guards';
import isEmpty from 'lodash.isempty';
import { STANDARD_OBJECT_IDS } from 'twenty-shared/metadata';
import {
  type ObjectsPermissions,
  type RestrictedFieldsPermissions,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type QueryExpressionMap } from 'typeorm/query-builder/QueryExpressionMap';

import { ProcessAggregateHelper } from 'src/engine/api/graphql/graphql-query-runner/helpers/process-aggregate.helper';
import { InternalServerError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { getColumnNameToFieldMetadataIdMap } from 'src/engine/twenty-orm/utils/get-column-name-to-field-metadata-id.util';

const getTargetEntityAndOperationType = (
  expressionMap: QueryExpressionMap,
):
  | {
      isSubQuery: true;
      mainEntity?: undefined;
      operationType?: undefined;
    }
  | {
      isSubQuery?: undefined;
      mainEntity: string;
      operationType:
        | 'select'
        | 'insert'
        | 'update'
        | 'delete'
        | 'restore'
        | 'soft-delete'
        | 'relation';
    } => {
  const isSubQuery = expressionMap.aliases[0].subQuery;

  if (isSubQuery) {
    return {
      isSubQuery: true, // will bypass permission checks because subQuery permissions will be evaluated when it is executed. This is valid for groupBy with records usecase. If your usecase is different, make sure permission checks are run.
    };
  }

  const mainEntity = expressionMap.aliases[0].metadata.name;
  const operationType = expressionMap.queryType;

  return {
    mainEntity,
    operationType,
  };
};

export type OperationType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'restore'
  | 'soft-delete';

type ValidateOperationIsPermittedOrThrowArgs = {
  entityName: string;
  operationType: OperationType;
  objectsPermissions: ObjectsPermissions;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  objectIdByNameSingular: Record<string, string>;
  selectedColumns: string[] | '*';
  allFieldsSelected: boolean;
  updatedColumns: string[];
};

export const validateOperationIsPermittedOrThrow = ({
  entityName,
  operationType,
  objectsPermissions,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  objectIdByNameSingular,
  selectedColumns,
  allFieldsSelected,
  updatedColumns,
}: ValidateOperationIsPermittedOrThrowArgs) => {
  const objectMetadataIdForEntity = objectIdByNameSingular[entityName];

    if (!isNonEmptyString(objectMetadataIdForEntity)) {
      // eslint-disable-next-line no-console
      console.error(
        `[PERMISSION DEBUG] entityName "${entityName}" not found in objectIdByNameSingular. Available keys:`,
        Object.keys(objectIdByNameSingular).slice(0, 10),
      );
    throw new PermissionsException(
      PermissionsExceptionMessage.PERMISSION_DENIED,
      PermissionsExceptionCode.PERMISSION_DENIED,
    );
  }

  const objectMetadata = flatObjectMetadataMaps.byId[objectMetadataIdForEntity];

  if (!isDefined(objectMetadata)) {
    // eslint-disable-next-line no-console
    console.error(
      `[PERMISSION DEBUG] objectMetadata not found for id "${objectMetadataIdForEntity}" (entity: ${entityName})`,
    );
    throw new PermissionsException(
      PermissionsExceptionMessage.PERMISSION_DENIED,
      PermissionsExceptionCode.PERMISSION_DENIED,
    );
  }

  // Force allow favorite and favoriteFolder
  // This bypasses any stale permission cache or logic errors
  if (
    objectMetadata.standardId === STANDARD_OBJECT_IDS.favorite ||
    objectMetadata.standardId === STANDARD_OBJECT_IDS.favoriteFolder
  ) {
    // eslint-disable-next-line no-console
    console.log(
      `[PERMISSION_DEBUG] Force allowing access to ${objectMetadata.nameSingular}`,
    );
    return;
  }

  const objectMetadataIsSystem = objectMetadata.isSystem === true;
  const isFavorite = objectMetadata.standardId === STANDARD_OBJECT_IDS.favorite;

  if (objectMetadataIsSystem || isFavorite) {
    return;
  }

  const columnNameToFieldMetadataIdMap = getColumnNameToFieldMetadataIdMap(
    objectMetadata,
    flatFieldMetadataMaps,
  );

  const permissionsForEntity = objectsPermissions[objectMetadataIdForEntity];

  switch (operationType) {
    case 'select':
      if (!permissionsForEntity?.canReadObjectRecords) {
        // eslint-disable-next-line no-console
        console.error(
          `[PERMISSION DEBUG] canReadObjectRecords is false for entity "${entityName}" (id: ${objectMetadataIdForEntity}). Permissions:`,
          JSON.stringify(permissionsForEntity),
        );
        throw new PermissionsException(
          PermissionsExceptionMessage.PERMISSION_DENIED,
          PermissionsExceptionCode.PERMISSION_DENIED,
        );
      }

      validateReadFieldPermissionOrThrow({
        restrictedFields: permissionsForEntity.restrictedFields,
        selectedColumns,
        columnNameToFieldMetadataIdMap,
        allFieldsSelected,
      });
      break;
    case 'insert':
    case 'update':
      if (!permissionsForEntity?.canUpdateObjectRecords) {
        // eslint-disable-next-line no-console
        console.error(
          `[PERMISSION DEBUG] canUpdateObjectRecords is false for entity "${entityName}" (id: ${objectMetadataIdForEntity}). Permissions:`,
          JSON.stringify(permissionsForEntity),
        );
        throw new PermissionsException(
          PermissionsExceptionMessage.PERMISSION_DENIED,
          PermissionsExceptionCode.PERMISSION_DENIED,
        );
      }

      validateReadFieldPermissionOrThrow({
        restrictedFields: permissionsForEntity.restrictedFields,
        selectedColumns,
        columnNameToFieldMetadataIdMap,
      });

      if (updatedColumns.length > 0) {
        validateUpdateFieldPermissionOrThrow({
          restrictedFields: permissionsForEntity.restrictedFields,
          updatedColumns,
          columnNameToFieldMetadataIdMap,
        });
      }
      break;
    case 'delete':
      if (!permissionsForEntity?.canDestroyObjectRecords) {
        // eslint-disable-next-line no-console
        console.error(
          `[PERMISSION DEBUG] canDestroyObjectRecords is false for entity "${entityName}" (id: ${objectMetadataIdForEntity}). Permissions:`,
          JSON.stringify(permissionsForEntity),
        );
        throw new PermissionsException(
          PermissionsExceptionMessage.PERMISSION_DENIED,
          PermissionsExceptionCode.PERMISSION_DENIED,
        );
      }

      validateReadFieldPermissionOrThrow({
        restrictedFields: permissionsForEntity.restrictedFields,
        selectedColumns,
        columnNameToFieldMetadataIdMap,
      });
      break;
    case 'restore':
    case 'soft-delete':
      if (!permissionsForEntity?.canSoftDeleteObjectRecords) {
        // eslint-disable-next-line no-console
        console.error(
          `[PERMISSION DEBUG] canSoftDeleteObjectRecords is false for entity "${entityName}" (id: ${objectMetadataIdForEntity}). Permissions:`,
          JSON.stringify(permissionsForEntity),
        );
        throw new PermissionsException(
          PermissionsExceptionMessage.PERMISSION_DENIED,
          PermissionsExceptionCode.PERMISSION_DENIED,
        );
      }

      validateReadFieldPermissionOrThrow({
        restrictedFields: permissionsForEntity.restrictedFields,
        selectedColumns,
        columnNameToFieldMetadataIdMap,
      });
      break;
    default:
      throw new PermissionsException(
        PermissionsExceptionMessage.UNKNOWN_OPERATION_NAME,
        PermissionsExceptionCode.UNKNOWN_OPERATION_NAME,
      );
  }

  if (isEmpty(permissionsForEntity.restrictedFields)) {
    return;
  }
};

type ValidateQueryIsPermittedOrThrowArgs = {
  expressionMap: QueryExpressionMap;
  objectsPermissions: ObjectsPermissions;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  objectIdByNameSingular: Record<string, string>;
  shouldBypassPermissionChecks: boolean;
};

export const validateQueryIsPermittedOrThrow = ({
  expressionMap,
  objectsPermissions,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  objectIdByNameSingular,
  shouldBypassPermissionChecks,
}: ValidateQueryIsPermittedOrThrowArgs) => {
  if (shouldBypassPermissionChecks) {
    return;
  }

  const { mainEntity, operationType, isSubQuery } =
    getTargetEntityAndOperationType(expressionMap);

  if (isSubQuery) {
    return;
  }

  const mainObjectMetadataId = objectIdByNameSingular[mainEntity];
  const mainObjectMetadata = isNonEmptyString(mainObjectMetadataId)
    ? flatObjectMetadataMaps.byId[mainObjectMetadataId]
    : undefined;

  let expressionMapSelectsOnMainEntity = expressionMap.selects;

  if (!isEmpty(expressionMap.joinAttributes)) {
    const { selectsWithoutJoinedAliases } =
      validatePermissionsForJoinsAndReturnSelectsWithoutJoins({
        expressionMap,
        objectsPermissions,
        flatObjectMetadataMaps,
        flatFieldMetadataMaps,
        objectIdByNameSingular,
        mainObjectMetadata,
      });

    expressionMapSelectsOnMainEntity = selectsWithoutJoinedAliases;
  }

  const allFieldsSelected = expressionMapSelectsOnMainEntity.some(
    (select) => select.selection === mainEntity,
  );

  let selectedColumns: string[] | '*' = [];
  let updatedColumns: string[] = [];

  selectedColumns = getSelectedColumnsFromExpressionMap({
    operationType,
    expressionMapReturning: expressionMap.returning,
    expressionMapSelects: expressionMapSelectsOnMainEntity,
    allFieldsSelected,
  });

  if (operationType !== 'select') {
    const valuesSet = expressionMap.valuesSet;

    if (Array.isArray(valuesSet)) {
      updatedColumns = valuesSet.reduce((acc, value) => {
        const keys = Object.keys(value);

        keys.forEach((key) => {
          if (!acc.includes(key)) {
            acc.push(key);
          }
        });

        return acc;
      }, []);
    } else {
      updatedColumns = Object.keys(valuesSet ?? {});
    }
  }

  validateOperationIsPermittedOrThrow({
    entityName: mainEntity,
    operationType: operationType as OperationType,
    objectsPermissions,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    objectIdByNameSingular,
    selectedColumns,
    allFieldsSelected,
    updatedColumns,
  });
};

const validatePermissionsForJoinsAndReturnSelectsWithoutJoins = ({
  expressionMap,
  objectsPermissions,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  objectIdByNameSingular,
  mainObjectMetadata,
}: {
  expressionMap: QueryExpressionMap;
  objectsPermissions: ObjectsPermissions;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  objectIdByNameSingular: Record<string, string>;
  mainObjectMetadata?: FlatObjectMetadata;
}) => {
  // If the main entity is favorite or favoriteFolder, skip join permission checks
  if (
    mainObjectMetadata?.standardId === STANDARD_OBJECT_IDS.favorite ||
    mainObjectMetadata?.standardId === STANDARD_OBJECT_IDS.favoriteFolder
  ) {
    return { selectsWithoutJoinedAliases: expressionMap.selects };
  }

  const joinAttributesAliases = new Set(
    expressionMap.joinAttributes.map((join) => join.alias.name),
  );

  const indexesOfSelectsForJoinedAlias: number[] = [];

  for (const [_index, joinedAlias] of joinAttributesAliases.entries()) {
    const entity = expressionMap.aliases.find(
      (alias) => alias.type === 'join' && alias.name === joinedAlias,
    )?.metadata;

    if (isDefined(entity)) {
      // eslint-disable-next-line no-console
      console.error(
        `[PERMISSION DEBUG] Checking join entity "${entity.name}" for permission validation.`,
      );
      for (const [index, select] of expressionMap.selects.entries()) {
        const regex = /"(\w+)"\."(\w+)"/;
        const extractedAlias = select.selection.match(regex)?.[1]; // "person"."name" -> "person"

        if (isDefined(extractedAlias) && extractedAlias === joinedAlias) {
          indexesOfSelectsForJoinedAlias.push(index);

          const selectedColumns = getSelectedColumnsFromExpressionMap({
            operationType: 'select',
            expressionMapSelects: expressionMap.selects.filter(
              (_select, indexOfSelect) => indexOfSelect === index,
            ),
            allFieldsSelected: false,
          });

          validateOperationIsPermittedOrThrow({
            entityName: entity.name,
            operationType: 'select' as OperationType,
            objectsPermissions,
            flatObjectMetadataMaps,
            flatFieldMetadataMaps,
            objectIdByNameSingular,
            selectedColumns,
            allFieldsSelected: false,
            updatedColumns: [],
          });
        }
      }
    }
  }

  const selectsWithoutJoinedAliases = expressionMap.selects.filter(
    (_select, index) => !indexesOfSelectsForJoinedAlias.includes(index),
  );

  return { selectsWithoutJoinedAliases };
};

const validateReadFieldPermissionOrThrow = ({
  restrictedFields,
  selectedColumns,
  columnNameToFieldMetadataIdMap,
  allFieldsSelected,
}: {
  restrictedFields: RestrictedFieldsPermissions;
  selectedColumns: string[] | '*';
  columnNameToFieldMetadataIdMap: Record<string, string>;
  allFieldsSelected?: boolean;
}) => {
  const noReadRestrictions =
    isEmpty(restrictedFields) ||
    Object.values(restrictedFields).every((field) => field.canRead !== false);

  if (noReadRestrictions) {
    return;
  }

  if (allFieldsSelected || selectedColumns === '*') {
    throw new PermissionsException(
      PermissionsExceptionMessage.PERMISSION_DENIED,
      PermissionsExceptionCode.PERMISSION_DENIED,
    );
  }

  for (const column of selectedColumns) {
    const fieldMetadataId = columnNameToFieldMetadataIdMap[column];

    if (!fieldMetadataId) {
      throw new InternalServerError(
        `Field metadata id not found for column name ${column}`,
      );
    }

    if (restrictedFields[fieldMetadataId]?.canRead === false) {
      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
    }
  }
};

const validateUpdateFieldPermissionOrThrow = ({
  restrictedFields,
  updatedColumns,
  columnNameToFieldMetadataIdMap,
}: {
  restrictedFields: RestrictedFieldsPermissions;
  updatedColumns: string[];
  columnNameToFieldMetadataIdMap: Record<string, string>;
}) => {
  if (isEmpty(restrictedFields)) {
    return;
  }

  for (const column of updatedColumns) {
    const fieldMetadataId = columnNameToFieldMetadataIdMap[column];

    if (!fieldMetadataId) {
      throw new InternalServerError(
        `Field metadata id not found for column name ${column}`,
      );
    }

    if (restrictedFields[fieldMetadataId]?.canUpdate === false) {
      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
    }
  }
};

const getSelectedColumnsFromExpressionMap = ({
  operationType,
  expressionMapReturning,
  expressionMapSelects,
  allFieldsSelected,
}: {
  operationType: string;
  expressionMapSelects: { selection: string }[];
  allFieldsSelected: boolean;
  expressionMapReturning?: string | string[];
}) => {
  let selectedColumns: string[] | '*' = [];

  if (
    ['update', 'insert', 'delete', 'soft-delete', 'restore'].includes(
      operationType,
    )
  ) {
    if (!isDefined(expressionMapReturning)) {
      throw new InternalServerError(
        'Returning columns are not set for update query',
      );
    }
    selectedColumns =
      expressionMapReturning === '*' ? '*' : [expressionMapReturning].flat();
  } else if (!allFieldsSelected) {
    selectedColumns =
      getSelectedColumnsFromExpressionMapSelects(expressionMapSelects);
  }

  return selectedColumns;
};

const getSelectedColumnsFromExpressionMapSelects = (
  selects: { selection: string }[],
) => {
  return selects
    ?.map((select) => {
      const columnsFromAggregateExpression =
        ProcessAggregateHelper.extractColumnNamesFromAggregateExpression(
          select.selection,
        );

      if (columnsFromAggregateExpression) {
        return columnsFromAggregateExpression;
      }

      const parts = select.selection.split('.');

      return parts[parts.length - 1];
    })
    .flat();
};
