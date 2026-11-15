# JARVIS — UI Design Tokens and Component Standards
Version: 1.0

## 1. Brand direction

Futuristic, cinematic, premium, intelligent and practical.

## 2. Core palette

| Token | Value | Use |
|---|---|---|
| background | #07111F | Main application background |
| surface-1 | #0B1728 | Main panels |
| surface-2 | #101D30 | Cards and secondary panels |
| surface-3 | #17263A | Hover/raised surfaces |
| text-primary | #EAF4FF | Main text |
| text-secondary | #9FB0C5 | Secondary text |
| accent-cyan | #22D3EE | Primary AI accent |
| accent-ice | #60A5FA | Secondary accent |
| success | #34D399 | Success |
| warning | #FBBF24 | Warning/approval |
| danger | #FB7185 | Error/danger |
| info | #60A5FA | Information |

Use CSS variables and semantic aliases. Validate contrast for actual combinations.

## 3. Motion tokens

Suggested starting values:
- Micro interaction: 120–180 ms.
- Standard transition: 180–260 ms.
- Panel transition: 240–360 ms.
- Orb idle cycle: slow and subtle.
- Thinking state: moderately active.
- Cinematic home ambient effects: optional and performance-aware.

Always respect reduced-motion preferences. Never rely on motion alone to communicate state.

## 4. Typography

- Interface: readable modern sans-serif.
- Code and logs: monospace.
- Use a consistent type scale.
- Keep body text comfortably readable.
- Do not use decorative sci-fi fonts for long-form content.

## 5. Radius, spacing and borders

Use a consistent spacing scale (4px base recommended).
Use moderate corner radii for panels and cards.
Use subtle borders and focus rings.
Do not apply glow to every component.

## 6. Component requirements

Every interactive component must define:
- Default state.
- Hover state.
- Focus state.
- Active state.
- Disabled state.
- Loading state.
- Error state where relevant.

Every data-backed component must define:
- Loading.
- Empty.
- Error.
- Stale/offline.
- Permission-denied states.

## 7. Accessibility

- Semantic HTML.
- Keyboard access.
- Visible focus.
- Accessible labels.
- Sufficient contrast.
- Reduced motion.
- Screen-reader announcements for important status changes.
- Touch-friendly controls.
- No colour-only status communication.

## 8. Performance

- Prefer CSS/SVG for simple effects.
- Use canvas/WebGL only when justified.
- Avoid continuous heavy rendering.
- Pause nonessential effects when hidden.
- Provide static fallbacks.
- Lazy-load heavy visualizations.
- Keep dashboard interactions responsive on mid-range devices.

## 9. Theme customization

Support:
- Approved default midnight/cyan theme.
- Alternative accent palettes.
- Orb appearance settings.
- Motion intensity.
- Reduced-motion mode.
- Low-performance mode.
- Workspace presets.
- Reset to default.

Persist preferences per user and validate values before applying them.
