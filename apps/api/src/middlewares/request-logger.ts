import pinoHttp from "pino-http";

import { logger } from "utils/logger";

export const requestLoggerMiddleware = pinoHttp({
  logger,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true
  }
});

