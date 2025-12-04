import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useSetRecoilState } from 'recoil';

export const useDeleteObjectPermissionFromDraftRole = (roleId: string) => {
  const setSettingsDraftRole = useSetRecoilState(
    settingsDraftRoleFamilyState(roleId),
  );

  const deleteObjectPermissionFromDraftRole = (objectMetadataId: string) => {
    setSettingsDraftRole((currentSettingsDraftRole) => ({
      ...currentSettingsDraftRole,
      objectPermissions: (
        currentSettingsDraftRole.objectPermissions ?? []
      ).filter(
        (permission) => permission.objectMetadataId !== objectMetadataId,
      ),
      fieldPermissions: (
        currentSettingsDraftRole.fieldPermissions ?? []
      ).filter(
        (permission) => permission.objectMetadataId !== objectMetadataId,
      ),
    }));
  };

  return {
    deleteObjectPermissionFromDraftRole,
  };
};
