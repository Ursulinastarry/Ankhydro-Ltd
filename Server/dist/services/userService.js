import { pool } from "../db.js";
export const getAllUsersService = async () => {
    const { rows } = await pool.query(`SELECT * FROM users`);
    return rows;
};
