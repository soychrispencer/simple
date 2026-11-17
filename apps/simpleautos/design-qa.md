# Design QA — SimpleAutos /ventas

## Source visual

- Selected direction: option 2, “Muro de Ruta”.
- Source image: `C:\Users\Chris\.codex\generated_images\01a1bce6-ee65-71e2-8fb2-7d5a81c9ab3e\exec-4fd5585e-cd13-42e5-97aa-b4989022a886.png` (1536 × 1024 px).
- Original card reference: `C:\Users\Chris\AppData\Local\Temp\codex-clipboard-fd8c8909-d93b-4ce8-9f1b-9672b8f48942.png` (2048 × 1088 px as received in the conversation).
- Background asset: `apps/simpleautos/public/images/simpleautos-route-paper.png` (1536 × 1024 px).

## Implementation capture

- Route: `http://localhost:3002/ventas`.
- Browser: Codex in-app browser.
- Desktop capture: 1536 × 1024 viewport, light theme, “Todo” selected, feed view. The screenshot was returned inline by the browser tool and was not exported to a local file; no persistent screenshot path is available.
- Mobile capture: 390 × 844 viewport, light theme, “Todo” selected, feed view. The screenshot was returned inline by the browser tool and was not exported to a local file.
- Data state: the local public-listings API returned `items: []`; no vehicle cards were rendered.

## Comparison

- Full view: source and implementation were viewed together at 1536 × 1024. The implementation now carries the selected warm paper/map surface, larger editorial title, orange active filter, and compact search controls. The source shows two lanes of vehicle cards; the local implementation could not show those lanes because it had no public listings.
- Focused region: header, title, category filters, search, and empty state were compared together with the source. The selected card design remains in the existing `VehicleListingCard` component and was not altered.
- Theme: light and dark themes were reviewed. Dark mode keeps its charcoal surfaces and readable controls.
- Mobile: the page remains one continuous feed. A 3 px horizontal overflow found on the first capture was fixed by moving the full-page background from a `100vw` pseudo-element to the document background. After the fix, the 390 px viewport measured 384 px client width and 384 px document width, with no horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: existing Simple font stack retained. The desktop title is 48 px, with a 30 px mobile title, closer to the selected image’s large headline.
- Spacing and layout rhythm: feed content is centered; desktop reserves two independent vertical lanes, while smaller screens keep one vertical feed. Real card spacing and lane scroll behavior remain visually unverified without listing data.
- Colors and visual tokens: SimpleAutos now uses warm paper, graphite text, mineral borders, and its existing orange accent in light mode. Dark mode retains the established charcoal palette.
- Images and asset fidelity: the subtle route-map paper texture is a generated raster asset. The original listing-card component, vehicle media treatment, logo, and icon library remain in use.
- Copy and content: existing page title and filter labels are preserved. The current empty state is shown because the local API has no listings.

## Findings

- [P2] Vehicle lanes cannot be visually verified with the current local data.
  - Location: `/ventas`, feed content.
  - Evidence: the source image shows two columns of vehicle cards; the local API returned zero items, so the implementation displays the existing empty state instead.
  - Impact: card size, media treatment, independent lane scrolling, and the visual rhythm between real posts cannot be confirmed in the rendered page.
  - Fix: load at least two real public listings into the local environment, then repeat the 1536 × 1024 comparison. No sample listings were fabricated.

## Interaction review

- “Venta” updates the URL to `?section=sale`; “Todo” restores `/ventas`.
- The advanced-filter control expands and collapses correctly.
- Browser console errors: none observed.
- Automated test suite: not run.

## Comparison history

1. Initial browser comparison found an undersized title and 3 px mobile horizontal overflow. The title was enlarged from 36 px to 48 px, header spacing was tightened, and the background was moved to the document background.
2. The 390 × 844 post-fix mobile capture reported equal document/client widths (384 px), with no horizontal overflow.
3. The final 1536 × 1024 comparison confirms the palette and header controls. Vehicle-lane comparison remains blocked by the empty local API response.

final result: blocked
