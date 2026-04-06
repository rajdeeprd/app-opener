import type { Express } from "express";
import { storage } from "./storage";
import { api } from "../shared/routes.js";
import { z } from "zod";
import { generateLinkSchema } from "../shared/schema.js";

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

export async function registerRoutes(app: Express) {
  
  app.get("/open/:id", (req, res) => {
    const id = req.params.id;
    let deepLink = "";
    let fallbackUrl = "";
    let title = "Opening App...";

    if (id.startsWith("yt_")) {
      const videoId = id.replace("yt_", "");
      // Using a specialized direct market/intent link that is known to break out of IABs better
      // For Android, we use a different intent structure that is more forceful
      deepLink = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId};end`;
      fallbackUrl = `https://www.youtube.com/watch?v=${videoId}`;
      title = "Opening YouTube...";
    } else if (id.startsWith("ig_")) {
      const path = Buffer.from(id.replace("ig_", ""), 'base64').toString();
      deepLink = `instagram://media?id=${path}`; 
      fallbackUrl = `https://www.instagram.com${path}`;
      title = "Opening Instagram...";
    } else {
      return res.redirect("/");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5; text-align: center; padding: 20px; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 1.2rem; color: #18181b; margin-bottom: 10px; }
            p { color: #71717a; font-size: 0.9rem; margin-bottom: 20px; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 10px; }
            .ad-container { width: 100%; max-width: 336px; height: 280px; background: #fff; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; margin: 20px 0; border-radius: 8px; overflow: hidden; }
            .ad-label { font-size: 0.7rem; color: #a1a1aa; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="ad-label">Advertisement</div>
          <div class="ad-container">
            <!-- Placeholder for Ad Sense or other Ad network -->
            <div style="color: #a1a1aa; font-size: 0.9rem;">
              Your Ad Here<br>
              <small>(336 x 280)</small>
            </div>
          </div>

          <h1 id="timer">Opening in 5 seconds...</h1>
          <p>Please wait while we prepare your link.</p>
          <a href="${deepLink}" class="btn" id="open-btn">Open in App Now</a>
          <p>If you still see this screen after 5 seconds, click the three dots in the top right and select <b>"Open in Browser"</b>.</p>
          
          <script>
            let timeLeft = 5;
            const timerElement = document.getElementById('timer');
            const openBtn = document.getElementById('open-btn');

            function updateTimer() {
              if (timeLeft > 0) {
                timerElement.innerText = "Opening in " + timeLeft + " seconds...";
                timeLeft--;
                setTimeout(updateTimer, 1000);
              } else {
                timerElement.innerText = "Redirecting now...";
                // The "Magic" redirect attempt
                location.href = "${deepLink}";
                
                // Try again with a slight delay
                setTimeout(function() {
                  location.href = "${deepLink}";
                }, 100);

                // If it's an iOS device, sometimes window.location works better
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                  window.location = "youtube://www.youtube.com/watch?v=${id.replace("yt_", "")}";
                }
                
                // Final fallback to web only after a long delay to give the app time to wake up
                setTimeout(function() {
                  if (!document.hidden) {
                    window.location.href = "${fallbackUrl}";
                  }
                }, 3000);
              }
            }

            window.onload = updateTimer;
          </script>
        </body>
      </html>
    `);
  });

  app.post(api.generate.path, async (req, res) => {
    try {
      const { platform, input, extra } = generateLinkSchema.parse(req.body);
      
      let generatedLink = "";
      let notes = "";
      let examples = "";

      const safeInput = input.trim();
      const host = req.get('host');
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;

      switch (platform) {
        case "youtube": {
          let videoId = "";
          try {
            if (safeInput.includes("youtube.com/shorts/")) {
              videoId = safeInput.split("shorts/")[1].split("?")[0];
            } else if (safeInput.includes("youtu.be/")) {
              videoId = safeInput.split("youtu.be/")[1].split("?")[0];
            } else if (safeInput.includes("v=")) {
              const urlObj = new URL(safeInput.startsWith("http") ? safeInput : `https://${safeInput}`);
              videoId = urlObj.searchParams.get("v") || "";
            } else {
               videoId = safeInput;
            }
          } catch (e) {
             videoId = safeInput;
          }
          
          if (!videoId || videoId.length < 5) {
             return res.status(400).json({ ok: false, error: "Invalid YouTube Video ID or URL" });
          }
          
          // Use our own bridge URL
          generatedLink = `${baseUrl}/open/yt_${videoId}`;
          notes = "This link uses a bridge page to bypass in-app browsers and open the YouTube app directly.";
          break;
        }

        case "instagram": {
          let path = "";
          if (safeInput.includes("instagram.com")) {
             try {
                const urlObj = new URL(safeInput.startsWith("http") ? safeInput : `https://${safeInput}`);
                path = urlObj.pathname;
             } catch {
                return res.status(400).json({ ok: false, error: "Invalid Instagram URL" });
             }
          } else {
             path = safeInput.startsWith("/") ? safeInput : `/${safeInput}`;
          }
          
          if (!path.endsWith("/")) path += "/";
          // Use bridge for Instagram too
          const encodedPath = Buffer.from(path).toString('base64');
          generatedLink = `${baseUrl}/open/ig_${encodedPath}`;
          notes = "Bridge link to open Instagram app directly.";
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

}
