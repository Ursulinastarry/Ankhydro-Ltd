import {User} from '../utils/types/userTypes'
import { pool } from "../index";
import { UserRequest } from "../utils/types/userTypes";

export const getAllUsersService = async (): Promise<User[]> => {
  const { rows } = await pool.query(`SELECT * FROM users`);
  return rows as User[];
};

