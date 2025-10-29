import chalk from "chalk";
import type {
    LanguageModelV2,
    LanguageModelV2StreamPart,
    LanguageModelV2FunctionTool,
    LanguageModelV2ProviderDefinedTool,
    LanguageModelV2Prompt,
} from "@ai-sdk/provider";
import {
    getLlama,
    type LlamaChatSession,
    type LlamaModel,
    type LlamaContext,
    resolveModelFile,
    defineChatSessionFunction,
    type ChatSessionModelFunctions,
} from "node-llama-cpp";
import path from "path";
import { randomUUID } from "crypto";

export interface NodeLlamaCppProviderConfig {
    /**
     * Model identifier (for display purposes)
     */
    modelId?: string;

    /**
     * Provider identifier (for display purposes)
     */
    providerId?: string;

    /**
     * Path or HuggingFace model identifier
     * Example: "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf"
     * Example: "/path/to/model.gguf"
     */
    model: string;

    /**
     * Directory to store downloaded models
     * Default: "./models"
     */
    modelsDirectory?: string;

    /**
     * The number of tokens the model can see at once.
     * - **`"auto"`** - adapt to the current VRAM state and attemp to set the context size as high as possible up to the size
     * the model was trained on.
     * - **`number`** - set the context size to a specific number of tokens.
     * If there's not enough VRAM, an error will be thrown.
     * Use with caution.
     * - **`{min?: number, max?: number}`** - adapt to the current VRAM state and attemp to set the context size as high as possible
     * up to the size the model was trained on, but at least `min` and at most `max`.
     *
     * Defaults to `"auto"`.
     */
    contextSize?: "auto" | number | { min?: number; max?: number };

    /**
     * GPU layers to offload (for GPU acceleration)
     */
    gpuLayers?: number;

    /**
     * If you already have a session, you can pass it directly
     * This will skip model initialization
     */
    session?: LlamaChatSession;

    /**
     * If you have your own model/context, pass them here
     */
    llamaModel?: LlamaModel;
    llamaContext?: LlamaContext;
}

export class NodeLlamaCppProvider {
    readonly modelId: string;
    readonly providerId: string;
    private session: LlamaChatSession | null = null;
    private llamaModel: LlamaModel | null = null;
    private llamaContext: LlamaContext | null = null;
    private config: NodeLlamaCppProviderConfig;
    private initPromise: Promise<void> | null = null;

    constructor(config: NodeLlamaCppProviderConfig) {
        this.config = config;
        if (config.modelId) {
            this.modelId = config.modelId;
        } else {
            this.modelId = config.model.split("/").slice(1).join("/");
        }

        if (config.providerId) {
            this.providerId = config.providerId;
        } else {
            let providerId = "node-llama-cpp";
            if (config.model.startsWith("hf:")) {
                providerId = "🤗 Hugging Face";
            }
            this.providerId = providerId;
        }

        // If session is provided, use it
        if (config.session) {
            this.session = config.session;
        }

        // If model and context are provided, use them
        if (config.llamaModel) this.llamaModel = config.llamaModel;
        if (config.llamaContext) this.llamaContext = config.llamaContext;
    }

    /**
     * Initialize the model (lazy loading)
     */
    private async initialize(): Promise<void> {
        if (this.session) {
            return; // Already initialized
        }

        // Prevent multiple initializations
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            const llama = await getLlama();

            const cwd = process.cwd();
            // Resolve model path
            const modelsDir =
                this.config.modelsDirectory || path.join(cwd, "models");

            const modelPath = await resolveModelFile(
                this.config.model,
                modelsDir
            );

            // Load model if not provided
            if (!this.llamaModel) {
                console.log(
                    `${chalk.blue("ℹ")} Loading model: ${this.config.model}`
                );
                this.llamaModel = await llama.loadModel({
                    modelPath,
                    gpuLayers: this.config.gpuLayers,
                });
                const bytes = this.llamaModel?.fileInsights?.modelSize;
                const gigabytes = bytes / 1024 / 1024 / 1024;
                console.log(
                    `${chalk.green("✔")} Model loaded ${
                        bytes ? `${gigabytes.toFixed(2)} GB` : ""
                    }`
                );
            }

            // Create context if not provided
            if (!this.llamaContext) {
                this.llamaContext = await this.llamaModel.createContext({
                    contextSize: this.config.contextSize,
                });
            }

            // Create session
            this.session = new (
                await import("node-llama-cpp")
            ).LlamaChatSession({
                contextSequence: this.llamaContext.getSequence(),
            });
        })();

        return this.initPromise;
    }

    /**
     * Get the chat model (auto-initializes if needed)
     */
    chat(modelId?: string): LanguageModelV2 {
        return new NodeLlamaCppLanguageModel({
            provider: this,
            modelId: modelId || this.modelId,
            providerId: this.providerId,
        });
    }

    /**
     * Get the session (initializes if needed)
     */
    async getSession(): Promise<LlamaChatSession> {
        await this.initialize();
        if (!this.session) {
            throw new Error("Session not initialized");
        }
        return this.session;
    }
}

class NodeLlamaCppLanguageModel implements LanguageModelV2 {
    readonly specificationVersion = "v2" as const;
    readonly modelId: string;
    readonly provider: string;
    readonly supportedUrls = {};
    private providerInstance: NodeLlamaCppProvider;

    constructor(settings: {
        provider: NodeLlamaCppProvider;
        modelId: string;
        providerId: string;
    }) {
        this.providerInstance = settings.provider;
        this.modelId = settings.modelId;
        this.provider = settings.providerId;
    }

    private extractPromptText(
        prompt: Parameters<LanguageModelV2["doGenerate"]>[0]["prompt"]
    ): string {
        // prompt is an array of messages
        const lastMessage = prompt[prompt.length - 1];

        if (!lastMessage) {
            return "";
        }

        const content = lastMessage.content;
        if (Array.isArray(content)) {
            // Extract text from content parts
            return content
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
        } else if (typeof content === "string") {
            return content;
        }

        return "";
    }

    /**
     * Convert AI SDK prompt messages to node-llama-cpp chat history format
     * This allows us to properly handle multi-turn conversations with tool calls
     */
    private convertToLlamaChatHistory(prompt: LanguageModelV2Prompt): any[] {
        const history: any[] = [];

        for (const message of prompt) {
            switch (message.role) {
                case "system":
                    // System messages typically go at the start
                    history.push({
                        type: "system",
                        text:
                            typeof message.content === "string"
                                ? message.content
                                : message.content,
                    });
                    break;

                case "user": {
                    // Extract text from user message content
                    const text = message.content
                        .map((part) => (part.type === "text" ? part.text : ""))
                        .join("");

                    history.push({
                        type: "user",
                        text: text,
                    });
                    break;
                }

                case "assistant": {
                    // Assistant messages can contain text, reasoning, and tool calls
                    const modelResponse: any = {
                        type: "model",
                        response: [],
                    };

                    for (const part of message.content) {
                        if (part.type === "text") {
                            // Regular text response
                            modelResponse.response.push(part.text);
                        } else if (part.type === "reasoning") {
                            // Reasoning/thinking text (for models like GPT-OSS)
                            // Add as a thought segment
                            modelResponse.response.push({
                                type: "segment",
                                segmentType: "thought",
                                text: part.text,
                            });
                        } else if (part.type === "tool-call") {
                            // Tool call made by the assistant
                            modelResponse.response.push({
                                type: "functionCall",
                                name: part.toolName,
                                params: part.input,
                                // result will be added when we see the tool message
                            });
                        }
                    }

                    history.push(modelResponse);
                    break;
                }

                case "tool": {
                    // Tool results - need to add results to the previous function calls
                    // In node-llama-cpp, function results are part of the model response
                    for (const part of message.content) {
                        if (part.type === "tool-result") {
                            // Find the corresponding function call in the last model response
                            // and add the result to it
                            const lastModelResponse = history
                                .slice()
                                .reverse()
                                .find((h) => h.type === "model");

                            if (lastModelResponse) {
                                const functionCall =
                                    lastModelResponse.response.find(
                                        (r: any) =>
                                            r.type === "functionCall" &&
                                            r.name === part.toolName &&
                                            !r.result
                                    );

                                if (functionCall) {
                                    functionCall.result =
                                        part.output.type === "json"
                                            ? part.output.value
                                            : part.output;
                                }
                            }
                        }
                    }
                    break;
                }

                default:
                    console.warn(`Unsupported message role: ${message.role}`);
            }
        }

        return history;
    }

    /**
     * Convert AI SDK tools to node-llama-cpp functions that coordinate with AI SDK.
     * The onToolCall callback is called when a tool is invoked and should handle
     * emitting the necessary events and aborting generation.
     */
    private convertTools({
        tools = [],
        abortController,
        onToolCall,
    }: {
        tools: Array<
            LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
        >;
        abortController: AbortController;
        onToolCall: (toolName: string, params: any) => void;
    }): ChatSessionModelFunctions {
        const functions: Record<string, any> = {};

        for (const tool of tools) {
            if (tool.type !== "function") continue;
            if (!("inputSchema" in tool)) continue;

            functions[tool.name] = defineChatSessionFunction({
                description: tool.description || "",
                params: tool.inputSchema as any,
                async handler(params: any) {
                    console.log(`[Tool handler called: ${tool.name}]`, params);

                    // Call the callback - this will emit events and handle the tool call
                    onToolCall(tool.name, params);

                    // Abort generation so AI SDK can execute the tool
                    console.log(`[Aborting generation for tool: ${tool.name}]`);
                    abortController.abort("tool-call-detected");

                    // Return value doesn't matter since we aborted
                    return {
                        _aborted: true,
                        toolName: tool.name,
                        params: params,
                    };
                },
            });
        }

        return functions as ChatSessionModelFunctions;
    }

    async doGenerate(
        options: Parameters<LanguageModelV2["doGenerate"]>[0]
    ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
        const session = await this.providerInstance.getSession();

        console.log("\n\n========== doGenerate called ==========");
        console.log("Prompt has", options.prompt.length, "messages");

        // Extract text from prompt messages
        const promptText = this.extractPromptText(options.prompt);

        // Track tool calls that trigger during generation
        const toolCallsTriggered: Array<{
            name: string;
            params: any;
            toolCallId: string;
        }> = [];

        // AbortController to stop generation when a tool is called
        const abortController = new AbortController();

        // Convert AI SDK tools with abort support
        let functions: ChatSessionModelFunctions | undefined = undefined;

        if (options.tools && options.tools.length > 0) {
            const functionsRecord: Record<string, any> = {};

            for (const tool of options.tools) {
                if (tool.type !== "function") continue;
                if (!("inputSchema" in tool)) continue;

                functionsRecord[tool.name] = defineChatSessionFunction({
                    description: tool.description || "",
                    params: tool.inputSchema as any,
                    async handler(params: any) {
                        console.log(
                            `[doGenerate: Tool handler called: ${tool.name}]`,
                            params
                        );

                        // Track the tool call
                        toolCallsTriggered.push({
                            name: tool.name,
                            params: params,
                            toolCallId: randomUUID(),
                        });

                        // Abort the generation
                        console.log(
                            `[doGenerate: Aborting generation for tool: ${tool.name}]`
                        );
                        abortController.abort("tool-call-detected");

                        return {
                            _aborted: true,
                            toolName: tool.name,
                            params: params,
                        };
                    },
                });
            }

            functions = functionsRecord as ChatSessionModelFunctions;
        }

        // Call node-llama-cpp with promptWithMeta
        const result = await session.promptWithMeta(promptText, {
            temperature: options.temperature,
            topP: options.topP,
            maxTokens: options.maxOutputTokens,
            customStopTriggers: options.stopSequences,
            signal: abortController.signal,
            stopOnAbortSignal: true,
            functions,
        });

        // Check if we aborted due to tool calls
        if (toolCallsTriggered.length > 0) {
            console.log(
                `[doGenerate: Generation was aborted for ${toolCallsTriggered.length} tool call(s)]`
            );

            const toolCalls = toolCallsTriggered.map((tc) => ({
                type: "tool-call" as const,
                toolCallId: tc.toolCallId,
                toolName: tc.name,
                args: tc.params,
            }));

            return {
                content: toolCalls,
                finishReason: "tool-calls",
                usage: {
                    inputTokens: undefined,
                    outputTokens: undefined,
                    totalTokens: undefined,
                },
                warnings: [],
            };
        }

        // Regular text response
        return {
            content: [
                { type: "text", text: result.responseText || result.response },
            ],
            finishReason: "stop",
            usage: {
                inputTokens: undefined,
                outputTokens: undefined,
                totalTokens: undefined,
            },
            warnings: [],
        };
    }

    async doStream(
        options: Parameters<LanguageModelV2["doStream"]>[0]
    ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
        const session = await this.providerInstance.getSession();

        // Check if this is a continuation with tool results
        const hasToolResults = options.prompt.some(
            (msg) =>
                msg.role === "tool" ||
                (Array.isArray(msg.content) &&
                    msg.content.some((c: any) => c.type === "tool-result"))
        );

        // Convert AI SDK prompt to llama chat history and set it on the session
        // This allows the model to see the full conversation context including tool results
        if (options.prompt.length > 1 || hasToolResults) {
            const chatHistory = this.convertToLlamaChatHistory(options.prompt);
            // Set the chat history on the session
            session.setChatHistory(chatHistory);
        }

        // For continuation (has tool results), we don't need to prompt with text
        // The session already has the full history, we just need to continue generation
        const promptText = hasToolResults
            ? ""
            : this.extractPromptText(options.prompt);

        // Track if tool calling triggered an abort
        let toolCallAborted = false;

        // AbortController to stop generation when a tool is called
        const abortController = new AbortController();

        const textId = randomUUID();
        const reasoningId = randomUUID();
        const self = this;
        const stream = new ReadableStream<LanguageModelV2StreamPart>({
            async start(controller) {
                try {
                    let textStartSent = false;
                    let textEndSent = false;

                    await session.promptWithMeta(promptText, {
                        temperature: options.temperature,
                        topP: options.topP,
                        maxTokens: options.maxOutputTokens,
                        customStopTriggers: options.stopSequences,
                        signal: abortController.signal,
                        stopOnAbortSignal: true,
                        functions: self.convertTools({
                            tools: options.tools || [],
                            abortController,
                            onToolCall: (toolName: string, params: any) => {
                                console.log(
                                    `[Tool call triggered: ${toolName}]`,
                                    params
                                );

                                // Close any open text/reasoning streams
                                if (textStartSent && !textEndSent) {
                                    controller.enqueue({
                                        type: "text-end",
                                        id: textId,
                                    });
                                    textEndSent = true;
                                }

                                // Emit the tool-call event
                                const toolCallId = randomUUID();
                                controller.enqueue({
                                    type: "tool-call",
                                    toolCallId: toolCallId,
                                    toolName: toolName,
                                    input: JSON.stringify(params),
                                });

                                // Emit finish event with tool-calls reason
                                controller.enqueue({
                                    type: "finish",
                                    finishReason: "tool-calls",
                                    usage: {
                                        inputTokens: undefined,
                                        outputTokens: undefined,
                                        totalTokens: undefined,
                                    },
                                });

                                // Mark that we're aborting due to tool call
                                toolCallAborted = true;
                            },
                        }),
                        onTextChunk(chunk: string) {
                            if (!chunk) return;
                            // Send text-start before first chunk
                            if (!textStartSent) {
                                controller.enqueue({
                                    type: "text-start",
                                    id: textId,
                                });
                                textStartSent = true;
                            }
                            controller.enqueue({
                                type: "text-delta",
                                id: textId,
                                delta: chunk,
                            });
                        },

                        onResponseChunk: (chunk) => {
                            if (
                                chunk.type === "segment" &&
                                chunk.segmentType === "thought"
                            ) {
                                if (chunk.segmentStartTime) {
                                    controller.enqueue({
                                        type: "reasoning-start",
                                        id: reasoningId,
                                    });
                                }
                                if (chunk.segmentEndTime) {
                                    controller.enqueue({
                                        type: "reasoning-end",
                                        id: reasoningId,
                                    });
                                }
                                if (chunk.text) {
                                    controller.enqueue({
                                        type: "reasoning-delta",
                                        id: reasoningId,
                                        delta: chunk.text,
                                    });
                                }
                            }
                        },
                    });

                    // If we aborted for a tool call, events were already emitted
                    if (toolCallAborted) {
                        controller.close();
                        return;
                    }

                    // Regular text response - close any open streams
                    if (textStartSent && !textEndSent) {
                        controller.enqueue({
                            type: "text-end",
                            id: textId,
                        });
                        textEndSent = true;
                    }

                    controller.enqueue({
                        type: "finish",
                        finishReason: "stop",
                        usage: {
                            inputTokens: undefined,
                            outputTokens: undefined,
                            totalTokens: undefined,
                        },
                    });

                    controller.close();
                } catch (error) {
                    // Check if this was an abort triggered by tool calling
                    if (toolCallAborted) {
                        console.log(
                            "[Generation aborted due to tool call - events already emitted]"
                        );
                        controller.close();
                        return;
                    }

                    // Not a tool call abort - it's a real error
                    controller.error(error);
                }
            },
        });

        return {
            stream,
        };
    }
}

/**
 * Helper function to create a provider (simplified API)
 */
export function createNodeLlamaCppProvider(
    config: NodeLlamaCppProviderConfig
): NodeLlamaCppProvider {
    return new NodeLlamaCppProvider(config);
}
