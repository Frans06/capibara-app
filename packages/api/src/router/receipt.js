"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptRouter = void 0;
var server_1 = require("@trpc/server");
var v4_1 = require("zod/v4");
var db_1 = require("@capibara/db");
var schema_1 = require("@capibara/db/schema");
var trpc_1 = require("../trpc");
var RECEIPT_EXTRACTION_PROMPT = "Analyze this receipt image and extract the following information as JSON.\nReturn ONLY valid JSON with no markdown formatting, no code fences, no explanation.\n\nRequired JSON structure:\n{\n  \"merchant_name\": \"string or null\",\n  \"receipt_date\": \"YYYY-MM-DD or null\",\n  \"currency\": \"3-letter ISO code like USD, EUR, MXN or null\",\n  \"items\": [\n    {\n      \"description\": \"item name\",\n      \"quantity\": number,\n      \"unit_price\": number or null,\n      \"total_price\": number\n    }\n  ],\n  \"total_amount\": number\n}\n\nRules:\n- All monetary values must be numbers (not strings), e.g. 12.99 not \"$12.99\"\n- If you cannot read a value, use null\n- quantity defaults to 1 if not shown\n- total_amount is the final total paid (including tax if shown)\n- Return ONLY the JSON object, nothing else";
function parseAIResponse(raw) {
    var cleaned = raw.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
    }
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    try {
        return JSON.parse(cleaned);
    }
    catch (_a) {
        return null;
    }
}
exports.receiptRouter = {
    createUploadUrl: trpc_1.protectedProcedure
        .input(v4_1.z.object({
        contentType: v4_1.z.enum(["image/jpeg", "image/png", "image/heic"]),
    }))
        .mutation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var ext, key, uploadUrl, receipt;
        var ctx = _b.ctx, input = _b.input;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!ctx.r2) {
                        throw new server_1.TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "R2 service not configured",
                        });
                    }
                    ext = input.contentType === "image/jpeg"
                        ? "jpg"
                        : input.contentType === "image/png"
                            ? "png"
                            : "heic";
                    key = "receipts/".concat(ctx.session.user.id, "/").concat(crypto.randomUUID(), ".").concat(ext);
                    return [4 /*yield*/, ctx.r2.createUploadUrl(key, input.contentType)];
                case 1:
                    uploadUrl = _c.sent();
                    return [4 /*yield*/, ctx.db
                            .insert(schema_1.Receipt)
                            .values({
                            userId: ctx.session.user.id,
                            imageKey: key,
                            status: "pending",
                        })
                            .returning()];
                case 2:
                    receipt = (_c.sent())[0];
                    return [2 /*return*/, { uploadUrl: uploadUrl, receiptId: receipt.id, key: key }];
            }
        });
    }); }),
    scan: trpc_1.protectedProcedure
        .input(v4_1.z.object({
        receiptId: v4_1.z.uuid(),
    }))
        .mutation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var receipt, imageBase64, rawResponse, parsed, error_1;
        var _c, _d, _e;
        var ctx = _b.ctx, input = _b.input;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!ctx.r2 || !ctx.ai) {
                        throw new server_1.TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "R2/AI services not configured",
                        });
                    }
                    return [4 /*yield*/, ctx.db.query.Receipt.findFirst({
                            where: (0, db_1.eq)(schema_1.Receipt.id, input.receiptId),
                        })];
                case 1:
                    receipt = _f.sent();
                    if (!receipt || receipt.userId !== ctx.session.user.id) {
                        throw new server_1.TRPCError({ code: "NOT_FOUND" });
                    }
                    return [4 /*yield*/, ctx.db
                            .update(schema_1.Receipt)
                            .set({ status: "processing" })
                            .where((0, db_1.eq)(schema_1.Receipt.id, input.receiptId))];
                case 2:
                    _f.sent();
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 11, , 13]);
                    return [4 /*yield*/, ctx.r2.getImageAsBase64(receipt.imageKey)];
                case 4:
                    imageBase64 = _f.sent();
                    return [4 /*yield*/, ctx.ai.runVisionModel(imageBase64, RECEIPT_EXTRACTION_PROMPT)];
                case 5:
                    rawResponse = _f.sent();
                    parsed = parseAIResponse(rawResponse);
                    if (!!parsed) return [3 /*break*/, 7];
                    return [4 /*yield*/, ctx.db
                            .update(schema_1.Receipt)
                            .set({ status: "failed", rawAiResponse: rawResponse })
                            .where((0, db_1.eq)(schema_1.Receipt.id, input.receiptId))];
                case 6:
                    _f.sent();
                    return [2 /*return*/, { success: false, receiptId: input.receiptId }];
                case 7: return [4 /*yield*/, ctx.db
                        .update(schema_1.Receipt)
                        .set({
                        merchantName: parsed.merchant_name,
                        totalAmount: (_c = parsed.total_amount) === null || _c === void 0 ? void 0 : _c.toString(),
                        currency: (_d = parsed.currency) !== null && _d !== void 0 ? _d : "USD",
                        receiptDate: parsed.receipt_date,
                        rawAiResponse: parsed,
                        status: "completed",
                    })
                        .where((0, db_1.eq)(schema_1.Receipt.id, input.receiptId))];
                case 8:
                    _f.sent();
                    if (!((_e = parsed.items) === null || _e === void 0 ? void 0 : _e.length)) return [3 /*break*/, 10];
                    return [4 /*yield*/, ctx.db.insert(schema_1.ReceiptItem).values(parsed.items.map(function (item) {
                            var _a, _b, _c, _d;
                            return ({
                                receiptId: input.receiptId,
                                description: item.description,
                                quantity: (_b = (_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "1",
                                unitPrice: (_c = item.unit_price) === null || _c === void 0 ? void 0 : _c.toString(),
                                totalPrice: (_d = item.total_price) === null || _d === void 0 ? void 0 : _d.toString(),
                            });
                        }))];
                case 9:
                    _f.sent();
                    _f.label = 10;
                case 10: return [2 /*return*/, { success: true, receiptId: input.receiptId }];
                case 11:
                    error_1 = _f.sent();
                    return [4 /*yield*/, ctx.db
                            .update(schema_1.Receipt)
                            .set({
                            status: "failed",
                            rawAiResponse: { error: String(error_1) },
                        })
                            .where((0, db_1.eq)(schema_1.Receipt.id, input.receiptId))];
                case 12:
                    _f.sent();
                    throw new server_1.TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to process receipt",
                        cause: error_1,
                    });
                case 13: return [2 /*return*/];
            }
        });
    }); }),
    list: trpc_1.protectedProcedure.query(function (_a) {
        var ctx = _a.ctx;
        return ctx.db.query.Receipt.findMany({
            where: (0, db_1.eq)(schema_1.Receipt.userId, ctx.session.user.id),
            orderBy: (0, db_1.desc)(schema_1.Receipt.createdAt),
            with: { items: true },
            limit: 50,
        });
    }),
    byId: trpc_1.protectedProcedure
        .input(v4_1.z.object({ id: v4_1.z.uuid() }))
        .query(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var receipt;
        var ctx = _b.ctx, input = _b.input;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, ctx.db.query.Receipt.findFirst({
                        where: (0, db_1.eq)(schema_1.Receipt.id, input.id),
                        with: { items: true },
                    })];
                case 1:
                    receipt = _c.sent();
                    if (!receipt || receipt.userId !== ctx.session.user.id) {
                        throw new server_1.TRPCError({ code: "NOT_FOUND" });
                    }
                    return [2 /*return*/, receipt];
            }
        });
    }); }),
};
