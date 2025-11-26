import { type RoleWithPartialMembers } from '@/settings/roles/types/RoleWithPartialMembers';
import { isNonEmptyArray } from '@sniptt/guards';
import { produce } from 'immer';
import { RecordAccessLevel } from 'twenty-shared/types';
import { type ObjectPermission } from '~/generated/graphql';

export const getRoleWithUpsertedObjectPermission = (
  role: RoleWithPartialMembers,
  objectPermissionToUpsert: Partial<ObjectPermission> & {
    objectMetadataId: string;
  },
) => {
  return produce(role, (draftRole) => {
    if (!isNonEmptyArray(draftRole.objectPermissions)) {
      draftRole.objectPermissions = [
        {
          recordAccessLevel: RecordAccessLevel.EVERYTHING,
          ...objectPermissionToUpsert,
        },
      ];

      return;
    }

    const indexOfExistingObjectPermission =
      draftRole.objectPermissions.findIndex(
        (objectPermissionToFind) =>
          objectPermissionToFind.objectMetadataId ===
          objectPermissionToUpsert.objectMetadataId,
      );

    if (indexOfExistingObjectPermission > -1) {
      const existingPermission =
        draftRole.objectPermissions[indexOfExistingObjectPermission];

      draftRole.objectPermissions[indexOfExistingObjectPermission] = {
        ...existingPermission,
        ...objectPermissionToUpsert,
        recordAccessLevel:
          objectPermissionToUpsert.recordAccessLevel ??
          existingPermission.recordAccessLevel,
        ownershipFieldNames:
          objectPermissionToUpsert.ownershipFieldNames ??
          existingPermission.ownershipFieldNames,
      };
    } else {
      draftRole.objectPermissions.push({
        recordAccessLevel: RecordAccessLevel.EVERYTHING,
        ...objectPermissionToUpsert,
      });
    }

    return draftRole;
  });
};
