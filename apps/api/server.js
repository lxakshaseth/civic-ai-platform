const fs = require("node:fs");
const path = require("node:path");

const distServerPath = path.resolve(__dirname, "dist", "server.js");
const startBridgePath = path.resolve(__dirname, "start.js");

if (fs.existsSync(startBridgePath)) {
  require(startBridgePath);
} else if (fs.existsSync(distServerPath)) {
  require(distServerPath);
} else {
  throw new Error(
    "The compiled API server was not found. Build the TypeScript API before starting this service."
  );
}
