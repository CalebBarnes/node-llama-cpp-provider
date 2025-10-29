# node-llama-cpp AI SDK Provider

A fully-featured **[Vercel AI SDK](https://sdk.vercel.ai/)** provider for **[node-llama-cpp](https://node-llama-cpp.withcat.ai/)**, enabling you to run local LLMs with the Vercel AI SDK's ergonomic API.

## ✨ Features

- 🚀 **Auto-initializing** - No manual setup required
- 🔧 **Full AI SDK Integration** - Works seamlessly with `generateText`, `streamText`, and more
- 🛠️ **Multi-Step Tool Calling** - Complete support for tools with automatic execution
- 🤔 **Reasoning Support** - Separate thinking from final answers for reasoning models
- 📡 **Streaming & Non-Streaming** - Both modes fully supported
- 🎮 **GPU Acceleration** - Optional GPU layers for faster inference
- 🔌 **OpenAI-Compatible API** - Drop-in replacement for OpenAI API
- 📝 **TypeScript** - Fully typed for great DX

## 🚀 Quick Start


### Basic Usage

```typescript
import { createNodeLlamaCppProvider } from "./provider.js";
import { generateText } from "ai";

// Create provider - auto-initializes on first use
const provider = createNodeLlamaCppProvider({
    modelPath: "hf:username/model-name/model-file.gguf", // path to a hugging face model
    modelId: "my-model",
    contextSize: 8096,
});

// Generate text
const { text } = await generateText({
    model: provider.chat(),
    prompt: "Explain quantum computing in simple terms",
});

console.log(text);
```

### Streaming

```typescript
import { streamText } from "ai";

const { textStream } = streamText({
    model: provider.chat(),
    prompt: "Write a haiku about programming",
});

for await (const chunk of textStream) {
    process.stdout.write(chunk);
}
```

### Tool Calling (Multi-Step)

```typescript
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

const weatherTool = tool({
    description: "Get weather for a location",
    inputSchema: z.object({
        location: z.string(),
    }),
    execute: async ({ location }) => ({
        temperature: 72,
        condition: "sunny",
        location,
    }),
});

const { text } = await generateText({
    model: provider.chat(),
    prompt: "What's the weather in San Francisco?",
    tools: { weatherTool },
    stopWhen: stepCountIs(5), // Allow up to 5 steps
});

console.log(text);
// Output: "The weather in San Francisco is currently sunny with a temperature of 72°F."
```

### Reasoning Models

```typescript
import { streamText } from "ai";

const { fullStream } = streamText({
    model: provider.chat(),
    prompt: "Solve: If a train leaves at 2pm going 60mph...",
});

for await (const chunk of fullStream) {
    if (chunk.type === "reasoning-delta") {
        console.log("💭 Thinking:", chunk.text);
    }
    if (chunk.type === "text-delta") {
        console.log("📝 Answer:", chunk.text);
    }
}
```

## 📖 Configuration

### Provider Options

```typescript
createNodeLlamaCppProvider({
    // Required: Path to GGUF model (supports HuggingFace)
    modelPath: "hf:username/repo/file.gguf",

    // Required: Model identifier for AI SDK
    modelId: "my-model",

    // Optional: Context window size
    contextSize: 8096,

    // Optional: Directory to store downloaded models
    modelsDirectory: "./models",

    // Optional: Number of GPU layers to offload
    gpuLayers: 32,
});
```

### Supported HuggingFace Models

You can use any GGUF model from HuggingFace:

```typescript
// Mistral 7B
modelPath: "hf:TheBloke/Mistral-7B-Instruct-v0.2-GGUF/mistral-7b-instruct-v0.2.Q4_K_M.gguf"

// Llama 3
modelPath: "hf:QuantFactory/Meta-Llama-3-8B-Instruct-GGUF/Meta-Llama-3-8B-Instruct.Q4_K_M.gguf"

// Qwen 2.5
modelPath: "hf:Qwen/Qwen2.5-7B-Instruct-GGUF/qwen2.5-7b-instruct-q4_k_m.gguf"

// DeepSeek R1 (reasoning model)
modelPath: "hf:deepseek-ai/DeepSeek-R1-Distill-Qwen-7B-GGUF/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf"
```

## 🛠️ Tool Calling

This provider fully supports multi-step tool calling, allowing the model to:
1. Reason about which tool to call
2. Call the tool with appropriate parameters
3. See the tool result
4. Continue reasoning or provide a final answer

### How It Works

1. **Model decides to call a tool** - Detection happens synchronously
2. **Generation aborts** - Provider emits tool-call event
3. **AI SDK executes the tool** - Your `execute` function runs
4. **Provider called again** - Full conversation history with tool results
5. **Model continues** - Sees tool result and generates response

### Example: Weather Agent

```typescript
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

const getCurrentWeather = tool({
    description: "Get current weather for a location",
    inputSchema: z.object({
        location: z.string().describe("City name"),
    }),
    execute: async ({ location }) => {
        // Call your weather API
        return {
            temperature: 72,
            condition: "sunny",
            location,
        };
    },
});

const { text, steps } = await generateText({
    model: provider.chat(),
    prompt: "What's the weather like in Tokyo and should I bring an umbrella?",
    tools: { getCurrentWeather },
    stopWhen: stepCountIs(5),
});

console.log("Steps taken:", steps.length);
console.log("Final answer:", text);
```

## 🎭 OpenAI-Compatible API Server

Run a local OpenAI-compatible API server:

```bash
npm run server
```

Then use it with any OpenAI-compatible client:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
    baseURL: "http://localhost:3000/v1",
    apiKey: "not-needed",
});

const response = await client.chat.completions.create({
    model: "gpt-oss-20b",
    messages: [{ role: "user", content: "Hello!" }],
    stream: true,
});

for await (const chunk of response) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

## 📁 Project Structure

```
src/
├── provider.ts              # Main AI SDK provider
├── server.ts                # OpenAI-compatible API server
├── example-ai-sdk.ts        # AI SDK examples
├── example-tools.ts         # Tool calling examples
├── example-local.ts         # Direct usage examples
└── example-api-client.ts    # API client examples
```

## 🔥 Advanced Features

### Session Reuse

The provider automatically reuses the same model session across calls for efficiency:

```typescript
const provider = createNodeLlamaCppProvider({...});

// These share the same underlying session
await generateText({ model: provider.chat(), prompt: "Hello" });
await generateText({ model: provider.chat(), prompt: "How are you?" });
```

### GPU Acceleration

Offload layers to GPU for faster inference:

```typescript
const provider = createNodeLlamaCppProvider({
    modelPath: "...",
    modelId: "my-model",
    gpuLayers: 32, // Offload 32 layers to GPU
});
```

### Reasoning Separation

For models that output thinking process (like DeepSeek R1, QwQ):

```typescript
const { fullStream } = streamText({
    model: provider.chat(),
    prompt: "Solve this complex problem...",
});

for await (const chunk of fullStream) {
    switch (chunk.type) {
        case "reasoning-start":
            console.log("🤔 Starting to think...");
            break;
        case "reasoning-delta":
            process.stdout.write(chalk.gray(chunk.text));
            break;
        case "reasoning-end":
            console.log("\n✅ Done thinking");
            break;
        case "text-delta":
            process.stdout.write(chunk.text);
            break;
    }
}
```

## 📚 Examples

### Run the examples:

```bash
# AI SDK integration
npm run example:ai-sdk

# Tool calling
npm run example:tools

# Direct usage
npm run example:local

# API client
npm run server  # In one terminal
npm run example:api-client  # In another
```

## 🎯 Supported AI SDK Features

| Feature | Status | Notes |
|---------|--------|-------|
| `generateText` | ✅ | Fully supported |
| `streamText` | ✅ | Fully supported |
| Tool calling | ✅ | Multi-step with `stopWhen` |
| Reasoning | ✅ | Separate thinking from answer |
| Temperature | ✅ | Full control |
| Top-P | ✅ | Full control |
| Max tokens | ✅ | Full control |
| Stop sequences | ✅ | Custom stop triggers |
| Streaming | ✅ | SSE format |
| Multi-modal | ❌ | Not yet supported |

## 🐛 Troubleshooting

### Model download fails
```bash
# Manually download with node-llama-cpp CLI
npx --no node-llama-cpp download --model hf:username/repo/file.gguf
```

### Out of memory
- Reduce `contextSize`
- Use a smaller quantized model (Q4_K_M instead of Q6_K)
- Reduce `gpuLayers` if using GPU

### Tool calling not working
- Make sure to use `stopWhen: stepCountIs(n)` not `maxSteps`
- Ensure your model supports function calling
- Some models require specific prompting for tools

### Generation is slow
- Increase `gpuLayers` if you have a GPU
- Use a smaller model
- Reduce `contextSize`

## 📖 Documentation
- [AI SDK Docs](https://sdk.vercel.ai/docs) - Official AI SDK documentation
- [node-llama-cpp Docs](https://node-llama-cpp.withcat.ai/) - node-llama-cpp documentation


## 📄 License

MIT

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) - Ergonomic AI SDK
- [node-llama-cpp](https://node-llama-cpp.withcat.ai/) - Node.js bindings for llama.cpp
- [llama.cpp](https://github.com/ggml-org/llama.cpp) - LLM inference in C/C++


