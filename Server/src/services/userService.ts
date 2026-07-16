import { User } from '../utils/types/userTypes.js';
import { pool } from "../db.js";
import { UserRequest } from "../utils/types/userTypes.js";

export const getAllUsersService = async (): Promise<User[]> => {
  const { rows } = await pool.query(`SELECT * FROM users`);
  return rows as User[];
};

