import Joi from 'joi';

import { JSONContentHelper } from '@sre/helpers/JsonContent.helper';
import { Component } from './Component.class';
import { Agent } from '@sre/AgentManager/Agent.class';
import { TemplateString } from '@sre/helpers/TemplateString.helper';
import { LLMInference } from '@sre/LLMManager/LLM.inference';
import { AccessCandidate } from '@sre/Security/AccessControl/AccessCandidate.class';

export class Classifier extends Component {
    protected schema = {
        name: 'Classifier',
        settings: {
            model: {
                type: 'string',
                max: 200,
                required: true,
            },
            prompt: {
                type: 'string',
                max: 30000,
                allow: '',
                label: 'Prompt',
            },
        },

        inputs: {
            Input: {
                type: 'Any',
                default: true,
            },
        },
    };
    protected configSchema = Joi.object({
        model: Joi.string().max(200).required(),
        prompt: Joi.string().max(30000).allow('').label('Prompt'),
    });
    constructor() {
        super();
    }
    init() {}
    escapeJSONString(str: string) {
        return str.replace(/\{/g, '<[<(').replace(/\}/g, ')>]>').replace(/"/g, '`');
    }
    unescapeJSONString(str: string) {
        return str
            .replace(/<\[<\(/g, '{')
            .replace(/\)>]>/g, '}')
            .replace(/`/g, '"');
    }
    async process(input, config, agent: Agent) {
        await super.process(input, config, agent);
        //let debugLog = agent.agentRuntime?.debug ? [] : undefined;
        const logger = this.createComponentLogger(agent, config);

        const inputCopy = JSON.parse(JSON.stringify(input));
        for (let key in inputCopy) {
            if (typeof inputCopy[key] === 'string') {
                inputCopy[key] = this.escapeJSONString(inputCopy[key]);
            } else if (typeof inputCopy[key] === 'object') {
                inputCopy[key] = JSON.stringify(inputCopy[key]);
                inputCopy[key] = this.escapeJSONString(inputCopy[key]);
            }
        }

        const _input = typeof input === 'string' ? input : JSON.stringify(inputCopy, null, 2);
        //const categories = config.outputs.map((output) => (output.name[0] != '[' ? output.name : null)).filter((e) => e);
        const categories = {};
        for (let con of config.outputs) categories[con.name] = con.description || '';

        const outputs = {};
        for (let con of config.outputs) {
            outputs[con.name] = '<Boolean|String>';
        }

        const model: string = config.data.model;
        const modelId = await agent.modelsProvider.getModelId(model);
        //const isStandardLLM = await agent.modelsProvider.isStandardLLM(model);

        logger.log(` Selected model : ${modelId || model}`);

        let prompt = '';
        const excludedKeys = ['_debug', '_error'];
        const outputKeys = Object.keys(outputs).filter((key) => !excludedKeys.includes(key));

        if (outputKeys.length > 0) {
            const outputFormat = {};
            outputKeys.forEach((key) => (outputFormat[key] = outputs[key]));

            prompt = `${config.data.prompt}
${_input}

---
Categories: 
${JSON.stringify(categories, null, 2)}`;

            prompt = TemplateString(prompt).parse(input).result;
        }

        logger.log(` Enhanced prompt \n${prompt}\n`);

        if (!prompt) {
            logger.error(` Missing information, Cannot run classifier`);

            return { _error: 'Missing information, Cannot run classifier', _debug: logger.output };
        }

        const llmInference: LLMInference = await LLMInference.getInstance(model || 'echo', AccessCandidate.agent(agent.id));
        if (!llmInference.connector) {
            return {
                _error: `The model '${model}' is not available. Please try a different one.`,
                _debug: logger.output,
            };
        }

        try {
            let response = await llmInference.promptRequest(prompt, config, agent).catch((error) => ({ error: error }));

            if (response?.error) {
                const error = response?.error + ' ' + (response?.details || '');
                logger.error(` LLM Error=`, error);

                return { _error: error, _debug: logger.output };
            }

            // let parsed = parseJson(response);
            let parsed = typeof response === 'string' ? JSONContentHelper.create(response).tryParse() : response;

            for (let entry in parsed) {
                if (!parsed[entry]) delete parsed[entry];
                else {
                    if (typeof parsed[entry] === 'string') {
                        parsed[entry] = this.unescapeJSONString(parsed[entry]);
                        // const parsedValue = parseJson(parsed[entry]);
                        const parsedValue = JSONContentHelper.create(parsed[entry]).tryParse();
                        if (typeof parsedValue === 'object' && !parsedValue.error) parsed[entry] = parsedValue;
                    }
                }
            }

            if (parsed.error) {
                parsed._error = parsed.error;
                logger.warn(` Post process error=${parsed.error}`);
                delete parsed.error;
            }

            logger.log(' Classifier result\n', parsed);

            parsed['_debug'] = logger.output;

            return parsed;
        } catch (error) {
            return { _error: error.message, _debug: logger.output };
        }
    }
}

export default Classifier;
