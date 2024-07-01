import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { S3Storage } from '@sre/IO/Storage/connectors/S3Storage.class';
import { RedisCache } from '@sre/MemoryManager/Cache.service/connectors/RedisCache.class';
import config from '@sre/config';
import { AgentRequest, SmythRuntime } from '@sre/index';
import { IAgentDataConnector } from '@sre/AgentManager/AgentData/IAgentDataConnector';
const sre = SmythRuntime.Instance.init({
    Storage: {
        Connector: 'S3',
        Settings: {
            bucket: config.env.AWS_S3_BUCKET_NAME || '',
            region: config.env.AWS_S3_REGION || '',
            accessKeyId: config.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: config.env.AWS_SECRET_ACCESS_KEY || '',
        },
    },
    Cache: {
        Connector: 'Redis',
        Settings: {
            hosts: config.env.REDIS_SENTINEL_HOSTS,
            name: config.env.REDIS_MASTER_NAME || '',
            password: config.env.REDIS_PASSWORD || '',
        },
    },
});
describe('SRE Basic Tests', () => {
    it('SRE Instance', async () => {
        expect(sre).toBeInstanceOf(SmythRuntime);
    });
    it('SRE exposes storage', async () => {
        const storageFromSRE = SmythRuntime.Instance.Storage;
        expect(storageFromSRE).toBeInstanceOf(S3Storage);
        expect(storageFromSRE.read).toBeTypeOf('function');
        expect(storageFromSRE.write).toBeTypeOf('function');
        expect(storageFromSRE.delete).toBeTypeOf('function');
        expect(storageFromSRE.exists).toBeTypeOf('function');
    });
    it('SRE exposes cache', async () => {
        const cacheFromSRE = SmythRuntime.Instance.Cache;
        expect(cacheFromSRE).toBeInstanceOf(RedisCache);
    });

    it('SRE returns Dummy Instance if not configured', async () => {
        const agentData: IAgentDataConnector = SmythRuntime.Instance.AgentData;
        const result = agentData.getAgentData('test', '1.0');
        expect(result).toBeUndefined();
    });
    it('Runs a simple Agent', async () => {
        let error;
        try {
            const sre = SmythRuntime.Instance;
            const agentData = fs.readFileSync('./tests/data/sre-openai-LLMPrompt.smyth', 'utf-8');
            const data = JSON.parse(agentData);
            const request = new AgentRequest({ method: 'POST', path: '/api/say', body: { message: 'Write a poem about flowers' } });
            const output = await sre.runAgent('test', { data, agentVersion: '1.0' }, request);
            expect(JSON.stringify(output)).toContain('flowers');
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });
});
