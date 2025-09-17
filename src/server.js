import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import chatRoutes from "./routes/chat.js";

const app = express();
app.set("etag", false);
app.use(bodyParser.json());

const allowedOrigins = [
  "http://localhost:5173", // local dev
  process.env.FRONTEND_URL, // deployed frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server requests
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        return callback(new Error("CORS not allowed"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Disable caching for API responses
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Simple request logging middleware
app.use((req, res, next) => {
  const startedAt = Date.now();
  const safeStringify = (value) => {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return '"[unserializable]"';
    }
  };

  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
      `params=${safeStringify(req.params)} query=${safeStringify(
        req.query
      )} body=${safeStringify(req.body)}`
  );

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${
        res.statusCode
      } ${durationMs}ms`
    );
  });

  next();
});

app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
