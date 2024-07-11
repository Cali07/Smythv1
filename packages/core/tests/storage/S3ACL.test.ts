import { xxh3 } from '@node-rs/xxhash';
import { describe, expect, it } from 'vitest';

import { S3Storage } from '@sre/IO/Storage.service/connectors/S3Storage.class';
import { TAccessLevel, TAccessRole } from '@sre/types/ACL.types';
//import SRE, { AgentRequest } from '../../dist';
import { StorageConnector } from '@sre/IO/Storage.service/StorageConnector';
import SREInstance from '../001_Base/SREInstance';
import { ACL } from '@sre/Security/AccessControl/ACL.class';
import { AccessRequest } from '@sre/Security/AccessControl/AccessRequest.class';
import { AccessCandidate } from '@sre/Security/AccessControl/AccessCandidate.class';

const testFile = 'unit-tests/acl-test.txt';

describe('S3 Storage Advanced Access Rights', () => {
    it('Create S3Storage', async () => {
        const s3Storage: StorageConnector = SREInstance.Storage;
        expect(s3Storage).toBeInstanceOf(S3Storage);
    });

    it('Write files in S3Storage', async () => {
        let error;

        try {
            const s3Storage: StorageConnector = SREInstance.Storage;

            const agent = AccessCandidate.agent('agent-123456');

            const acl = ACL.addAccess(TAccessRole.Team, 'myTeam', TAccessLevel.Read);

            await s3Storage.user(agent).write(testFile, 'Hello World!', acl);
        } catch (e) {
            //console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });
    it('Overwrite file With invalid access token', async () => {
        let error;

        try {
            const s3Storage: StorageConnector = SREInstance.Storage;
            const strangerAgent = AccessCandidate.agent('agent-stranger');

            await s3Storage.user(strangerAgent).write(testFile, 'Hello World!');
        } catch (e) {
            //console.error(e);
            error = e;
        }

        expect(error?.message).toEqual('Access Denied');
    });
    it('Read files from using wrong access => should fail', async () => {
        //this fails because the agent does not have access to the resource, and is not from the same team as the owner (default team name is "default")
        let error;

        try {
            const s3Storage: StorageConnector = SREInstance.Storage;

            const agentNoAccess = AccessCandidate.agent('agent-no-access');

            const result = await s3Storage.user(agentNoAccess).read(testFile);

            expect(result.toString()).toBe('Hello World!');
        } catch (e) {
            //console.error(e);
            error = e;
        }

        expect(error).toBeDefined();
    });

    it('Read files', async () => {
        let error;

        try {
            const s3Storage: StorageConnector = SREInstance.Storage;
            const agent = AccessCandidate.agent('agent-123456');

            const result = await s3Storage.user(agent).read(testFile);

            expect(result.toString()).toBe('Hello World!');

            const team = AccessCandidate.team('myTeam');

            //const teamAccessToken = await s3Storage.getAccess(acTeamRequest);
            const teamResult = await s3Storage.user(team).read(testFile);

            expect(teamResult.toString()).toBe('Hello World!');
        } catch (e) {
            //console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('Delete files in S3Storage', async () => {
        let error;

        try {
            const s3Storage: StorageConnector = SREInstance.Storage;
            const agent = AccessCandidate.agent('agent-123456');
            await s3Storage.user(agent).delete(testFile);
        } catch (e) {
            //console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });
});
