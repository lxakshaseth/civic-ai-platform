import path from "node:path";

// Fix module paths
process.env.NODE_PATH = path.resolve(__dirname);
require("node:module").Module._initPaths();

// 🔥 DEBUG START
console.log("🚀 SERVER BOOTING...");
console.log("ENV CHECK:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "FOUND ✅" : "MISSING ❌");
console.log("REDIS_URL:", process.env.REDIS_URL ? "FOUND ✅" : "MISSING ❌");
console.log("NODE_ENV:", process.env.NODE_ENV);

// 🔥 GLOBAL ERROR HANDLERS (VERY IMPORTANT)
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:");
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:");
  console.error(err);
  process.exit(1);
});

// 🔥 ASYNC START (BEST PRACTICE)
(async () => {
  try {
    // ⚠️ IMPORTANT: extension match karo
    // agar server.ts hai → "./server.ts"
    // agar server.js hai → "./server.js"
    await import("./server"); 

    console.log("✅ Server module loaded successfully");
  } catch (error) {
    console.error("🔥 FATAL STARTUP ERROR:");
    console.error(error);
    process.exit(1);
  }
})();