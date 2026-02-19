import { buildServer } from "./app.js";
import { readEnv } from "./config/env.js";

const env = readEnv();
const app = buildServer(env);

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app
  .listen({ host: env.API_HOST, port: env.API_PORT })
  .then((address) => {
    app.log.info({ address }, "simple-api listening");
  })
  .catch((error) => {
    app.log.error({ error }, "Failed to start simple-api");
    process.exit(1);
  });
