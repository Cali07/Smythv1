import Joi from 'joi';
import { validateInteger } from '../utils';
import { jsonrepair } from 'jsonrepair';
import { TemplateString } from '@sre/helpers/TemplateString.helper';
import { JSONContent } from '@sre/helpers/JsonContent.helper';
import { ConnectorService } from '@sre/Core/ConnectorsService';
import { AccessCandidate } from '@sre/Security/AccessControl/AccessCandidate.class';
import { IAgent as Agent } from '@sre/types/Agent.types';
import { Component } from './Component.class';

// Note: LLMHelper renamed to LLMInference
class LLMInference {
    static async getInstance(model: string) {
        throw new Error('Method not implemented.');
    }
}

export class DataSourceLookup extends Component {
    protected configSchema = Joi.object({
        topK: Joi.alternatives([Joi.string(), Joi.number()]) // Value is now a number; keep string fallback for backward compatibility.

            .custom(validateInteger({ min: 0 }), 'custom range validation')
            .label('Result Count'),
        model: Joi.string().valid('gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo-16k').optional(),
        prompt: Joi.string().max(30000).allow('').label('Prompt').optional(),
        postprocess: Joi.boolean().strict().optional(),
        includeMetadata: Joi.boolean().strict().optional(),
        namespace: Joi.string().allow('').max(80).messages({
            // Need to reserve 30 characters for the prefixed unique id
            'string.max': `The length of the 'namespace' name must be 50 characters or fewer.`,
        }),
        scoreThreshold: Joi.number().optional().allow('').label('Score Threshold'),
        includeScore: Joi.boolean().optional().allow('').label('Score Threshold'),
    });
    constructor() {
        super();
    }
    init() {}
    async process(input, config, agent: Agent) {
        await super.process(input, config, agent);
        const componentId = config.id;
        const component = agent.components[componentId];
        const teamId = agent.teamId;
        let debugOutput = agent.agentRuntime?.debug ? '== Data Source Lookup Log ==\n' : null;

        const outputs = {};
        for (let con of config.outputs) {
            if (con.default) continue;
            outputs[con.name] = '';
        }

        const namespace = config.data.namespace.split('_').slice(1).join('_') || config.data.namespace;
        const model = config.data?.model || 'gpt-4o-mini';
        const prompt = config.data?.prompt?.trim?.() || '';
        const postprocess = config.data?.postprocess || false;
        const includeMetadata = config.data?.includeMetadata || false;

        const scoreThreshold = config.data?.scoreThreshold || 0.001; // Use low score (0.001) to return most results for backward compatibility
        const includeScore = config.data?.includeScore || false;

        const _input = typeof input.Query === 'string' ? input.Query : JSON.stringify(input.Query);

        const topK = Math.max(config.data?.topK || 50, 50);

        let vectorDbConnector = ConnectorService.getVectorDBConnector();
        let existingNs = await vectorDbConnector.requester(AccessCandidate.team(teamId)).namespaceExists(namespace);

        if (!existingNs) {
            throw new Error(`Namespace ${namespace} does not exist`);
        }

        let results: string[] | { content: string; metadata: any; score?: number }[];
        let _error;
        try {
            const response = await vectorDbConnector
                .requester(AccessCandidate.team(teamId))
                .search(namespace, _input, { topK, includeMetadata: true });

            results = response.slice(0, config.data.topK).map((result) => ({
                content: result.text,
                metadata: result.metadata,
                score: result.score, // use a very low score to return
            }));

            results = results.filter((result) => result.score >= scoreThreshold);

            // Transform results based on inclusion flags
            results = results.map((result) => {
                const transformedResult: any = {
                    content: result.content,
                };

                if (includeMetadata) {
                    // legacy user-specific metadata key [result.metadata?.metadata]
                    transformedResult.metadata = this.parseMetadata(result.metadata || result.metadata?.metadata);
                }

                if (includeScore) {
                    transformedResult.score = result.score;
                }

                // If neither metadata nor score is included, return just the content string
                return includeMetadata || includeScore ? transformedResult : result.content;
            });

            debugOutput += `[Results] \nLoaded ${results.length} results from namespace: ${namespace}\n\n`;
        } catch (error) {
            _error = error.toString();
        }

        //is there a post processing LLM?

        //TODO : better handling of context window exceeding max length
        if (postprocess && prompt) {
            const promises: any = [];
            for (let result of results) {
                const _prompt = TemplateString(prompt.replace(/{{result}}/g, JSON.stringify(result))).parse(input).result;
                const llmInference = await LLMInference.getInstance(model);
                // const req = llmInference.prompt({ query: _prompt, params: { ...config, agentId: agent.id } }).catch((error) => ({ error: error }));
                // promises.push(req);
            }
            results = await Promise.all(promises);
            for (let i = 0; i < results.length; i++) {
                if (typeof results[i] === 'string') {
                    // results[i] = parseJson(results[i]);
                    results[i] = JSONContent(results[i] as string).tryParse();
                }
            }
        }

        const totalLength = JSON.stringify(results).length;
        debugOutput += `[Total Length] \n${totalLength}\n\n`;

        return {
            Results: results,
            _error,
            _debug: debugOutput,
            //_debug: `Query: ${_input}. \nTotal Length = ${totalLength} \nResults: ${JSON.stringify(results)}`,
        };
    }

    // private async checkIfTeamOwnsNamespace(teamId: string, namespaceId: string, token: string) {
    //     try {
    //         const res = await SmythAPIHelper.fromAuth({ token }).mwSysAPI.get(`/vectors/namespaces/${namespaceId}`);
    //         if (res.data?.namespace?.teamId !== teamId) {
    //             throw new Error(`Namespace does not exist`);
    //         }
    //         return true;
    //     } catch (err) {
    //         throw new Error(`Namespace does not exist`);
    //     }
    // }

    private parseMetadata(metadata: any) {
        try {
            return JSON.parse(jsonrepair(metadata));
        } catch (err) {
            return metadata;
        }
    }
}
