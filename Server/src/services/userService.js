"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsersService = void 0;
const index_1 = require("../index");
const getAllUsersService = async () => {
    const { rows } = await index_1.pool.query(`SELECT * FROM users`);
    return rows;
};
exports.getAllUsersService = getAllUsersService;
