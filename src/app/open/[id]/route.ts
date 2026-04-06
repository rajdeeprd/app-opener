import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let deepLink = "";
  let fallbackUrl = "";
  let title = "Opening App...";

  if (id.startsWith("yt_")) {
    const videoId = id.replace("yt_", "");
    deepLink = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId};end`;
    fallbackUrl = `https://www.youtube.com/watch?v=${videoId}`;
    title = "Opening YouTube...";
  } else if (id.startsWith("ig_")) {
    const path = Buffer.from(id.replace("ig_", ""), "base64").toString();
    deepLink = `instagram://media?id=${path}`;
    fallbackUrl = `https://www.instagram.com${path}`;
    title = "Opening Instagram...";
  } else {
    return NextResponse.redirect("/", { status: 302 });
  }

  const html = `
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
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
