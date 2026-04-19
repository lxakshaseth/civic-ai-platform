import { env } from "config/env";

export const appConfig = {
  name: env.APP_NAME,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  corsOrigins: env.CORS_ORIGIN,
  publicBaseUrl: env.PUBLIC_BASE_URL.replace(/\/$/, ""),
  isProduction: env.NODE_ENV === "production"
};
