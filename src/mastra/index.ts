import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { localAgent } from "./agents/local-agent";

const storage = new LibSQLStore({
    url: "file:../../mastra.db",
});

export const mastra = new Mastra({
    agents: {
        localAgent,
    },
    storage,
    logger: new PinoLogger({
        name: "Mastra",
        level: "info",
    }),
});
