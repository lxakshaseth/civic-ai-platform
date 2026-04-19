import path from "node:path";

process.env.NODE_PATH = path.resolve(__dirname);
require("node:module").Module._initPaths();
require("./server");

