# Our Fleet — Option 2 design QA

final result: passed

## Evidence
- Source visual truth: C:/Users/sakeer hussian/.codex/generated_images/01a10176-394a-7203-a0b0-df51b6921269/exec-df298948-05a8-4e2e-9e1a-41d082f20bae.png (1487 × 1058).
- Implementation: desktop.png, mobile.png in this report directory.
- Desktop CSS viewport: 1440 × 1024; screenshot 1424 × 1014 due browser scrollbar/capture scaling. Source and implementation normalized to 1440 × 1024 for comparison.png. Minor capture-ratio difference is not treated as design drift.
- Full-view evidence: comparison.png. Focused controls/card evidence: detail-comparison.png, reviewed together with source.
- State: Our Fleet, all five vehicles, default filters, no saved vehicles, scroll top.
- Mobile: 390 × 844 CSS viewport, one column, no horizontal overflow; tablet 834 × 1194, two columns.

## Findings and comparison history
- [P2, fixed] Existing global search-label styling added a second border and vertically misaligned the search input. Scoped label reset removed inherited flex, border, height and padding. Post-fix screenshots and focused comparison show one aligned 48px control row.
- Initial post-reload capture restored a previous scroll position and captured images before decoding. Re-captured by navigating Home → Our Fleet; confirmed scrollY=0 and all five images complete at naturalWidth=800. This was a capture-state mismatch, not accepted as visual evidence.
- No remaining actionable P0/P1/P2 findings.

## Required fidelity surfaces
- Typography: existing Inter, bold navy title, clear vehicle names and muted descriptions; consistent with selected visual. Native select rendering differs slightly from generated mock.
- Spacing/layout: horizontal five-control filter bar, three-column grid, aligned price/action rows and open white surface. Mobile stacks search above paired filters and single vehicle cards. Existing shared header proportions retained. Equal-height production cards intentionally replace the mock's varying second-row heights.
- Colors/tokens: existing white, navy #102a43, MAK blue #007fbd and light border palette retained. No new color theme introduced.
- Images/assets: existing generated 800×600 individual vehicle photographs and original transparent MAK logo reused. Crops are sharp and automotive subjects match the mock; exact backgrounds and car colors vary from the generated concept. Real Tabler icons reused, no synthetic asset approximations.
- Copy/content: Our Fleet heading and subtitle match; five existing vehicle names and SAR rates preserved. Small Sample rate labels retained to distinguish dummy prices. Existing enquiry preview clearly states local download and no reservation.

## Functional checks
- Search BMW → one matching vehicle.
- Search BMW + SUV → zero results and clear recovery action.
- Brand Toyota → Toyota RAV4.
- Under SAR 250 → RAV4 and Accord.
- Ascending price order → Accord, RAV4, Audi, BMW, Mercedes.
- Save BMW → header count 1; saved toggle → BMW only.
- Enquire BMW → existing dialog prefilled with Premium, BMW name and SAR350 sample rate.
- Escape closes enquiry and restores focus to initiating button.
- Mobile menu opens/closes, route access retained. Desktop, tablet and mobile inspected.
- Browser console errors: none in captured logs.
- Targeted ESLint and production build passed. Existing bundle-size warning remains.

## Follow-up polish
- [P3] Reused photography is intentionally not pixel-identical to generated concept photography.

## Implementation checklist
- [x] Selected gallery layout and original theme
- [x] Functional search, filters, sorting, saved controls and enquiry
- [x] Responsive layouts and empty state
- [x] Source/implementation visual comparison
- [x] No deployment requested or performed


---

# About Us — option 2 visual review

Date: 2026-10-27. Local implementation: http://localhost:5173/#/about-us

Source visual: C:/Users/sakeer hussian/.codex/generated_images/01a10176-394a-7203-a0b0-df51b6921269/exec-f67685a1-4eec-4ac0-9283-bc11bc48e49a.png

Evidence directory: C:/Users/sakeer hussian/OneDrive/Documents/New project/.work/about-option-2/

## Comparison evidence

- Source: 921 × 1708 pixels, full-page desktop concept.
- Desktop: 1440 × 1000 CSS viewport; full-page browser capture desktop-final.png. Capture has approximately 1424 CSS content pixels excluding the native scrollbar. Both source and implementation were proportionally normalized to 720px width in comparison-final.jpg; no vertical stretching was applied.
- Full-page composition reviewed side by side in comparison-final.jpg. Focused CTA comparison in cta-comparison-final.jpg; desktop-top.png additionally checked at native capture resolution. Capture softness is from the in-app browser recording; DOM measurements confirm the implemented font sizes.
- Tablet: 834 × 1194 CSS viewport, tablet.png.
- Mobile: 390 × 844 CSS viewport, mobile-final.png. Mobile is a responsive adaptation; no mobile concept was supplied.
- State: logged out, About route, menu closed, scroll at top. No horizontal overflow at any tested width. All three images loaded.

## Findings and iteration history

1. First comparison: P2 typography was too small in the hero/story; P2 service links inherited dark text. Enlarged heading/body scale and scoped blue link styling. Evidence: comparison.jpg versus comparison-final.jpg.
2. Second comparison: P2 CTA label inherited dark text and photo overlay was too dark. Set white button text, 16px label and 52px rendered target; reduced overlay opacity. Post-fix evidence: cta-comparison-final.jpg and computed white text color.
3. Final comparison: no actionable P0/P1/P2 differences remain. Shared site header and navy footer intentionally preserved rather than replacing the site's footer with the mock's white variant. Imagery retains the selected photographic direction but replaces the geographically misleading skyline. No claim is made that generated vehicle images show actual MAK stock.

## Required fidelity surfaces

- Typography: existing Inter retained, strong three-line hero and approach headings, responsive sizes, readable body copy. No clipping observed.
- Layout: navy/photographic split, asymmetric story, coach/approach spread, road CTA; mobile stacks naturally. No repeated cards or decorative component grids.
- Colors: existing blue #007fbd, navy and white. Service links and CTA contrast verified.
- Images: three independent generated photos optimized to WebP; real existing MAK logo retained. Natural crops, no distorted assets or placeholder shapes.
- Copy: company establishment, location, coverage, services and values use the extracted official-site material. No invented statistics, certifications, client endorsements or new delivery promises.

## Interaction and accessibility verification

- Passenger transport link activated with Enter and reached Services. All three service rows have the same intended Services route, confirmed from DOM.
- Main CTA activated with Enter and reached the existing Contact form. No form submitted.
- About header link returned to About.
- Mobile menu opened; Escape closed it and restored focus to its trigger.
- One h1, labelled sections, alt text on informative images, empty alt on decorative banner, visible link focus rules.
- Fresh browser error log after final image installation: none.
- Targeted JSX ESLint passed. Production build passed before visual refinements; final build run separately for final state.

## Follow-up polish

- Shared header/footer use their existing site typography and colors, intentionally unchanged.
- Contact form delivery remains its existing local-download behavior; this task changes only About.

final result: passed



---

# MAK Services — Option 1 implementation review

Date: 2026-10-28

Source visual truth: C:/Users/sakeer hussian/.codex/generated_images/01a10176-394a-7203-a0b0-df51b6921269/exec-b5ec16e1-3f6b-48b6-bb30-ddb46a376111.png

Implementation: http://localhost:5174/#/services

Evidence in this directory: desktop-final.png, desktop-top.png, tablet.png, mobile-final.png, comparison-final.jpg, hero-comparison.jpg. Source pixels 921 × 1708; implementation full-page 1424 × 2698, captured at a 1440 × 1000 CSS viewport (browser scrollbar excluded). Combined comparison normalizes each page to 700px width with proportional scaling; no browser chrome included. Additional responsive viewports: 834 × 1194 and 390 × 844. Default state: Chauffeur services selected. Focused hero comparison reviewed alongside the full-page comparison.

## Findings and comparison history

- Initial P2: hero text crossed a bright part of the official photograph. Increased the navy image overlay to .56, then recaptured and compared. Text now has clear contrast across both desktop and mobile.
- A trial right-positioned image exposed a hard vertical seam because the source photograph differs from the generated concept. Removed the seam and retained the full-width official photo. Final evidence: desktop-final.png and comparison-final.jpg.
- No remaining actionable P0/P1/P2 findings.

## Required fidelity surfaces

- Typography: existing Inter family, navy headings, blue passenger heading; large two-line hero, uppercase group labels and readable service labels. Existing header/footer typography intentionally retained.
- Layout: wide photographic hero; image-left/passenger-copy-right; reversed workforce composition; three-column cargo rows; pale contact band. All stack cleanly at 390px. No horizontal overflow at any tested width.
- Colors: existing navy #101d31 / #0d2237, blue #007fbd, white and pale gray. No added palette or decorative gradients.
- Images: official chauffeur and bus photographs, compressed to WebP. All three rendered images loaded successfully. Official source asset crop differs from the generated reference; retained actual company imagery to honor the verified-content requirement.
- Copy: all 12 service names/model references sourced from https://www.makissco.com/services and preserved in official-services.json. Intro/group headings are editorial organization of that catalogue. No invented prices, availability, safety percentages or endorsements. Removed the design concept name “The Service Journal” from customer-facing copy. Workforce models are paired with the relevant service for clarity; cargo has short verified descriptions.

## Functional verification

- Enter activates all six passenger service choices and updates both description and model references; pressed state and live region are present.
- Contact Us opens the existing contact route, verified from rendered state.
- All source images loaded; desktop, tablet and mobile overflow checks passed.
- Browser log review: no errors from port 5174. Historical port-5173 Vite websocket errors belong to the previous local preview and were recorded before switching ports.
- Targeted ESLint passed. Production build passed with the existing chunk-size advisory. No business/backend workflow changed.

## Accepted product constraints / follow-up polish

- Existing shared navigation, logo and footer retained, including their current content and behavior.
- Passenger image remains a representative chauffeur catalogue image while text changes; its alt text identifies the pictured vehicle explicitly.
- No automated screen-reader audit performed; keyboard selection and visible focus were checked.

final result: passed
