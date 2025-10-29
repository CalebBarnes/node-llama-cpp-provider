import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createNodeLlamaCppProvider } from "../../provider";
import path from "path";

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

export const localAgent = new Agent({
    name: "local-agent",
    instructions: "You are a helpful assistant.",
    memory: new Memory(),
    model: provider.chat(),
});
