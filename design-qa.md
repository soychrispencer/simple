# Design QA — SimpleAgenda landing visual direction

## Source visual truth

- Selected direction: hero with SimpleAgenda's own illustration, then one profession-specific photo inside the live booking-page example.
- Source image: `C:\Users\Chris\.codex\generated_images\01a1bc8b-6d6a-7972-989f-764fff01427e\exec-ecaac87f-ce9c-454f-8337-f02f3324beaf.png`.
- Source dimensions: 1024 × 1536 px. This is a full-page concept canvas, not a browser viewport specification.
- Existing branded illustration: `apps/simpleagenda/public/hero/reserva-online-confirmada.png` (1754 × 896 px, transparent PNG).
- The live booking example uses the existing profession demo images and data from `industry-site-demos.ts`.

## Implementation capture

- Route: `http://localhost:3004/`.
- Desktop screenshot: CUA in-app browser capture, 1274 × 717 px, emitted in the QA session; not persisted to a local file by the browser capture API.
- Mobile screenshot: CUA in-app browser capture, 434 × 943 px from a 440 × 956 CSS viewport at devicePixelRatio 2.5; emitted in the QA session, not persisted to a local file by the browser capture API.
- Mobile content width: 434 CSS px; document scroll width is also 434 px, so the page itself does not overflow horizontally.
- Light and dark theme states were reviewed. The desktop capture shows the initial Barbería example; the mobile capture shows Psicología and its booking flow.
- Authentication state: signed in, so the header and primary CTA use their normal signed-in labels. Anonymous visitors keep the existing sign-up flow.

## Comparison

- Opened the source image and the rendered desktop page together in one CUA comparison input.
- Compared the hero's text/illustration balance and the transition into the profession-specific booking example. The source is a full-page 1024 × 1536 concept while the browser screenshot is a 1274 × 717 viewport; comparison is directional rather than pixel-for-pixel.
- Focused mobile review covered the stacked hero, the two-column profession selector, the selected profile photo, and the booking panel. The layout stayed within the viewport width.
- All five fidelity surfaces were checked:
  - Typography: brand display face remains consistent; heading hierarchy and responsive line breaks are legible at mobile width.
  - Spacing and rhythm: the hero and interactive example are separate sections with clear breathing room; the feature and pricing sections remain in place.
  - Colors: paper/teal/lime tokens remain consistent. In dark mode, the hero text now inherits the light foreground correctly.
  - Imagery: the official SimpleAgenda illustration leads the page; the selected profession's photo stays inside its booking-page example.
  - Copy and content: the main promise, plan details, conversion CTAs, FAQs, and footer remain present; no landing sections were removed.
- Primary interactions checked: choose a different profession, choose a service, choose a time, and confirm the no-charge demo. The example reached its confirmation state without creating a real booking.
- Browser console errors checked: none reported.

## Comparison history

- Earlier review was blocked because the first browser session could not open the local origin. The page was subsequently captured and reviewed in the in-app browser.
- Post-implementation dark-mode check found the hero foreground was using the dark brand ink over a dark background. Removed the local foreground override so it inherits the landing's theme-aware foreground. Re-captured dark mode at 440 × 956 CSS px; the hero heading rendered as `rgb(250, 250, 250)` over `rgb(14, 14, 16)`.
- After the fix, light and dark hero states were both visually reviewed. No actionable P0, P1, or P2 findings remain.

## Findings

- No remaining P0/P1/P2 issues.
- Screenshot files were not written to disk because the available browser capture API returned in-memory images only; both captures were visually inspected in the QA session.

## Open questions

- None for this visual direction. The source concept is a directional full-page mockup, not a responsive layout spec.

## Implementation checklist

- Put the official brand illustration in the hero and keep the hero's CTA hierarchy clear.
- Place the live profession selector and photo-backed booking preview in the following section.
- Preserve all existing plan, feature, FAQ, and footer content.
- Keep mobile profession options in a readable two-column grid and stack the booking preview.
- Use the theme-aware landing foreground in the hero in light and dark themes.

## Follow-up polish

- A later review can compare a saved, same-size full-page capture if an exportable screenshot path becomes available. The generated source is a concept canvas, so exact full-page pixel matching is not a product requirement.

final result: passed
