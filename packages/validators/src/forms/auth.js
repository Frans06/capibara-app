"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupValidator = exports.loginValidator = void 0;
var v4_1 = require("zod/v4");
var constants_1 = require("../constants");
var errors_1 = require("../errors");
var utils_1 = require("../utils");
var loginValidator = function () {
    return v4_1.z.object({
        email: v4_1.z.email(errors_1.errors.email),
        password: v4_1.z.string(),
    });
};
exports.loginValidator = loginValidator;
var signupValidator = function () {
    return v4_1.z
        .object({
        name: v4_1.z.string().max(constants_1.DEFAULT_TEXT_LENGTH, errors_1.errors.maxLengthErrorMessage),
        email: v4_1.z.email(errors_1.errors.email),
        password: utils_1.passwordSchema,
        confirmPassword: v4_1.z.string(),
    })
        .refine(function (data) { return data.password === data.confirmPassword; }, {
        message: errors_1.errors.passwordMismatchErrorMessage,
        path: ["confirmPassword"],
    });
};
exports.signupValidator = signupValidator;
