import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useObjectPermissionDerivedStates } from '@/settings/roles/role-permissions/object-level-permissions/field-permissions/hooks/useObjectPermissionDerivedStates';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useLingui } from '@lingui/react/macro';
import { useRecoilValue } from 'recoil';
import { AppTooltip, TooltipDelay } from 'twenty-ui/display';

type SettingsRolePermissionsObjectLevelSeeFieldsValueForObjectProps = {
  roleId: string;
  objectMetadataItemId: string;
};

export const SettingsRolePermissionsObjectLevelSeeFieldsValueForObject = ({
  roleId,
  objectMetadataItemId,
}: SettingsRolePermissionsObjectLevelSeeFieldsValueForObjectProps) => {
  const { t } = useLingui();

  const settingsDraftRole = useRecoilValue(
    settingsDraftRoleFamilyState(roleId),
  );

  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataItemId,
  });

  const restrictableFieldMetadataItems = objectMetadataItem.fields.filter(
    (fieldMetadataItem) => !fieldMetadataItem.isSystem,
  );

  const numberOfRestrictableFieldMetadataItemsOnRead =
    restrictableFieldMetadataItems.length;

  const roleFieldPermissions =
    settingsDraftRole.fieldPermissions?.filter(
      (fieldPermission) =>
        fieldPermission.objectMetadataId === objectMetadataItemId,
    ) ?? [];

  const numberOfRestrictedFieldMetadataItemsOnRead =
    roleFieldPermissions.filter(
      (fieldPermission) => fieldPermission.canReadFieldValue === false,
    ).length;

  const canReadSome =
    numberOfRestrictedFieldMetadataItemsOnRead > 0 &&
    numberOfRestrictedFieldMetadataItemsOnRead <
      numberOfRestrictableFieldMetadataItemsOnRead;

  const canReadAll =
    roleFieldPermissions.length === 0 ||
    numberOfRestrictedFieldMetadataItemsOnRead === 0;

  const { objectReadIsRestricted } = useObjectPermissionDerivedStates({
    roleId,
    objectMetadataItemId,
  });

  const anchorId = `object-level-read-${roleId}-${objectMetadataItemId}`;

  const { label, tooltip } = (() => {
    if (objectReadIsRestricted) {
      return { label: '-', tooltip: null as string | null };
    }

    if (canReadAll) {
      return {
        label: t`All (default)`,
        tooltip: t`No field-level overrides; inherits default visibility.`,
      };
    }

    if (canReadSome) {
      return {
        label: t`Custom`,
        tooltip: t`${numberOfRestrictedFieldMetadataItemsOnRead} of ${numberOfRestrictableFieldMetadataItemsOnRead} fields hidden.`,
      };
    }

    return { label: t`No`, tooltip: t`All fields hidden.` };
  })();

  return (
    <>
      <span id={anchorId}>{label}</span>
      {tooltip && (
        <AppTooltip
          anchorSelect={`#${anchorId}`}
          content={tooltip}
          delay={TooltipDelay.shortDelay}
          noArrow
          place="bottom"
          positionStrategy="fixed"
        />
      )}
    </>
  );
};
