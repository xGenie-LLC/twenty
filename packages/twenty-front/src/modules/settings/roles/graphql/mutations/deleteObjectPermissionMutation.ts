import { gql } from '@apollo/client';

export const DELETE_OBJECT_PERMISSION = gql`
  mutation DeleteObjectPermission($roleId: UUID!, $objectMetadataId: UUID!) {
    deleteObjectPermission(roleId: $roleId, objectMetadataId: $objectMetadataId)
  }
`;
