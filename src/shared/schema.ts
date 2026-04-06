import { z } from "zod";

// API Request Schema
export const generateLinkSchema = z.object({
  platform: z.enum(["youtube", "instagram", "whatsapp", "google_maps", "twitter"]),
  input: z.string().min(1, "Input is required"),
  extra: z.object({
    message: z.string().optional(),
    mode: z.string().optional(), // "search" | "directions" | "tweet" | "follow"
    url: z.string().optional(),
    destination: z.string().optional(), // For Maps directions
  }).optional(),
});

export type GenerateLinkRequest = z.infer<typeof generateLinkSchema>;

// API Response Schema
export const generateLinkResponseSchema = z.object({
  ok: z.boolean(),
  platform: z.string().optional(),
  generatedLink: z.string().optional(),
  notes: z.string().optional(),
  examples: z.string().optional(),
  error: z.string().optional(),
});

export type GenerateLinkResponse = z.infer<typeof generateLinkResponseSchema>;
