/**
 * Example: Calling the OpenAI-compatible API server
 * This shows how to use the server as a REST API (run server.ts first)
 */

import chalk from "chalk";

const API_BASE_URL = "http://localhost:3000";

async function testChatCompletion() {
    console.log(chalk.blue("Testing /v1/chat/completions endpoint\n"));

    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-oss-20b",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "What is 2 + 2?" },
            ],
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    console.log(chalk.green("Response:"));
    console.log(JSON.stringify(data, null, 2));
    console.log();
}

async function testStreamingCompletion() {
    console.log(chalk.blue("Testing streaming /v1/chat/completions endpoint\n"));

    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-oss-20b",
            messages: [{ role: "user", content: "Count from 1 to 5." }],
            temperature: 0.7,
            stream: true,
        }),
    });

    if (!response.body) {
        throw new Error("No response body");
    }

    console.log(chalk.green("Streaming response:"));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                    console.log(chalk.gray("\n[Stream completed]"));
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            process.stdout.write(content);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }

    console.log("\n");
}

async function testModels() {
    console.log(chalk.blue("Testing /v1/models endpoint\n"));

    const response = await fetch(`${API_BASE_URL}/v1/models`);
    const data = await response.json();

    console.log(chalk.green("Available models:"));
    console.log(JSON.stringify(data, null, 2));
    console.log();
}

async function main() {
    try {
        await testModels();
        await testChatCompletion();
        await testStreamingCompletion();
    } catch (error) {
        console.error(chalk.red("Error:"), error);
        process.exit(1);
    }
}

main();
