import express, { type Request, type Response } from "express";
import http from "http";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
import { initDb } from "./db.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mpesaRoutes from "./routes/mpesaRoutes.js";

dotenv.config();



const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = [
  "https://ankhydro-ltd.vercel.app",
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, Postman, server-to-server, M-Pesa
      // callbacks) which don't send an Origin header at all.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({ createParentPath: true }));

app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mpesa", mpesaRoutes);

app.use(express.static(path.join(__dirname, "..", "client")));
app.get("/", (_req: Request, res: Response) => res.send("ANK Hydro backend is live 🚀"));

const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await initDb();
});