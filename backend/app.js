import express from "express";
import { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import "./config/db.js";
import "./config/rd.js";
import authRoute from "./routes/authRoute.routes.js";
import categoryRoute from "./routes/categoriesRoute.routes.js";
// import productRoute from "./routes/productsRoute.routes.js";
import subCategoryRoute from "./routes/subcategoriesRoute.routes.js";
import tagRoute from "./routes/tagsRoute.routes.js";
import wilayaRoute from "./routes/wilayasRoute.routes.js";
import uploadRoute from "./routes/uploadRoute.routes.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
app.use(cookieParser());

const corsOptions = {
  origin: true,
  preflightContinue: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
};

app.use(cors(corsOptions));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// app.use(
//   "/uploads",
//   express.static("uploads", {
//     setHeaders: (res, path, stat) => {
//       res.header("Access-Control-Allow-Origin", "*");
//       res.header("Cross-Origin-Resource-Policy", "cross-origin");
//     },
//   })
// );

app.use("/auth",authRoute);
app.use("/category",categoryRoute);
app.use("/subcategory",subCategoryRoute);
app.use("/wilaya",wilayaRoute);
app.use("/tag",tagRoute);
app.use("/upload",uploadRoute);

app.use((err, req, res, next) => {
  console.error(`Error`, err.stack);
  res.status(err.status || 500).json({
    error: "Internal server error",
    ...{ stack: err.stack },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
