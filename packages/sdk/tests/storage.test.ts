// prettier-ignore-file
import { SRE } from '@smythos/sre';
import { LLM, LLMInstance, Agent, StorageInstance, Component, Storage } from '../src/index';
import { expect, describe, it } from 'vitest';

// declare module '../src/types/generated/Storage.types' {
//     interface IStorageProviders {
//         MyCustomProvider: 'MyCustomProvider';
//         AnotherProvider: 'AnotherProvider';
//     }
// }

describe('SDK Storage Tests', () => {
    it('Standalone Write file', async () => {
        //const localStorage = new StorageInstance(TStorageProvider.LocalStorage);

        const localStorage = Storage.LocalStorage();
        

        const result = await localStorage.write('test.txt', 'Hello, world!');

        console.log('done');
        expect(result).toBeDefined();
    });

    it('Agent Writes file', async () => {
        const agent = new Agent({
            name: 'Test Agent',
            model: 'gpt-4o',
            teamId: '123456',
        });

        const localStorage = agent.storage.LocalStorage({});

        

        const result = await localStorage.write('test2', 'Test Agent');

        console.log('done');
        expect(result).toBeDefined();
    });
});
