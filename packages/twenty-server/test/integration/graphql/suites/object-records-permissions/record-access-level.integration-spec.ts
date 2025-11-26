import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { RecordAccessLevel } from 'twenty-shared/types';

import { createCustomRoleWithObjectPermissions } from 'test/integration/graphql/utils/create-custom-role-with-object-permissions.util';
import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { deleteRole } from 'test/integration/graphql/utils/delete-one-role.util';
import { findManyOperationFactory } from 'test/integration/graphql/utils/find-many-operation-factory.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeGraphqlAPIRequestWithMemberRole } from 'test/integration/graphql/utils/make-graphql-api-request-with-member-role.util';
import { updateWorkspaceMemberRole } from 'test/integration/graphql/utils/update-workspace-member-role.util';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

const client = request(`http://localhost:${APP_PORT}`);

describe('recordAccessLevel', () => {
  let memberRoleId: string;
  let customRoleId: string;

  beforeAll(async () => {
    const getRolesQuery = {
      query: `
        query GetRoles {
          getRoles {
            id
            label
          }
        }
      `,
    };

    const rolesResponse = await client
      .post('/graphql')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send(getRolesQuery);

    memberRoleId = rolesResponse.body.data.getRoles.find(
      (role: any) => role.label === 'Member',
    ).id;
  });

  afterAll(async () => {
    if (memberRoleId) {
      await updateWorkspaceMemberRole({
        client,
        roleId: memberRoleId,
        workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      });
    }

    if (customRoleId) {
      await deleteRole(client, customRoleId);
    }
  });

  it('should return only owned records when recordAccessLevel is OWNED_ONLY', async () => {
    const ownedPersonId = randomUUID();
    const otherPersonId = randomUUID();

    const { roleId } = await createCustomRoleWithObjectPermissions({
      label: 'OwnedOnlyPersonReader',
      hasAllObjectRecordsReadPermission: false,
      canReadPerson: true,
      personRecordAccessLevel: RecordAccessLevel.OWNED_ONLY,
    });

    customRoleId = roleId;

    await updateWorkspaceMemberRole({
      client,
      roleId: customRoleId,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
    });

    const createOwnedPersonOperation = createOneOperationFactory({
      objectMetadataSingularName: 'person',
      gqlFields: 'id',
      data: {
        id: ownedPersonId,
      },
    });

    await makeGraphqlAPIRequestWithMemberRole(createOwnedPersonOperation);

    const createOtherPersonOperation = createOneOperationFactory({
      objectMetadataSingularName: 'person',
      gqlFields: 'id',
      data: {
        id: otherPersonId,
      },
    });

    await makeGraphqlAPIRequest(createOtherPersonOperation);

    const findManyPeopleOperation = findManyOperationFactory({
      objectMetadataSingularName: 'person',
      objectMetadataPluralName: 'people',
      gqlFields: `
        id
        createdByWorkspaceMemberId
      `,
      filter: {
        id: { in: [ownedPersonId, otherPersonId] },
      },
    });

    const response = await makeGraphqlAPIRequestWithMemberRole(
      findManyPeopleOperation,
    );

    expect(response.body.errors).toBeUndefined();
    const returnedIds = response.body.data.people.edges.map(
      (edge: any) => edge.node.id,
    );

    expect(returnedIds).toContain(ownedPersonId);
    expect(returnedIds).not.toContain(otherPersonId);
    expect(
      response.body.data.people.edges.every(
        (edge: any) =>
          edge.node.createdByWorkspaceMemberId ===
          WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      ),
    ).toBe(true);
  });
});
