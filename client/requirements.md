## Packages
framer-motion | For smooth animations and transitions
canvas-confetti | For celebration effect on successful generation

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["'Outfit'", "sans-serif"],
  body: ["'DM Sans'", "sans-serif"],
}
GTM Integration:
- Implement a `trackEvent` helper attached to `window`
- Dispatch events: generate_link, copy_link, open_link_click, generate_error
