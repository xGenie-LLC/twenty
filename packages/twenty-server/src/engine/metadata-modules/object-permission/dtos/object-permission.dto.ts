import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import {
  RecordAccessLevel,
  RestrictedFieldsPermissions,
} from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

registerEnumType(RecordAccessLevel, { name: 'RecordAccessLevel' });

@ObjectType('ObjectPermission')
export class ObjectPermissionDTO {
  @Field(() => UUIDScalarType, { nullable: false })
  objectMetadataId: string;

  @Field({ nullable: true })
  canReadObjectRecords?: boolean;

  @Field({ nullable: true })
  canUpdateObjectRecords?: boolean;

  @Field({ nullable: true })
  canSoftDeleteObjectRecords?: boolean;

  @Field({ nullable: true })
  canDestroyObjectRecords?: boolean;

  @Field(() => RecordAccessLevel, { nullable: false })
  recordAccessLevel: RecordAccessLevel;

  @Field(() => [String], { nullable: true })
  ownershipFieldNames?: string[];

  @Field(() => GraphQLJSON, {
    nullable: true,
  })
  restrictedFields?: RestrictedFieldsPermissions;
}
