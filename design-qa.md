# Design QA — SimpleAgenda landing hero

## Source visual

- Selected direction: option 1 from the latest illustration set.
- Source image: `C:\Users\Chris\.codex\generated_images\01a1a755-5a27-7db2-aed3-127843a2b1dc\exec-16a6c7e3-c3eb-4c28-b16c-910e179a55f7.png`.
- Refined artwork: `C:\Users\Chris\.codex\generated_images\01a1a755-5a27-7db2-aed3-127843a2b1dc\exec-6db905ca-6205-4ea0-b306-3b7bc0837abf.png`.
- Integrated illustration: `apps/simpleagenda/public/hero/reserva-online-confirmada.png` (1754 × 896 px, PNG transparente).
- Refinement: reduced the phone, emphasized the professional/client interaction, and added a subtle light contour around the hair for contrast on teal.

## Implementation capture

- Route: `http://localhost:3004/`.
- Screenshot: not captured. The browser's saved permission blocked access to the local origin; no alternate browser route was attempted.
- Viewport and theme: not observed, so desktop/mobile and light/dark visual comparisons remain pending.

## Comparison

- Full view: blocked because the rendered landing could not be opened.
- Focused hero region: blocked for the same reason.
- TypeScript check passed before the latest copy and artwork updates; no browser-rendered visual check was possible.

## Findings

- [P1] Browser-rendered visual verification is blocked. The hero copy, responsive line wrapping, illustration scale/transparency, and light/dark presentation cannot be confirmed from the source alone. Review the open local page after access is restored.

## Implementation checklist

- Replaced the hero artwork with a refined professional-and-client booking scene; reduced the phone and improved hair contrast on teal.
- Clarified that clients choose an available time and receive automatic confirmation; updated the social preview image and description.
- Kept the existing teal/lime identity and trial CTA.
- The interactive booking demo now follows the hero; the industry strip follows the demo.
- The function section keeps the lime accent in the same places across light and dark modes; neutral text and surfaces adapt for contrast.
- Reviewed the remaining landing sections: eyebrows, plan highlights, comparison-table emphasis, and FAQ controls now keep the same lime accent placement in both themes; neutral text and surfaces adapt for contrast.
- Included feature marks and profession icons use the same lime surface with teal glyph treatment in both themes.
- The demo profile and service labels are generalized for multiple professional types.
- Demo dates now show upcoming weekdays so the example does not go stale.
- Recheck desktop and mobile in light and dark themes when local browser access is available.

final result: blocked
