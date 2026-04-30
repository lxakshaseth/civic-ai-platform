const fs = require("node:fs");
const path = require("node:path");

const distMainPath = path.resolve(__dirname, "dist", "main.js");
const startBridgePath = path.resolve(__dirname, "start.js");

if (fs.existsSync(startBridgePath)) {
  require(startBridgePath);
} else if (fs.existsSync(distMainPath)) {
  require(distMainPath);
} else {
  throw new Error(
    "The compiled API server was not found. Build the TypeScript API before starting this service."
  );
}
