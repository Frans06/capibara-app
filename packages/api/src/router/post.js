"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRouter = void 0;
var v4_1 = require("zod/v4");
var db_1 = require("@capibara/db");
var schema_1 = require("@capibara/db/schema");
var trpc_1 = require("../trpc");
exports.postRouter = {
    all: trpc_1.publicProcedure.query(function (_a) {
        var ctx = _a.ctx;
        return ctx.db.query.Post.findMany({
            orderBy: (0, db_1.desc)(schema_1.Post.id),
            limit: 10,
        });
    }),
    byId: trpc_1.publicProcedure
        .input(v4_1.z.object({ id: v4_1.z.string() }))
        .query(function (_a) {
        var ctx = _a.ctx, input = _a.input;
        return ctx.db.query.Post.findFirst({
            where: (0, db_1.eq)(schema_1.Post.id, input.id),
        });
    }),
    create: trpc_1.protectedProcedure
        .input(schema_1.CreatePostSchema)
        .mutation(function (_a) {
        var ctx = _a.ctx, input = _a.input;
        return ctx.db.insert(schema_1.Post).values(input);
    }),
    delete: trpc_1.protectedProcedure.input(v4_1.z.string()).mutation(function (_a) {
        var ctx = _a.ctx, input = _a.input;
        return ctx.db.delete(schema_1.Post).where((0, db_1.eq)(schema_1.Post.id, input));
    }),
};
