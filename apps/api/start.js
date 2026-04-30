const path = require("node:path");
const Module = require("node:module");

process.env.NODE_PATH = path.resolve(__dirname, "dist");
Module.Module._initPaths();

require("./dist/main.js");
