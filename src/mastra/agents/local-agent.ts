import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createNodeLlamaCppProvider } from "../../provider";

const provider = createNodeLlamaCppProvider({
    model: "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
    modelId: "gpt-oss-20b",
    contextSize: 8096,
    modelsDirectory: "../../models",
});

export const localAgent = new Agent({
    name: "local-agent",
    instructions: "You are a helpful assistant.",
    memory: new Memory(),
    model: provider.chat(),
});
