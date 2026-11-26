import "./config/loadEnv.js";
import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { appConfig } from "./config/app.js";
import { testDatabaseConnection } from "./config/db.js";
import { createErrorHandler, notFoundApiHandler } from "./middleware/errorMiddleware.js";
import apiRouter from "./routes/index.js";
import { uploadDirectory } from "./utils/fileHelpers.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(appConfig.corsOptions));
app.use(express.json({ limit: appConfig.jsonBodyLimit }));
app.use("/uploads", express.static(uploadDirectory));

app.use("/api", apiRouter);
app.use("/api", notFoundApiHandler);
app.use(createErrorHandler({ apiOnly: true }));

async function startServer() {
  try {
    await testDatabaseConnection();
  } catch {
    logger.warn(
      "Database unavailable at startup — running in disk-manifest upload mode for non-DB exercises."
    );
  }

  const port = appConfig.backendPort;
  const server = http.createServer(app);
  const explicitHost = process.env.HOST?.trim();

  await new Promise((resolve, reject) => {
    let fellBackToIpv4 = false;

    const handleListening = () => {
      server.removeListener("error", handleError);
      logger.info(`Fitness Explorer API running on http://localhost:${port}`);
      resolve();
    };

    const handleError = (error) => {
      if (
        !explicitHost &&
        !fellBackToIpv4 &&
        (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL")
      ) {
        fellBackToIpv4 = true;
        server.listen(port, "0.0.0.0", handleListening);
        return;
      }
      reject(error);
    };

    server.on("error", handleError);
    if (explicitHost) {
      server.listen(port, explicitHost, handleListening);
    } else {
      server.listen({ port, host: "::", ipv6Only: false }, handleListening);
    }
  });
}

startServer();
