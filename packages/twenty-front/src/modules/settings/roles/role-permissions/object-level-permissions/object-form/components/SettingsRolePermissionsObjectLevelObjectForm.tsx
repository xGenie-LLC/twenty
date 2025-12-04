import styled from '@emotion/styled';
import { useMutation } from '@apollo/client';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { DELETE_OBJECT_PERMISSION } from '@/settings/roles/graphql/mutations/deleteObjectPermissionMutation';
import { GET_ROLES } from '@/settings/roles/graphql/queries/getRolesQuery';
import { useDeleteObjectPermissionFromDraftRole } from '@/settings/roles/role-permissions/object-level-permissions/hooks/useDeleteObjectPermissionFromDraftRole';
import { SettingsRolePermissionsObjectLevelObjectFieldPermissionTable } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/components/SettingsRolePermissionsObjectLevelObjectFieldPermissionTable';
import { SettingsRolePermissionsObjectLevelObjectFormObjectLevel } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/SettingsRolePermissionsObjectLevelObjectFormObjectLevel';
import { SettingsRolePermissionsObjectLevelRecordAccess } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/SettingsRolePermissionsObjectLevelRecordAccess';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { getOperationName } from '@apollo/client/utilities';
import { t } from '@lingui/core/macro';
import { useSearchParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { IconTrash } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { useFindOneAgentQuery } from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

const StyledActionButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
`;

type SettingsRolePermissionsObjectLevelObjectFormProps = {
  roleId: string;
  objectMetadataId: string;
};

export const SettingsRolePermissionsObjectLevelObjectForm = ({
  roleId,
  objectMetadataId,
}: SettingsRolePermissionsObjectLevelObjectFormProps) => {
  const [searchParams] = useSearchParams();
  const fromAgentId = searchParams.get('fromAgent');
  const navigateSettings = useNavigateSettings();

  const settingsDraftRole = useRecoilValue(
    settingsDraftRoleFamilyState(roleId),
  );

  const { deleteObjectPermissionFromDraftRole } =
    useDeleteObjectPermissionFromDraftRole(roleId);

  const [deleteObjectPermission] = useMutation(DELETE_OBJECT_PERMISSION, {
    refetchQueries: [getOperationName(GET_ROLES) ?? ''],
  });

  const { data: agentData } = useFindOneAgentQuery({
    variables: { id: fromAgentId || '' },
    skip: !fromAgentId,
  });

  const objectMetadata = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });

  const objectMetadataItem = objectMetadata.objectMetadataItem;

  const objectLabelSingular = objectMetadataItem.labelSingular;
  const objectLabelPlural = objectMetadataItem.labelPlural;

  const agent = agentData?.findOneAgent;

  const handleDeleteRule = async () => {
    // Delete from backend database
    await deleteObjectPermission({
      variables: { roleId, objectMetadataId },
    });
    // Delete from local draft state
    deleteObjectPermissionFromDraftRole(objectMetadataId);
    if (isDefined(fromAgentId) && isDefined(agent)) {
      navigateSettings(SettingsPath.AIAgentDetail, { agentId: agent.id });
    } else {
      navigateSettings(SettingsPath.RoleDetail, { roleId });
    }
  };

  const breadcrumbLinks =
    fromAgentId && isDefined(agent)
      ? [
          {
            children: t`Workspace`,
            href: getSettingsPath(SettingsPath.Workspace),
          },
          {
            children: t`AI`,
            href: getSettingsPath(SettingsPath.AI),
          },
          {
            children: agent.label,
            href: getSettingsPath(SettingsPath.AIAgentDetail, {
              agentId: agent.id,
            }),
          },
          {
            children: t`Permissions · ${objectLabelSingular}`,
          },
        ]
      : [
          {
            children: t`Workspace`,
            href: getSettingsPath(SettingsPath.Workspace),
          },
          {
            children: t`Roles`,
            href: getSettingsPath(SettingsPath.Roles),
          },
          {
            children: settingsDraftRole.label,
            href: getSettingsPath(SettingsPath.RoleDetail, {
              roleId,
            }),
          },
          {
            children: t`Permissions · ${objectLabelSingular}`,
          },
        ];

  const finishButtonPath =
    fromAgentId && isDefined(agent)
      ? getSettingsPath(SettingsPath.AIAgentDetail, { agentId: agent.id })
      : getSettingsPath(SettingsPath.RoleDetail, { roleId });

  return (
    <SubMenuTopBarContainer
      title={t`2. Set ${objectLabelPlural} permissions`}
      links={breadcrumbLinks}
      actionButton={
        <StyledActionButtonsContainer>
          <Button
            Icon={IconTrash}
            title={t`Delete rule`}
            variant="secondary"
            size="small"
            accent="danger"
            onClick={handleDeleteRule}
            disabled={!settingsDraftRole.isEditable}
          />
          <Button
            title={t`Finish`}
            variant="secondary"
            size="small"
            accent="blue"
            to={finishButtonPath}
          />
        </StyledActionButtonsContainer>
      }
    >
      <SettingsPageContainer>
        <SettingsRolePermissionsObjectLevelObjectFormObjectLevel
          objectMetadataItem={objectMetadataItem}
          roleId={roleId}
        />
        <SettingsRolePermissionsObjectLevelRecordAccess
          objectMetadataItem={objectMetadataItem}
          roleId={roleId}
        />
        <SettingsRolePermissionsObjectLevelObjectFieldPermissionTable
          objectMetadataItem={objectMetadataItem}
          roleId={roleId}
        />
      </SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
};
