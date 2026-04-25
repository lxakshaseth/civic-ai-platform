import path from "node:path";

// 🔥 Fix module paths
process.env.NODE_PATH = path.resolve(__dirname);
require("node:module").Module._initPaths();

// 🔥 DEBUG START (VERY IMPORTANT)
console.log("🚀 SERVER BOOTING...");
console.log("ENV CHECK:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "FOUND ✅" : "MISSING ❌");
console.log("REDIS_URL:", process.env.REDIS_URL ? "FOUND ✅" : "MISSING ❌");
console.log("NODE_ENV:", process.env.NODE_ENV);

// 🔥 Catch any crash at startup
try {
  require("./server");
} catch (error) {
  console.error("🔥 FATAL STARTUP ERROR:");
  console.error(error);
}