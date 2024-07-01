import Component from './Component.class';
import Agent from '@sre/AgentManager/Agent.class';
import Joi from 'joi';

export default class APIOutput extends Component {
    protected configSchema = Joi.object({
        format: Joi.string().valid('full', 'minimal').required().label('Output Format'),
    });
    public hasPostProcess = true;
    constructor() {
        super();
    }
    init() {}
    async process(input, config, agent: Agent) {
        await super.process(input, config, agent);
        const logger = this.createComponentLogger(agent, config.name);
        const _error = undefined;
        const Output = {};
        logger.debug(` Processing outputs `);
        for (let key in input) {
            Output[key] = input[key];
        }
        return { Output, _error, _debug: logger.output };
    }
    async postProcess(output, config, agent: Agent): Promise<any> {
        for (let agentVar in agent.agentVariables) {
            delete output?.result?.Output?.[agentVar]; //clean up agent variables from output
        }
        if (config?.data?.format == 'minimal') {
            if (output?.result?.Output) {
                return output?.result?.Output;
            }

            if (output?.result?._error) {
                return output?.result?._error;
            }

            delete output.id;
            delete output.name;
        }
        return output;
    }
}
