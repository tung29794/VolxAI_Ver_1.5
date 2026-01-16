import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { featuresRouter } from "./routes/features";
import { aiRouter } from "./routes/ai";
import { articlesRouter } from "./routes/articles";
import { apiKeysRouter } from "./routes/api-keys";
import { modelsRouter } from "./routes/models";
import { uploadRouter } from "./routes/upload";
import { websitesRouter } from "./routes/websites";
import adminUsersRouter from "./routes/adminUsers";
import batchJobsRouter from "./routes/batchJobs";
import { testDatabaseConnection } from "./db";
import { startBatchJobWorker } from "./workers/batchJobProcessor";

export async function createServer() {
  const app = express();

  // Test database connection
  const dbConnected = await testDatabaseConnection();
  console.log(
    dbConnected ? "✓ Database connected" : "✗ Database connection failed",
  );

  // Start batch job worker (runs every 5 seconds)
  if (dbConnected) {
    startBatchJobWorker(5000);
    console.log("✓ Batch job worker started");
  }

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
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

  // Articles routes
  app.use("/api/articles", articlesRouter);
  app.use("/api/admin/articles", articlesRouter);

  // API Keys routes
  app.use("/api/api-keys", apiKeysRouter);

  // AI Models routes
  app.use("/api/models", modelsRouter);

  // Upload routes
  app.use("/api/upload", uploadRouter);

  // Websites routes
  app.use("/api/websites", websitesRouter);

  // Admin Users routes
  app.use("/api/admin", adminUsersRouter);

  // Batch Jobs routes
  app.use("/api", batchJobsRouter);

  // Demo route
  app.get("/api/demo", handleDemo);

  return app;
}
