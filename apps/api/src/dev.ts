process.on("uncaughtException", (error) => {
  console.error("[startup] Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("[startup] Unhandled rejection", error);
  process.exit(1);
});

void import("./server").catch((error) => {
  console.error("[startup] Failed to load server module", error);
  process.exit(1);
});