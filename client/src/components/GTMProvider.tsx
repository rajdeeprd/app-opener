import { useEffect } from "react";
import { initGTM } from "@/lib/gtm";

const GTM_ID = "GTM-XXXXXXX"; // Placeholder ID

export function GTMProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize dataLayer
    initGTM();

    // 1. Script tag
    const script = document.createElement("script");
    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${GTM_ID}');`;
    document.head.appendChild(script);

    // 2. NoScript iframe (optional, for non-JS clients, though React needs JS)
    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.prepend(noscript);

    return () => {
      // Cleanup if needed (rare for GTM)
    };
  }, []);

  return <>{children}</>;
}
