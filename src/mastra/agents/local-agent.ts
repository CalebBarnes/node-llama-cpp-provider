import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createTool } from "@mastra/core";
import { llama } from "../../provider";
import path from "path";

const cwd = process.cwd();

const modelsDirectory = cwd.endsWith(".mastra/output")
    ? path.join(cwd, "../../models")
    : "./models";

const nameTool = createTool({
    id: "nameTool",
    description: "Get the name of the user",
    execute: async () => {
        return "Caleb";
    },
});

export const localAgent = new Agent({
    name: "local-agent",
    instructions: "You are a helpful assistant.",
    memory: new Memory(),
    model: llama("hf:unsloth/gpt-oss-20b-GGUF/gpt-oss-20b-F16.gguf", {
        modelsDirectory,
    }),
    tools: {
        nameTool,
    },
});
