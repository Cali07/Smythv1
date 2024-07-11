import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { FunctionCallingMode } from '@google/generative-ai';

import { BinaryInput } from '@sre/helpers/BinaryInput.helper';

export type LLMParams = {
    apiKey?: string; // for all
    temperature?: number; // for all
    max_tokens?: number; // for OpenAI, cohere, together.ai, Claude
    maxOutputTokens?: number; // for GoogleAI
    stop?: string[] | null; // for OpenAI, together.ai
    stop_sequences?: string[] | null; // for cohere, Claude
    top_p?: number; // for OpenAI, together.ai, Claude
    top_k?: number; // for together.ai, Claude
    topP?: number; // for GoogleAI
    topK?: number; // for GoogleAI
    p?: number; // Top P for cohere
    k?: number; // Top K for cohere
    frequency_penalty?: number; // for OpenAI, cohere
    repetition_penalty?: number; // Frequency Penalty for together.ai
    presence_penalty?: number; // for OpenAI, cohere
    sources?: BinaryInput[];
};

export type TLLMModelEntry = {
    llm: string;
    tokens?: number;
    completionTokens?: number;
    enabled?: boolean;
    components?: string[];
    alias?: string;
    tags?: string[];
    keyOptions?: {
        tokens: number;
        completionTokens: number;
    };
};

export type TLLMModel = {
    llmName: string;
    modelId: string;
    tokens: number;
    completionTokens: number;
    components: string[];
    tags: string[];
};

//#region === LLM Tools ===========================
export interface ToolInfo {
    index: number;
    id: string;
    type: 'function';
    name: string;
    arguments: string;
    role: 'user' | 'tool';
}

export interface ToolData extends ToolInfo {
    result: string;
}

export interface AnthropicToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
    };
}
export type ToolDefinition = OpenAI.ChatCompletionTool | AnthropicToolDefinition;
export type ToolChoice = OpenAI.ChatCompletionToolChoiceOption | FunctionCallingMode;

export interface ToolsConfig {
    tools?: ToolDefinition[];
    tool_choice?: ToolChoice;
}

//#endregion
