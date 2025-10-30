import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createTool } from "@mastra/core";
import { llama } from "../../provider";

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
    model: llama("hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf"),
    // model: llama("hf:unsloth/gpt-oss-20b-GGUF/gpt-oss-20b-F16.gguf"),
    tools: {
        nameTool,
    },
});
