// src/middlewares/authMiddleware.ts
import asyncHandler from "./asyncHandler.js";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { UserRequest } from "../utils/types/userTypes.js";
import { Response, NextFunction } from "express";

export const protect = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
//  console.log("🔒 Protect middleware invoked");

  let token;

  // 1. Try Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    // console.log("🔑 Token from header:", token);
    // console.log("🔍 Headers:", req.headers);
  }

  // 2. Fallback cookie
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
    // console.log("🔑 Token from cookie:", token);
    // console.log("🔍 Cookies:", req.cookies);
  }

  if (!token) {
    console.log("❌ No token at all");
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // console.log("🔑 Verifying token...");
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { id: string; role: string };
    // console.log("✅ Decoded JWT:", decoded);

    const userQuery = await pool.query(
      `SELECT id, email, phone, first_name, last_name, avatar_url,is_admin
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      // console.log("❌ No user found in DB for id:", decoded.id);
      return res.status(401).json({ message: "User not found" });
    }

    const user = userQuery.rows[0];

    // if (!user.isActive) {
    //   console.log("⚠️ User inactive:", user.id);
    //   return res.status(403).json({ message: "Account inactive. Wait for approval." });
    // }

    req.user = user;
    next();
  } catch (err: any) {
    console.error("❌ JWT error:", err.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
});
