import chalk from "chalk";
import { mastra } from "../mastra";
import z from "zod";

const agent = mastra.getAgent("localAgent");

async function main() {
    const output = await agent.stream("My name is Caleb. Whats my name?", {
        structuredOutput: {
            schema: z.object({
                name: z.string(),
            }),
        },
    });

    for await (const chunk of output.fullStream) {
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
            process.stdout.write(chalk.green(chunk.payload.text));
            continue;
        }
        if (chunk.type === "reasoning-delta") {
            process.stdout.write(chalk.italic(chalk.cyan(chunk.payload.text)));
            continue;
        } else {
            console.log(chunk);
        }
    }
}
main();
