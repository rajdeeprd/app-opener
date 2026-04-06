import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

await registerRoutes(app);

export default app;
