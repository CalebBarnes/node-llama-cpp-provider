/**
 * Example: Using tools/function calling with node-llama-cpp
 * This demonstrates how to use function calling directly with node-llama-cpp
 */

import { fileURLToPath } from "url";
import path from "path";
import chalk from "chalk";
import { getLlama, resolveModelFile, defineChatSessionFunction, LlamaChatSession } from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDirectory = path.join(__dirname, "..", "models");

// Define a simple tool/function
const getCurrentWeather = defineChatSessionFunction({
    description: "Get the current weather in a given location",
    params: {
        type: "object",
        properties: {
            location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
            },
            unit: {
                oneOf: [
                    { type: "null" },
                    { enum: ["celsius", "fahrenheit"] },
                ],
            },
        },
    },
    async handler(params) {
        const unit = params.unit ?? "fahrenheit";
        const location = params.location;

        // Simulate API call
        console.log(chalk.gray(`\n[Function Called: getCurrentWeather(${location}, ${unit})]\n`));

        // Mock weather data
        const weatherData: Record<string, any> = {
            "San Francisco, CA": { temp: 72, condition: "sunny" },
            "New York, NY": { temp: 65, condition: "cloudy" },
            "London, UK": { temp: 55, condition: "rainy" },
        };

        const data = weatherData[location] || { temp: 70, condition: "unknown" };

        return {
            location: location,
            temperature: unit === "celsius" ? Math.round((data.temp - 32) * 5 / 9) : data.temp,
            unit: unit,
            condition: data.condition,
        };
    },
});

const getPopulation = defineChatSessionFunction({
    description: "Get the population of a city",
    params: {
        type: "object",
        properties: {
            city: {
                type: "string",
                description: "The city name",
            },
        },
    },
    async handler(params) {
        console.log(chalk.gray(`\n[Function Called: getPopulation(${params.city})]\n`));

        // Mock population data
        const populations: Record<string, number> = {
            "San Francisco": 873965,
            "New York": 8336817,
            "London": 8982000,
        };

        const population = populations[params.city] || 0;

        return {
            city: params.city,
            population: population,
        };
    },
});

async function main() {
    console.log(chalk.yellow("Initializing model...\n"));

    const llama = await getLlama();
    const modelPath = await resolveModelFile(
        "hf:giladgd/gpt-oss-20b-GGUF/gpt-oss-20b.MXFP4.gguf",
        modelsDirectory
    );

    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext({ contextSize: { max: 8096 } });
    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
    });

    console.log(chalk.green("Model ready!\n"));

    // Define available functions
    const functions = {
        getCurrentWeather,
        getPopulation,
    };

    // Example 1: Simple function call
    console.log(chalk.blue("=== Example 1: Single Function Call ===\n"));
    console.log(chalk.yellow("User: What's the weather in San Francisco?\n"));

    const response1 = await session.prompt(
        "What's the weather in San Francisco?",
        {
            functions,
        }
    );

    console.log(chalk.green("Assistant:"), response1);
    console.log();

    // Example 2: Multiple function calls
    console.log(chalk.blue("=== Example 2: Multiple Function Calls ===\n"));
    console.log(chalk.yellow("User: Compare the weather and population of San Francisco and New York\n"));

    const response2 = await session.prompt(
        "Compare the weather and population of San Francisco and New York",
        {
            functions,
        }
    );

    console.log(chalk.green("Assistant:"), response2);
    console.log();

    // Example 3: With streaming and function call detection
    console.log(chalk.blue("=== Example 3: Streaming with Function Calls ===\n"));
    console.log(chalk.yellow("User: What's the weather like in London?\n"));

    console.log(chalk.green("Assistant: "));
    const response3 = await session.prompt(
        "What's the weather like in London?",
        {
            functions,
            onTextChunk(chunk) {
                process.stdout.write(chunk);
            },
        }
    );
    console.log("\n");

    // Example 4: Without functions - normal chat
    console.log(chalk.blue("=== Example 4: Regular Chat (No Functions) ===\n"));
    console.log(chalk.yellow("User: Write a haiku about programming\n"));

    const response4 = await session.prompt("Write a haiku about programming");

    console.log(chalk.green("Assistant:"), response4);
    console.log();
}

main().catch((error) => {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
});
