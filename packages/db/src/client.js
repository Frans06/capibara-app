"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.client = void 0;
var postgres_js_1 = require("drizzle-orm/postgres-js");
var postgres_1 = require("postgres");
var schema = require("./schema");
exports.client = (0, postgres_1.default)((_a = process.env.POSTGRES_URL) !== null && _a !== void 0 ? _a : "", {
    prepare: false,
});
exports.db = (0, postgres_js_1.drizzle)({
    client: exports.client,
    schema: schema,
    casing: "snake_case",
});
