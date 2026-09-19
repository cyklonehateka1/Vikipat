"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const path_1 = require("path");
const candidates = [
    (0, path_1.resolve)(process.cwd(), '.env'),
    (0, path_1.resolve)(process.cwd(), 'apps/api/.env'),
];
const envPath = candidates.find((candidate) => (0, fs_1.existsSync)(candidate));
if (envPath) {
    (0, dotenv_1.config)({
        path: envPath,
        override: process.env.NODE_ENV !== 'production',
    });
}
//# sourceMappingURL=env.js.map