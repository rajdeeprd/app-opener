import { NextRequest, NextResponse } from "next/server";
import { generateLinkSchema } from "@/shared/schema";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = generateLinkSchema.parse(body);

    const { platform, input, extra } = data;
    let generatedLink = "";
    let notes = "";

    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const safeInput = input.trim();

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
          return NextResponse.json(
            { ok: false, error: "Invalid YouTube Video ID or URL" },
            { status: 400 }
          );
        }

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
            return NextResponse.json(
              { ok: false, error: "Invalid Instagram URL" },
              { status: 400 }
            );
          }
        } else {
          path = safeInput.startsWith("/") ? safeInput : `/${safeInput}`;
        }

        if (!path.endsWith("/")) path += "/";
        const encodedPath = Buffer.from(path).toString("base64");
        generatedLink = `${baseUrl}/open/ig_${encodedPath}`;
        notes = "Bridge link to open Instagram app directly.";
        break;
      }

      case "whatsapp": {
        const phone = cleanPhone(safeInput);
        if (phone.length < 7) {
          return NextResponse.json(
            { ok: false, error: "Invalid phone number" },
            { status: 400 }
          );
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
          const origin = safeInput ? encodeURIComponent(safeInput) : "";

          if (!extra?.destination) {
            return NextResponse.json(
              { ok: false, error: "Destination required for directions" },
              { status: 400 }
            );
          }
          generatedLink = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
          if (origin) generatedLink += `&origin=${origin}`;
        } else {
          const query = encodeURIComponent(safeInput);
          if (!query) {
            return NextResponse.json(
              { ok: false, error: "Search query required" },
              { status: 400 }
            );
          }
          generatedLink = `https://www.google.com/maps/search/?api=1&query=${query}`;
        }
        notes = "Opens Google Maps App.";
        break;
      }

      case "twitter": {
        const mode = extra?.mode || "tweet";
        if (mode === "follow") {
          const username = safeInput.replace("@", "").trim();
          if (!username) {
            return NextResponse.json(
              { ok: false, error: "Username required" },
              { status: 400 }
            );
          }
          generatedLink = `https://twitter.com/intent/follow?screen_name=${encodeURIComponent(username)}`;
        } else {
          const text = encodeURIComponent(safeInput);
          const url = extra?.url ? encodeURIComponent(extra.url) : "";
          generatedLink = `https://twitter.com/intent/tweet?text=${text}`;
          if (url) generatedLink += `&url=${url}`;
        }
        notes = "Opens Twitter/X App.";
        break;
      }

      default:
        return NextResponse.json(
          { ok: false, error: "Unsupported platform" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: true,
      platform,
      generatedLink,
      notes,
      examples: ""
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function cleanPhone(phone: string): string {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? "+" + digits : digits;
}
