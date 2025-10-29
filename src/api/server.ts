/**
 * OpenAI-compatible Express server
 * Run this to expose node-llama-cpp as a REST API
 */

import express, { type Request, type Response } from "express";
import { fileURLToPath } from "url";
import path from "path";
import chalk from "chalk";
import { getLlama, LlamaChatSession, resolveModelFile } from "node-llama-cpp";
import type { ChatCompletionRequest, ModelsListResponse } from "../types.js";
import {
    handleChatCompletion,
    handleStreamingChatCompletionWithCallback,
} from "./openai-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDirectory = path.join(__dirname, "..", "models");

// Configuration
const PORT = process.env.PORT || 3000;
const MODEL_NAME = process.env.MODEL_NAME || "gpt-oss-20b";

// Global session (you might want to manage multiple sessions)
let session: LlamaChatSession | null = null;

async function initializeModel() {
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

    session = new LlamaChatSession({
        contextSequence: context.getSequence(),
    });

    console.log(chalk.green("Model initialized successfully!"));
}

const app = express();
app.use(express.json());

// CORS middleware (optional, enable if needed)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", model_loaded: session !== null });
});

// List models endpoint
app.get("/v1/models", (req: Request, res: Response) => {
    const response: ModelsListResponse = {
        object: "list",
        data: [
            {
                id: MODEL_NAME,
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: "local",
            },
        ],
    };
    res.json(response);
});

// Chat completions endpoint
app.post("/v1/chat/completions", async (req: Request, res: Response) => {
    if (!session) {
        res.status(503).json({ error: "Model not initialized" });
        return;
    }

    const request = req.body as ChatCompletionRequest;

    // Validate request
    if (!request.messages || request.messages.length === 0) {
        res.status(400).json({ error: "messages field is required" });
        return;
    }

    try {
        if (request.stream) {
            // Streaming response
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            await handleStreamingChatCompletionWithCallback(
                session,
                request,
                (chunk) => {
                    res.write(chunk);
                }
            );

            res.end();
        } else {
            // Non-streaming response
            const response = await handleChatCompletion(session, request);
            res.json(response);
        }
    } catch (error) {
        console.error(chalk.red("Error handling chat completion:"), error);
        res.status(500).json({
            error: {
                message:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
                type: "internal_error",
            },
        });
    }
});

// Start server
async function start() {
    try {
        await initializeModel();

        app.listen(PORT, () => {
            console.log(
                chalk.green(
                    `\n✓ OpenAI-compatible server running on http://localhost:${PORT}`
                )
            );
            console.log(chalk.blue("\nEndpoints:"));
            console.log(chalk.blue(`  GET  /health`));
            console.log(chalk.blue(`  GET  /v1/models`));
            console.log(chalk.blue(`  POST /v1/chat/completions`));
            console.log(chalk.gray("\nExample usage with curl:"));
            console.log(
                chalk.gray(`  curl http://localhost:${PORT}/v1/chat/completions \\
    -H "Content-Type: application/json" \\
    -d '{
      "model": "${MODEL_NAME}",
      "messages": [{"role": "user", "content": "Hello!"}]
    }'`)
            );
            console.log();
        });
    } catch (error) {
        console.error(chalk.red("Failed to start server:"), error);
        process.exit(1);
    }
}

start();
