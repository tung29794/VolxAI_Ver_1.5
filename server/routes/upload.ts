import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { queryOne } from "../db";
import https from "https";
import http from "http";

const router = Router();

// Middleware to verify user token
async function verifyUser(req: Request, res: Response): Promise<boolean> {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.error("[verifyUser] No token provided");
      res.status(401).json({
        success: false,
        message: "No token provided",
      });
      return false;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [
      decoded.userId,
    ]);

    if (!user) {
      res.status(403).json({
        success: false,
        message: "User not found",
      });
      return false;
    }

    (req as any).userId = decoded.userId;
    return true;
  } catch (error) {
    console.error("[verifyUser] Error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return false;
  }
}

// Configure upload directory
const uploadDir = process.env.UPLOAD_DIR || "/home/jybcaorr/public_html/upload";

// Create upload directory if it doesn't exist (only on server, not during build)
if (process.env.NODE_ENV !== 'production' || fs.existsSync('/home/jybcaorr')) {
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      console.warn(`Could not create upload directory: ${uploadDir}`, err);
    }
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9-_]/g, "-");
    cb(null, sanitizedBasename + "-" + uniqueSuffix + ext);
  },
});

// File filter to only accept images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Upload image endpoint
router.post("/image", async (req: Request, res: Response) => {
  // Verify user authentication
  const isAuthenticated = await verifyUser(req, res);
  if (!isAuthenticated) return;

  // Handle file upload
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: "Upload error: " + err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Return the URL of the uploaded file
    const fileUrl = `https://volxai.com/upload/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
    });
  });
});

// Download image from URL and upload to server
router.post("/image-from-url", async (req: Request, res: Response) => {
  // Verify user authentication
  const isAuthenticated = await verifyUser(req, res);
  if (!isAuthenticated) return;

  // Check if user is admin
  const userId = (req as any).userId;
  const user = await queryOne<any>("SELECT username FROM users WHERE id = ?", [userId]);
  
  if (!user || user.username !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Only admin can use this feature",
    });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: "Image URL is required",
    });
  }

  // Check if URL is already from volxai.com
  if (imageUrl.includes('volxai.com')) {
    return res.json({
      success: true,
      url: imageUrl,
      message: "Image is already hosted on volxai.com",
    });
  }

  try {
    // Parse URL to get file extension
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname) || '.jpg';
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `downloaded-${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Download image
    await new Promise<void>((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          reject(new Error('URL does not point to an image'));
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete file on error
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });

    // Return the new URL
    const fileUrl = `https://volxai.com/upload/${filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      originalUrl: imageUrl,
      filename: filename,
    });
  } catch (error) {
    console.error("Error downloading image:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to download image",
    });
  }
});

export { router as uploadRouter };
