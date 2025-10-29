/**
 * Example: Using the AI SDK provider (SIMPLIFIED - AUTO-INITIALIZING)
 * This shows how to use node-llama-cpp with Vercel AI SDK
 * The provider handles all initialization automatically!
 */

import chalk from "chalk";
import { createNodeLlamaCppProvider } from "./provider.js";
import { generateText, streamText, tool, stepCountIs } from "ai";
import z from "zod";

async function main() {
    console.log(
        chalk.yellow("Creating provider (auto-initializes on first use)...\n")
    );

    // Create the AI SDK provider - just pass the model path!
    // No need to manually initialize llama, model, context, or session
    const provider = createNodeLlamaCppProvider({
        modelPath: "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
        modelId: "gpt-oss-20b",
        contextSize: 8096,
        // Optional: specify models directory (defaults to "./models")
        // modelsDirectory: "./models",
        // Optional: GPU acceleration
        // gpuLayers: 32,
    });

    const myTool = tool({
        description: "My tool that greets someone",
        inputSchema: z.object({ name: z.string() }),
        outputSchema: z.object({ result: z.string() }),
        execute: (args) => {
            console.log(chalk.magenta("\n[Tool executed: myTool]"), args);
            return {
                result: `Hello ${args.name}! Welcome to the tool calling system.`,
            };
        },
    });

    // Test: Streaming with multi-step tool calling
    console.log(chalk.blue("Testing streamText with multi-step tool calling\n"));
    let stepNum = 0;
    const { fullStream } = streamText({
        model: provider.chat(),
        prompt: "Call the myTool with name 'Caleb' and then explain what the greeting means",
        tools: { myTool },
        stopWhen: stepCountIs(3), // Limit to 3 steps to see if it generates final text
        onStepFinish: (step) => {
            stepNum++;
            console.log(chalk.yellow(`\n[Step ${stepNum} finished]`), "- finish reason:", step.finishReason);
        },
    });

    for await (const chunk of fullStream) {
        if (chunk.type === "reasoning-start") {
            console.log(chalk.bold("\nReasoning:"));
            continue;
        }
        if (chunk.type === "text-start") {
            console.log(chalk.bold("\nText:"));
            continue;
        }
        if (chunk.type === "reasoning-end" || chunk.type === "text-end") {
            console.log("\n");
            continue;
        }

        if (chunk.type === "text-delta") {
            process.stdout.write(chalk.green(chunk.text));
            continue;
        }
        if (chunk.type === "reasoning-delta") {
            process.stdout.write(chalk.italic(chalk.cyan(chunk.text)));
            continue;
        } else {
            console.log(chunk);
        }
    }

    console.log("\n");
}

main().catch((error) => {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
});
