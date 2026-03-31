"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordSchema = void 0;
var v4_1 = require("zod/v4");
var errors_1 = require("./errors");
exports.passwordSchema = v4_1.z
    .string()
    .min(8, { message: errors_1.errors.minLengthErrorMessage })
    .max(20, { message: errors_1.errors.maxLengthErrorMessage })
    .refine(function (password) { return /[A-Z]/.test(password); }, {
    message: errors_1.errors.uppercaseErrorMessage,
})
    .refine(function (password) { return /[a-z]/.test(password); }, {
    message: errors_1.errors.lowercaseErrorMessage,
})
    .refine(function (password) { return /[0-9]/.test(password); }, {
    message: errors_1.errors.numberErrorMessage,
})
    .refine(function (password) { return /[!@#$%^&*]/.test(password); }, {
    message: errors_1.errors.specialCharacterErrorMessage,
});
