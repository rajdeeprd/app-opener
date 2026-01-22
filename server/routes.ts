import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateLinkSchema } from "@shared/schema";

// Helper functions
function isValidUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function cleanPhone(phone: string): string {
  // Remove all non-digits, allow leading +
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? "+" + digits : digits;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.generate.path, async (req, res) => {
    try {
      const { platform, input, extra } = generateLinkSchema.parse(req.body);
      
      let generatedLink = "";
      let notes = "";
      let examples = "";

      const safeInput = input.trim();

      switch (platform) {
        case "youtube": {
          // Accept youtube.com/watch?v=VIDEO_ID, youtu.be/VIDEO_ID, youtube.com/shorts/VIDEO_ID
          let videoId = "";
          try {
            if (safeInput.includes("youtube.com/shorts/")) {
              videoId = safeInput.split("shorts/")[1].split("?")[0];
              generatedLink = `https://www.youtube.com/shorts/${videoId}`;
            } else if (safeInput.includes("youtu.be/")) {
              videoId = safeInput.split("youtu.be/")[1].split("?")[0];
              generatedLink = `https://www.youtube.com/watch?v=${videoId}`;
            } else if (safeInput.includes("v=")) {
              const urlObj = new URL(safeInput.startsWith("http") ? safeInput : `https://${safeInput}`);
              videoId = urlObj.searchParams.get("v") || "";
              if (!videoId) throw new Error("No video ID");
              generatedLink = `https://www.youtube.com/watch?v=${videoId}`;
            } else {
               // Assume input IS the video ID if no URL structure found
               videoId = safeInput;
               generatedLink = `https://www.youtube.com/watch?v=${videoId}`;
            }
          } catch (e) {
             // Fallback if parsing fails but input looks like ID
             videoId = safeInput;
             generatedLink = `https://www.youtube.com/watch?v=${videoId}`;
          }
          
          if (!videoId || videoId.length < 5) { // Basic sanity check
             return res.status(400).json({ ok: false, error: "Invalid YouTube Video ID or URL" });
          }
          
          notes = "Opens YouTube App directly to the video or shorts.";
          break;
        }

        case "instagram": {
          // instagram.com/p/SHORTCODE, /reel/SHORTCODE, /tv/SHORTCODE, profile
          let path = "";
          if (safeInput.includes("instagram.com")) {
             try {
                const urlObj = new URL(safeInput.startsWith("http") ? safeInput : `https://${safeInput}`);
                path = urlObj.pathname;
             } catch {
                return res.status(400).json({ ok: false, error: "Invalid Instagram URL" });
             }
          } else {
             // Assume username if no slashes, or specific path
             if (safeInput.includes("/")) {
               path = safeInput.startsWith("/") ? safeInput : `/${safeInput}`;
             } else {
               path = `/${safeInput}`;
             }
          }
          
          // Ensure trailing slash for best deep link behavior
          if (!path.endsWith("/")) path += "/";
          generatedLink = `https://www.instagram.com${path}`;
          notes = "Opens Instagram App (Profile, Post, Reel, or IGTV).";
          break;
        }

        case "whatsapp": {
           const phone = cleanPhone(safeInput);
           if (phone.length < 7) {
             return res.status(400).json({ ok: false, error: "Invalid phone number" });
           }
           
           const text = extra?.message ? encodeURIComponent(extra.message) : "";
           generatedLink = `https://wa.me/${phone}${text ? `?text=${text}` : ""}`;
           notes = "Opens WhatsApp chat with the specified number.";
           break;
        }

        case "google_maps": {
          const mode = extra?.mode || "search";
          if (mode === "directions") {
            const dest = extra?.destination ? encodeURIComponent(extra.destination) : "";
            const origin = safeInput ? encodeURIComponent(safeInput) : ""; // Using input as origin or vice versa?
            // Spec says: "Directions origin+destination"
            // Let's assume input is Origin, extra.destination is Destination.
            // Or usually Search Query is Input. 
            // If Input is empty, we can't search.
            
            if (!extra?.destination) {
               return res.status(400).json({ ok: false, error: "Destination required for directions" });
            }
            generatedLink = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
            if (origin) generatedLink += `&origin=${origin}`;
            
          } else {
            // Search
            const query = encodeURIComponent(safeInput);
            if (!query) return res.status(400).json({ ok: false, error: "Search query required" });
            generatedLink = `https://www.google.com/maps/search/?api=1&query=${query}`;
          }
          notes = "Opens Google Maps App.";
          break;
        }

        case "twitter": {
           const mode = extra?.mode || "tweet";
           if (mode === "follow") {
              const username = safeInput.replace("@", "").trim();
              if (!username) return res.status(400).json({ ok: false, error: "Username required" });
              generatedLink = `https://twitter.com/intent/follow?screen_name=${encodeURIComponent(username)}`;
           } else {
              // Tweet
              const text = encodeURIComponent(safeInput);
              const url = extra?.url ? encodeURIComponent(extra.url) : "";
              generatedLink = `https://twitter.com/intent/tweet?text=${text}`;
              if (url) generatedLink += `&url=${url}`;
           }
           notes = "Opens Twitter/X App.";
           break;
        }
        
        default:
          return res.status(400).json({ ok: false, error: "Unsupported platform" });
      }

      res.json({
        ok: true,
        platform,
        generatedLink,
        notes,
        examples
      });
      
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ ok: false, error: err.errors[0].message });
      }
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  return httpServer;
}
