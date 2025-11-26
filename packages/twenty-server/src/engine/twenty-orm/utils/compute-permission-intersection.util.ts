import {
  type ObjectsPermissions,
  type RestrictedFieldPermissions,
  RecordAccessLevel,
} from 'twenty-shared/types';

export const computePermissionIntersection = (
  permissionsArray: ObjectsPermissions[],
): ObjectsPermissions => {
  if (permissionsArray.length === 0) {
    return {};
  }

  if (permissionsArray.length === 1) {
    return permissionsArray[0];
  }

  const result: ObjectsPermissions = {};

  const allObjectMetadataIds = new Set<string>();

  for (const permissions of permissionsArray) {
    for (const id of Object.keys(permissions)) {
      allObjectMetadataIds.add(id);
    }
  }

  for (const objectMetadataId of allObjectMetadataIds) {
    let canReadObjectRecords = true;
    let canUpdateObjectRecords = true;
    let canSoftDeleteObjectRecords = true;
    let canDestroyObjectRecords = true;
    let recordAccessLevel = RecordAccessLevel.EVERYTHING;
    let ownershipFieldNames: string[] | null = null;
    const restrictedFields: Record<string, RestrictedFieldPermissions> = {};

    for (const permissions of permissionsArray) {
      const objPerm = permissions[objectMetadataId];

      if (!objPerm) {
        canReadObjectRecords = false;
        canUpdateObjectRecords = false;
        canSoftDeleteObjectRecords = false;
        canDestroyObjectRecords = false;
        continue;
      }

      canReadObjectRecords =
        canReadObjectRecords && objPerm.canReadObjectRecords === true;
      canUpdateObjectRecords =
        canUpdateObjectRecords && objPerm.canUpdateObjectRecords === true;
      canSoftDeleteObjectRecords =
        canSoftDeleteObjectRecords &&
        objPerm.canSoftDeleteObjectRecords === true;
      canDestroyObjectRecords =
        canDestroyObjectRecords && objPerm.canDestroyObjectRecords === true;
      if (
        Array.isArray(objPerm.ownershipFieldNames) &&
        objPerm.ownershipFieldNames.length > 0
      ) {
        if (ownershipFieldNames === null) {
          ownershipFieldNames = objPerm.ownershipFieldNames;
        } else {
          const intersection = ownershipFieldNames.filter((fieldName) =>
            objPerm.ownershipFieldNames?.includes(fieldName),
          );

          ownershipFieldNames = intersection;
        }
      }
      if (objPerm.recordAccessLevel === RecordAccessLevel.OWNED_ONLY) {
        recordAccessLevel = RecordAccessLevel.OWNED_ONLY;
      }

      if (objPerm.restrictedFields) {
        for (const [fieldName, fieldPerm] of Object.entries(
          objPerm.restrictedFields,
        )) {
          if (!restrictedFields[fieldName]) {
            restrictedFields[fieldName] = {
              canRead: null,
              canUpdate: null,
            };
          }

          const current = restrictedFields[fieldName];

          restrictedFields[fieldName] = {
            canRead:
              current.canRead === false || fieldPerm.canRead === false
                ? false
                : null,
            canUpdate:
              current.canUpdate === false || fieldPerm.canUpdate === false
                ? false
                : null,
          };
        }
      }
    }

    result[objectMetadataId] = {
      canReadObjectRecords,
      canUpdateObjectRecords,
      canSoftDeleteObjectRecords,
      canDestroyObjectRecords,
      recordAccessLevel,
      ownershipFieldNames: ownershipFieldNames ?? ['ownerWorkspaceMemberId'],
      restrictedFields,
    };
  }

  return result;
};
