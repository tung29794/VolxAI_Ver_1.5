import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { featuresRouter } from "./routes/features";
import { aiRouter } from "./routes/ai";
import { articlesRouter } from "./routes/articles";
import { testDatabaseConnection } from "./db";

export async function createServer() {
  const app = express();

  // Test database connection
  const dbConnected = await testDatabaseConnection();
  console.log(
    dbConnected ? "✓ Database connected" : "✗ Database connection failed",
  );

  // Middleware
  app.use(
    cors({
      origin: [
        "https://volxai.com",
        "https://www.volxai.com",
        "http://localhost:8080", // Development
        "http://localhost:5173", // Vite dev
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Auth routes
  app.use("/api/auth", authRouter);

  // Admin routes
  app.use("/api/admin", adminRouter);

  // Features routes
  app.use("/api/admin/features", featuresRouter);

  // AI routes
  app.use("/api/ai", aiRouter);

  // Demo route
  app.get("/api/demo", handleDemo);

  return app;
}
