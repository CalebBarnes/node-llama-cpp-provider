/**
 * Example: Using the handler functions directly (local/in-process)
 * This shows how to use the OpenAI-compatible functions without running a server
 */

import { fileURLToPath } from "url";
import path from "path";
import chalk from "chalk";
import { getLlama, LlamaChatSession, resolveModelFile } from "node-llama-cpp";
import { handleChatCompletion } from "../api/openai-handler.js";
import type { ChatCompletionRequest } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDirectory = path.join(__dirname, "..", "models");

async function main() {
    // Initialize model
    console.log(chalk.yellow("Initializing llama.cpp..."));
    const llama = await getLlama();

    console.log(chalk.yellow("Resolving model file..."));
    const modelPath = await resolveModelFile(
        "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
        modelsDirectory
    );

    console.log(chalk.yellow("Loading model..."));
    const model = await llama.loadModel({ modelPath });

    console.log(chalk.yellow("Creating context..."));
    const context = await model.createContext({
        contextSize: { max: 8096 },
    });

    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
    });

    console.log(chalk.green("Model ready!\n"));

    // Use the OpenAI-compatible handler directly
    const request: ChatCompletionRequest = {
        model: "gpt-oss-20b",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "What is the capital of France?" },
        ],
        temperature: 0.7,
        max_tokens: 100,
    };

    console.log(chalk.blue("Sending request:"));
    console.log(JSON.stringify(request, null, 2));
    console.log();

    console.log(chalk.yellow("Getting response...\n"));
    const response = await handleChatCompletion(session, request);

    console.log(chalk.green("Response:"));
    console.log(JSON.stringify(response, null, 2));
    console.log();

    console.log(chalk.blue("Assistant:"), response.choices[0].message.content);
}

main().catch((error) => {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
});
