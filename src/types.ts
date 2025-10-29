/**
 * OpenAI-compatible types for chat completions
 */

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "function";
    content: string;
    name?: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
}

export interface ChatCompletionChoice {
    index: number;
    message: ChatMessage;
    finish_reason: "stop" | "length" | "function_call" | null;
}

export interface ChatCompletionResponse {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: ChatCompletionChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ChatCompletionStreamChunk {
    id: string;
    object: "chat.completion.chunk";
    created: number;
    model: string;
    choices: {
        index: number;
        delta: {
            role?: "assistant";
            content?: string;
        };
        finish_reason: "stop" | "length" | null;
    }[];
}

export interface ModelInfo {
    id: string;
    object: "model";
    created: number;
    owned_by: string;
}

export interface ModelsListResponse {
    object: "list";
    data: ModelInfo[];
}
