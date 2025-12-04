import { type RestrictedFieldsPermissions } from './RestrictedFieldsPermissions';
import { type RecordAccessLevel } from './RecordAccessLevel';

export type ObjectPermissions = {
  canReadObjectRecords: boolean;
  canUpdateObjectRecords: boolean;
  canSoftDeleteObjectRecords: boolean;
  canDestroyObjectRecords: boolean;
  recordAccessLevel?: RecordAccessLevel;
  ownershipFieldNames?: string[];
  restrictedFields: RestrictedFieldsPermissions;
};
