import { z } from "zod";
import { generateLinkSchema, generateLinkResponseSchema } from "./schema.js";

export const api = {
  generate: {
    method: "POST" as const,
    path: "/api/generate",
    input: generateLinkSchema,
    responses: {
      200: generateLinkResponseSchema,
      400: generateLinkResponseSchema,
    },
  },
};
