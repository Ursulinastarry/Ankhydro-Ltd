import { Request } from "express";
import { UploadedFile } from "express-fileupload";
/**
 * User type matching the PostgreSQL "users" table schema
 */
export interface User {
    id: string;              // cuid text ID
    email: string;
    phone: string;
    password?: string;       // Excluded when returning user info
    firstName: string;
    lastName: string;
    avatar?: string | null;
    isAdmin: boolean;
    isActive: boolean;
    isVerified: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Custom Express Request Type to include `user` object
 */
export interface UserRequest extends Request {
    user?: User;
}
