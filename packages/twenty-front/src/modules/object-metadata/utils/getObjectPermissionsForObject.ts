import { getObjectPermissionsFromMapByObjectMetadataId } from '@/settings/roles/role-permissions/objects-permissions/utils/getObjectPermissionsFromMapByObjectMetadataId';
import { type ObjectPermissions, RecordAccessLevel } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const getObjectPermissionsForObject = (
  objectPermissionsByObjectMetadataId: Record<
    string,
    ObjectPermissions & { objectMetadataId: string }
  >,
  objectMetadataId: string,
): ObjectPermissions & { objectMetadataId: string } => {
  const objectPermissions = getObjectPermissionsFromMapByObjectMetadataId({
    objectPermissionsByObjectMetadataId,
    objectMetadataId,
  });

  if (!isDefined(objectPermissions)) {
    return {
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: true,
      canDestroyObjectRecords: true,
      recordAccessLevel: RecordAccessLevel.EVERYTHING,
      restrictedFields: {},
      objectMetadataId,
    };
  }

  return {
    canReadObjectRecords: objectPermissions.canReadObjectRecords ?? true,
    canUpdateObjectRecords: objectPermissions.canUpdateObjectRecords ?? true,
    canSoftDeleteObjectRecords:
      objectPermissions.canSoftDeleteObjectRecords ?? true,
    canDestroyObjectRecords: objectPermissions.canDestroyObjectRecords ?? true,
    recordAccessLevel:
      objectPermissions.recordAccessLevel ?? RecordAccessLevel.EVERYTHING,
    restrictedFields: objectPermissions.restrictedFields ?? {},
    objectMetadataId,
  };
};
