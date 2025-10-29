/**
 * Example: Using the AI SDK provider (SIMPLIFIED - AUTO-INITIALIZING)
 * This shows how to use node-llama-cpp with Vercel AI SDK
 * The provider handles all initialization automatically!
 */

import chalk from "chalk";
import { createNodeLlamaCppProvider } from "../provider.js";
import { streamText, tool, stepCountIs } from "ai";
import z from "zod";

async function main() {
    const provider = createNodeLlamaCppProvider({
        model: "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
        modelId: "gpt-oss-20b",
        contextSize: 8096,
    });

    const myTool = tool({
        description: "My tool that greets someone",
        inputSchema: z.object({ name: z.string() }),
        outputSchema: z.object({ result: z.string() }),
        execute: (args) => {
            return {
                result: `Hello ${args.name}! This is the result of the "myTool" tool call.`,
            };
        },
    });

    const chatModel = provider.chat();

    const call = async (prompt: string) => {
        console.log(chalk.blue("calling streamText\n"));
        let stepNum = 0;
        const { fullStream } = streamText({
            model: chatModel,
            prompt,
            tools: { myTool },
            stopWhen: stepCountIs(3),
            onStepFinish: (step) => {
                stepNum++;
                console.log(
                    chalk.yellow(`\n[Step ${stepNum} finished]`),
                    "- finish reason:",
                    step.finishReason
                );
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
    };

    await call("What is the capital of France?");
    await call("Did you see this message twice or only once?");
}

main().catch((error) => {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
});
