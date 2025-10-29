/**
 * OpenAI-compatible chat completion handler
 * This module provides pure functions that can be used directly or via API
 */

import type { LlamaChatSession } from "node-llama-cpp";
import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
    ChatMessage,
} from "./types.js";

/**
 * Generate a unique ID for chat completion responses
 */
function generateId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Convert OpenAI messages to a prompt string for node-llama-cpp
 */
function messagesToPrompt(messages: ChatMessage[]): string {
    // Simple conversion - you may want to customize this based on your model
    return messages
        .map((msg) => {
            const role = msg.role === "system" ? "System" : msg.role === "user" ? "User" : "Assistant";
            return `${role}: ${msg.content}`;
        })
        .join("\n\n");
}

/**
 * Handle non-streaming chat completion
 */
export async function handleChatCompletion(
    session: LlamaChatSession,
    request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
    const id = generateId();
    const created = Math.floor(Date.now() / 1000);

    // Get the last user message
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    // Call node-llama-cpp
    const response = await session.prompt(prompt, {
        maxTokens: request.max_tokens,
        temperature: request.temperature,
        topP: request.top_p,
        customStopTriggers: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
    });

    // Format as OpenAI response
    return {
        id,
        object: "chat.completion",
        created,
        model: request.model,
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: response,
                },
                finish_reason: "stop",
            },
        ],
        usage: {
            prompt_tokens: 0, // node-llama-cpp doesn't expose this easily
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
}

/**
 * Handle streaming chat completion
 * Returns an async generator that yields SSE-formatted strings
 */
export async function* handleStreamingChatCompletion(
    session: LlamaChatSession,
    request: ChatCompletionRequest
): AsyncGenerator<string, void, unknown> {
    const id = generateId();
    const created = Math.floor(Date.now() / 1000);

    // Get the last user message
    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    let isFirst = true;

    // Stream the response
    await session.prompt(prompt, {
        maxTokens: request.max_tokens,
        temperature: request.temperature,
        topP: request.top_p,
        customStopTriggers: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
        onTextChunk(chunk) {
            const streamChunk: ChatCompletionStreamChunk = {
                id,
                object: "chat.completion.chunk",
                created,
                model: request.model,
                choices: [
                    {
                        index: 0,
                        delta: isFirst ? { role: "assistant", content: chunk } : { content: chunk },
                        finish_reason: null,
                    },
                ],
            };
            isFirst = false;

            // Format as SSE
            return `data: ${JSON.stringify(streamChunk)}\n\n`;
        },
    });

    // Send final chunk
    const finalChunk: ChatCompletionStreamChunk = {
        id,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
            {
                index: 0,
                delta: {},
                finish_reason: "stop",
            },
        ],
    };

    yield `data: ${JSON.stringify(finalChunk)}\n\n`;
    yield "data: [DONE]\n\n";
}

/**
 * Streaming version that collects chunks and calls a callback
 * This is more convenient for use in Express
 */
export async function handleStreamingChatCompletionWithCallback(
    session: LlamaChatSession,
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
): Promise<void> {
    const id = generateId();
    const created = Math.floor(Date.now() / 1000);

    const lastMessage = request.messages[request.messages.length - 1];
    const prompt = lastMessage.content;

    let isFirst = true;

    await session.prompt(prompt, {
        maxTokens: request.max_tokens,
        temperature: request.temperature,
        topP: request.top_p,
        customStopTriggers: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
        onTextChunk(chunk) {
            const streamChunk: ChatCompletionStreamChunk = {
                id,
                object: "chat.completion.chunk",
                created,
                model: request.model,
                choices: [
                    {
                        index: 0,
                        delta: isFirst ? { role: "assistant", content: chunk } : { content: chunk },
                        finish_reason: null,
                    },
                ],
            };
            isFirst = false;

            onChunk(`data: ${JSON.stringify(streamChunk)}\n\n`);
        },
    });

    // Send final chunk
    const finalChunk: ChatCompletionStreamChunk = {
        id,
        object: "chat.completion.chunk",
        created,
        model: request.model,
        choices: [
            {
                index: 0,
                delta: {},
                finish_reason: "stop",
            },
        ],
    };

    onChunk(`data: ${JSON.stringify(finalChunk)}\n\n`);
    onChunk("data: [DONE]\n\n");
}
