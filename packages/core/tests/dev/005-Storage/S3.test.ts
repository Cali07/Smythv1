import { xxh3 } from '@node-rs/xxhash';
import { describe, expect, it } from 'vitest';

import { S3Storage } from '@sre/IO/Storage.service/connectors/S3Storage.class';
import { TAccessLevel, TAccessRole } from '@sre/types/ACL.types';
//import SRE, { AgentRequest } from '../../dist';
import { StorageConnector } from '@sre/IO/Storage.service/StorageConnector';
import SREInstance from './SREInstance';
import { ACL } from '@sre/Security/AccessControl/ACL.class';
import { AccessCandidate } from '@sre/Security/AccessControl/AccessCandidate.class';
import { AccessRequest } from '@sre/Security/AccessControl/AccessRequest.class';

const s3Storage: StorageConnector = SREInstance.Storage;

const testFile = 'unit-tests/test.txt';
const testAdditionalACLMetadata = {
    hashAlgorithm: 'xxh3',
    entries: {
        [TAccessRole.Team]: {
            //hash 'team1'
            [xxh3.xxh64('team1').toString(16)]: [TAccessLevel.Read, TAccessLevel.Write],
        },
        [TAccessRole.Agent]: {
            //hash 'team1'
            [xxh3.xxh64('agent1').toString(16)]: [TAccessLevel.Owner],
        },
    },
};

const testFileWithMeta = 'unit-tests/test-meta.txt';
const testOriginalACLMetadata = {
    hashAlgorithm: 'none',
    entries: {
        [TAccessRole.Team]: {
            teamMeta: [TAccessLevel.Read, TAccessLevel.Write],
        },
    },
};

const agentCandidate = AccessCandidate.agent('agent-123456');

const testOriginalMetadata = {
    'Content-Type': 'text/plain',
    'x-amz-meta-test': 'test',
};

describe('S3 Storage Tests', () => {
    it('Create S3Storage', async () => {
        const s3Storage: StorageConnector = SREInstance.Storage;
        expect(s3Storage).toBeInstanceOf(S3Storage);
    });

    it('Read Legacy Metadata', async () => {
        const s3Storage: StorageConnector = SREInstance.Storage;
        const legacyFile = 'teams/9/logs/closz0vak00009tsctm7e8xzs/2024-05-12/LLW3FLB08WIE';

        const metadata = await s3Storage.user(agentCandidate).getMetadata(legacyFile);

        //Expected to not work, will only work if we associate the candidate "agent-123456" with the team "9"
        //TODO: once custom data provider is implemented, hardcode the team association in this test
        expect(metadata).toBe(true);
    });

    it('Write a file in S3Storage', async () => {
        let error;

        try {
            await s3Storage.user(agentCandidate).write(testFile, 'Hello World!');
        } catch (e) {
            console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('Write a file with metadata in S3Storage', async () => {
        let error;

        try {
            await s3Storage.user(agentCandidate).write(testFileWithMeta, 'I have metadata', testOriginalACLMetadata, testOriginalMetadata);

            const storageReq = await s3Storage.user(agentCandidate);
            storageReq.write(testFileWithMeta, 'I have metadata');
        } catch (e) {
            console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('Does the files exist ?', async () => {
        const files = [testFile, testFileWithMeta];

        const promises = files.map((file) => {
            return s3Storage.user(agentCandidate).exists(file);
        });

        const results = await Promise.all(promises);

        expect(results).toEqual([true, true]);
    });

    it('Is Metadata present', async () => {
        const metadata = await s3Storage.user(agentCandidate).getMetadata(testFileWithMeta);

        expect(metadata).toBeDefined();
    });

    it('Set ACL Metadata', async () => {
        let error;
        try {
            //we set the metadata for the file created in the previous test

            await s3Storage.user(agentCandidate).setACL(testFile, testAdditionalACLMetadata);
        } catch (e) {
            console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('Does ACL metadata exist ?', async () => {
        //here we need to build an access request for the agent1 because we changed the ACL metadata to have agent1 as owner
        const agent = AccessCandidate.agent('agent1');
        let metadata: any = await s3Storage.user(agent).getACL(testFile);

        expect(metadata).toEqual(testAdditionalACLMetadata);
    });

    it('Are Metadata ACL valid', async () => {
        const agent = AccessCandidate.agent('agent1');
        const accessRights = await s3Storage.user(agent).getACL(testFile);

        expect(accessRights).toEqual(testAdditionalACLMetadata);
    });

    it('Read files from S3Storage', async () => {
        const agent = AccessCandidate.agent('agent1');

        const data = await s3Storage.user(agent).read(testFile);
        const strData = data.toString();
        expect(strData).toEqual('Hello World!');

        const dataWithMeta = await s3Storage.user(agentCandidate).read(testFileWithMeta);
        const strDataWithMeta = dataWithMeta.toString();
        expect(strDataWithMeta).toEqual('I have metadata');
    });

    it('Delete files from S3Storage', async () => {
        let error;

        try {
            const agent = AccessCandidate.agent('agent1');
            await Promise.all([s3Storage.user(agent).delete(testFile), s3Storage.user(agentCandidate).delete(testFileWithMeta)]);
        } catch (e) {
            console.error(e);
            error = e;
        }

        expect(error).toBeUndefined();
    });

    it('The file should be deleted', async () => {
        const files = [testFile, testFileWithMeta];

        const promises = files.map((file) => {
            return s3Storage.user(agentCandidate).exists(file);
        });

        const results = await Promise.all(promises);

        expect(results).toEqual([false, false]);
    });
});
