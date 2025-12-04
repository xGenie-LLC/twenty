import { useEffect } from 'react';
import { type ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import { useUpsertObjectPermission } from '@/settings/roles/role-permissions/object-level-permissions/hooks/useUpsertObjectPermission';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import styled from '@emotion/styled';
import { t } from '@lingui/core/macro';
import { useRecoilValue } from 'recoil';
import { FieldMetadataType, RecordAccessLevel } from 'twenty-shared/types';
import { H2Title } from 'twenty-ui/display';
import { Checkbox, CheckboxSize } from 'twenty-ui/input';
import { Select } from '@/ui/input/components/Select';
import { Card, Section } from 'twenty-ui/layout';

type SettingsRolePermissionsObjectLevelRecordAccessProps = {
  roleId: string;
  objectMetadataItem: ObjectMetadataItem;
};

const StyledCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
`;

const StyledCardContent = styled.div`
  align-items: center;
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  justify-content: space-between;
`;

const StyledHeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledDescription = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  max-width: 540px;
`;

const StyledOwnershipContainer = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
  margin-top: ${({ theme }) => theme.spacing(3)};
  padding-top: ${({ theme }) => theme.spacing(3)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledOwnershipList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledOwnershipRow = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(0.5)} 0;
`;

const StyledOwnershipTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledSubtleText = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const StyledInlineHint = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  padding: ${({ theme }) => theme.spacing(2)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const SettingsRolePermissionsObjectLevelRecordAccess = ({
  roleId,
  objectMetadataItem,
}: SettingsRolePermissionsObjectLevelRecordAccessProps) => {
  const settingsDraftRole = useRecoilValue(
    settingsDraftRoleFamilyState(roleId),
  );

  const { objectMetadataItems } = useObjectMetadataItems();

  const { upsertRecordAccessLevel, upsertOwnershipFieldNames } =
    useUpsertObjectPermission({
      roleId,
    });

  const workspaceMemberObjectId = objectMetadataItems.find(
    (item) => item.nameSingular === 'workspaceMember',
  )?.id;

  const workspaceMemberRelationFields =
    workspaceMemberObjectId === undefined
      ? []
      : objectMetadataItem.fields.filter(
          (field) =>
            field.type === FieldMetadataType.RELATION &&
            field.relation?.targetObjectMetadata?.id ===
              workspaceMemberObjectId,
        );

  const ownershipOptions = workspaceMemberRelationFields.map((field) => {
    const fieldLabel = field.label ?? field.name;
    return {
      label: fieldLabel,
      description: t`Matches the member set in ${fieldLabel}`,
      value: ((field.settings as { joinColumnName?: string } | null | undefined)
        ?.joinColumnName ?? `${field.name}Id`) as string,
    };
  });

  const currentRecordAccessLevel =
    settingsDraftRole.objectPermissions?.find(
      (permission) =>
        permission.objectMetadataId === objectMetadataItem.id &&
        permission.recordAccessLevel,
    )?.recordAccessLevel ?? RecordAccessLevel.EVERYTHING;

  const fallbackOwnershipFieldName =
    workspaceMemberRelationFields[0] !== undefined
      ? ((
          workspaceMemberRelationFields[0].settings as
            | {
                joinColumnName?: string;
              }
            | null
            | undefined
        )?.joinColumnName ?? `${workspaceMemberRelationFields[0].name}Id`)
      : undefined;

  const currentOwnershipSelections =
    settingsDraftRole.objectPermissions?.find(
      (permission) =>
        permission.objectMetadataId === objectMetadataItem.id &&
        permission.ownershipFieldNames,
    )?.ownershipFieldNames ??
    (fallbackOwnershipFieldName ? [fallbackOwnershipFieldName] : []);

  const isOwnedOnlyDisabled = ownershipOptions.length === 0;
  const recordAccessOptions = [
    {
      label: t`See all records`,
      value: RecordAccessLevel.EVERYTHING,
    },
    {
      label: isOwnedOnlyDisabled
        ? t`See owned records only (no owner field)`
        : t`See owned records only`,
      value: RecordAccessLevel.OWNED_ONLY,
      disabled: isOwnedOnlyDisabled,
    },
  ];

  const hasOwnershipOptions = ownershipOptions.length > 0;
  const hasMultipleOwnershipOptions = ownershipOptions.length > 1;

  const defaultOwnershipSelection =
    currentOwnershipSelections.length > 0
      ? currentOwnershipSelections
      : fallbackOwnershipFieldName
        ? [fallbackOwnershipFieldName]
        : ownershipOptions[0]
          ? [ownershipOptions[0].value]
          : [];

  // Check if this object already has an objectPermission record
  const existingObjectPermission = settingsDraftRole.objectPermissions?.find(
    (permission) => permission.objectMetadataId === objectMetadataItem.id,
  );

  // Auto-create default objectPermission when entering this page if none exists
  // This ensures that clicking Finish will save the permission even if user doesn't change the dropdown
  useEffect(() => {
    if (!existingObjectPermission && settingsDraftRole.isEditable) {
      upsertRecordAccessLevel(
        objectMetadataItem.id,
        RecordAccessLevel.EVERYTHING,
      );
    }
  }, [
    existingObjectPermission,
    objectMetadataItem.id,
    settingsDraftRole.isEditable,
    upsertRecordAccessLevel,
  ]);

  const handleRecordAccessChange = (value: unknown) => {
    const nextLevel = value as RecordAccessLevel;

    if (nextLevel === RecordAccessLevel.OWNED_ONLY) {
      if (!hasOwnershipOptions || defaultOwnershipSelection.length === 0) {
        // No ownership fields available; keep current selection and ignore change.
        return;
      }

      // Always set ownership field names when switching to OWNED_ONLY
      // This ensures the correct field names are saved even for objects
      // that use different field names (e.g., Task uses assigneeId instead of ownerWorkspaceMemberId)
      upsertOwnershipFieldNames(
        objectMetadataItem.id,
        Array.from(new Set(defaultOwnershipSelection)),
      );
    }

    upsertRecordAccessLevel(objectMetadataItem.id, nextLevel);
  };

  return (
    <Section>
      <H2Title
        title={t`Record visibility`}
        description={t`Choose whether members with this role can see every record or only records they own (selected owner fields).`}
      />
      <StyledCard rounded>
        <StyledCardContent>
          <StyledHeaderContent>
            <div>{objectMetadataItem.labelPlural}</div>
          </StyledHeaderContent>
          <Select
            dropdownId="record-access-level"
            options={recordAccessOptions}
            value={currentRecordAccessLevel}
            onChange={handleRecordAccessChange}
            disabled={!settingsDraftRole.isEditable}
            selectSizeVariant="default"
          />
        </StyledCardContent>
        {currentRecordAccessLevel === RecordAccessLevel.OWNED_ONLY && (
          <StyledOwnershipContainer>
            <StyledSubtleText>
              {hasOwnershipOptions
                ? hasMultipleOwnershipOptions
                  ? t`Select which fields count as ownership for this object.`
                  : t`Records are treated as owned when this field matches the member.`
                : t`No member fields found. Add an Owner (Workspace Member) field in Data model to enable owned visibility.`}
            </StyledSubtleText>

            {hasOwnershipOptions ? (
              hasMultipleOwnershipOptions ? (
                <StyledOwnershipList>
                  {ownershipOptions.map((option) => {
                    const isChecked = currentOwnershipSelections.includes(
                      option.value,
                    );

                    return (
                      <StyledOwnershipRow key={option.value}>
                        <Checkbox
                          size={CheckboxSize.Small}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const nextSelection = checked
                              ? [...currentOwnershipSelections, option.value]
                              : currentOwnershipSelections.filter(
                                  (value) => value !== option.value,
                                );

                            if (nextSelection.length === 0) {
                              return;
                            }

                            upsertOwnershipFieldNames(
                              objectMetadataItem.id,
                              Array.from(new Set(nextSelection)),
                            );
                          }}
                          disabled={!settingsDraftRole.isEditable}
                        />
                        <StyledOwnershipTexts>
                          <div>{option.label}</div>
                          <StyledDescription>
                            {option.description}
                          </StyledDescription>
                        </StyledOwnershipTexts>
                      </StyledOwnershipRow>
                    );
                  })}
                </StyledOwnershipList>
              ) : (
                <StyledInlineHint>
                  <div>{ownershipOptions[0]?.label}</div>
                  <StyledDescription>
                    {ownershipOptions[0]?.description}
                  </StyledDescription>
                </StyledInlineHint>
              )
            ) : null}
          </StyledOwnershipContainer>
        )}
      </StyledCard>
    </Section>
  );
};
