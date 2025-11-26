import { Field, InputType } from '@nestjs/graphql';

import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { RecordAccessLevel } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class UpsertObjectPermissionsInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  roleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @Field(() => [ObjectPermissionInput])
  objectPermissions: ObjectPermissionInput[];
}

@InputType()
export class ObjectPermissionInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  objectMetadataId: string;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canReadObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canUpdateObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canSoftDeleteObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canDestroyObjectRecords?: boolean;

  @IsEnum(RecordAccessLevel)
  @IsOptional()
  @Field(() => RecordAccessLevel, { nullable: true })
  recordAccessLevel?: RecordAccessLevel;

  @IsOptional()
  @IsArray()
  @Field(() => [String], { nullable: true })
  ownershipFieldNames?: string[];
}
