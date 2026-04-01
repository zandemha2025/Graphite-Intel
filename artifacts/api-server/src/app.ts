import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { serve } from "inngest/express";
import { authMiddleware } from "./middlewares/authMiddleware";
import { auditMiddleware } from "./middlewares/auditMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { inngest } from "./inngest/client";
import * as inngestFunctions from "./inngest";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);
app.use(auditMiddleware);

// Inngest event-driven function handler
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(inngestFunctions),
  }),
);

app.use("/api", router);

export default app;
