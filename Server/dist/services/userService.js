import { pool } from "../db";
export const getAllUsersService = async () => {
    const { rows } = await pool.query(`SELECT * FROM users`);
    return rows;
};
