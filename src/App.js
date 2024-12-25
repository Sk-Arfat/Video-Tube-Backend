import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { urlencoded } from "express";
const app = express();

app.use(
  cors({
    origin: `${process.env.CORS_ORIGIN}`,
    credentials: true,
  })
);

app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: true, limit: "30kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";
app.use("/api/users", userRouter);

export default app;
