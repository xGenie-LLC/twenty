import { type ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import { SettingsRolePermissionsObjectLevelOverrideCellContainer } from '@/settings/roles/role-permissions/object-level-permissions/components/SettingsRolePermissionsObjectLevelOverrideCellContainer';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import styled from '@emotion/styled';
import { t } from '@lingui/core/macro';
import { useRecoilValue } from 'recoil';
import { RecordAccessLevel } from 'twenty-shared/types';

const StyledContainer = styled.div`
  align-items: center;
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledBadge = styled.span`
  background-color: ${({ theme }) => theme.background.transparent.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.2;
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(1)}`};
`;

type SettingsRolePermissionsObjectLevelRecordValueProps = {
  objectMetadataItem: ObjectMetadataItem;
  roleId: string;
};

export const SettingsRolePermissionsObjectLevelRecordValue = ({
  objectMetadataItem,
  roleId,
}: SettingsRolePermissionsObjectLevelRecordValueProps) => {
  const settingsDraftRole = useRecoilValue(
    settingsDraftRoleFamilyState(roleId),
  );

  const objectPermission = settingsDraftRole.objectPermissions?.find(
    (objectPermission) =>
      objectPermission.objectMetadataId === objectMetadataItem.id,
  );

  const recordAccessLevel =
    objectPermission?.recordAccessLevel ?? RecordAccessLevel.EVERYTHING;

  const recordAccessLabel =
    recordAccessLevel === RecordAccessLevel.OWNED_ONLY ? t`Owned` : t`All`;

  return (
    <StyledContainer>
      <StyledBadge>{recordAccessLabel}</StyledBadge>
      <SettingsRolePermissionsObjectLevelOverrideCellContainer
        objectMetadataItem={objectMetadataItem}
        roleId={roleId}
        objectLabel={objectMetadataItem.labelPlural}
      />
    </StyledContainer>
  );
};
