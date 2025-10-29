import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createNodeLlamaCppProvider } from "../../provider";
import path from "path";
import { createTool } from "@mastra/core";
import z from "zod";

const cwd = process.cwd();

const modelsDirectory = cwd.endsWith(".mastra/output")
    ? path.join(cwd, "../../models")
    : "./models";

const provider = createNodeLlamaCppProvider({
    // model: "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
    model: "hf:unsloth/gpt-oss-20b-GGUF/gpt-oss-20b-F16.gguf",
    // model: "hf:unsloth/gpt-oss-20b-GGUF/gpt-oss-20b-Q2_K.gguf",
    // modelsDirectory: "../../models",
    modelsDirectory,
});

const nameTool = createTool({
    id: "nameTool",
    description: "Get the name of the user",
    // inputSchema: z.object({}),
    // outputSchema: z.object({}),
    execute: async () => {
        return "Caleb";
    },
});

export const localAgent = new Agent({
    name: "local-agent",
    instructions: "You are a helpful assistant.",
    memory: new Memory(),
    model: provider.chat(),
    tools: {
        nameTool,
    },
});
