# MAK authentication — option 1 verification

Date: 2026-10-22. Scope: sign-in and sign-up only.

## Source visual truth

The user selected the first displayed authentication concept, not the earlier dashboard concept:

`C:/Users/sakeer hussian/.codex/generated_images/01a10176-394a-7203-a0b0-df51b6921269/exec-478675b8-dffb-42d3-9a1d-4ab215e376e3.png`

Source pixels: 1487 × 1058. Existing implementation: `C:/Users/sakeer hussian/OneDrive/Desktop/MAK/frontend`, routes `/#/sign-in` and `/#/sign-up`. Existing authentication handlers, transport, permissions, signup states and password policy were retained. Recovery styling and other pages were not redesigned.

## Evidence and normalization

Evidence directory: `C:/Users/sakeer hussian/OneDrive/Documents/New project/outputs/mak-auth-design-20261022/`.

- Initial implementation: `05-sign-in-first.jpg`.
- Initial combined source-left/live-right comparison: `comparison-first.png`.
- Final implementation raw browser capture: `15-sign-in-final.jpg`.
- Final implementation normalized viewport: `sign-in-final.png`.
- Final combined comparison: `comparison-final.png`.
- Focused final form/typography/icons comparison: `form-comparison-final.png`.
- Signup before/after compaction: `07-sign-up-desktop.jpg`, `08-sign-up-desktop-final.jpg`, `14-sign-up-final.jpg`.
- Phone sign-in and signup: `09-sign-in-phone.jpg`, `10-sign-up-phone.jpg`.
- 320px signup before/after overflow correction: `11-sign-up-small-phone-first.jpg`, `12-sign-up-small-phone-final.jpg`.
- Tablet signup: `13-sign-up-tablet.jpg`.

The source and final live captures were opened and compared together, followed by a focused form comparison. The effective desktop CSS viewport was 1487 × 1057, with browser-reported devicePixelRatio approximately 0.87. The browser capture buffer contains unused right/bottom area outside the effective CSS viewport. Normalized captures remove only that unused area, retaining the rendered 1487 × 1057 content without resampling. The one-pixel source height difference is immaterial. Raw captures are retained. Other effective widths checked: 768, 391 and 320; normal document scrolling remains available for longer forms.

The comparison state is light theme, sign-in, no validation errors, with preview-only dummy email/password values to prevent saved credentials appearing in screenshots. The source shows placeholder email; this difference is intentional and does not change the layout.

## Findings and iteration history

| Priority | Earlier evidence / issue | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P2 | Initial frame started at y≈109, while selected source starts at y≈123. | Adjusted desktop outer top padding. | Final measured frame top123.15, width1115.99 and height817.99. `comparison-final.png` aligns the major regions. |
| P2 | Signup additional fields increased the initial surface to approximately934px and pushed the footer below the target viewport. | Compacted signup-only logo, spacing and field heights, retaining readable labels and every field/control. | Final signup desktop capture includes all fields, submit, secondary controls, home link and footer. |
| P2 | Inherited global 320px minimum width caused horizontal document overflow when a vertical scrollbar was present on small phones (client302, scroll320). | Scoped min-width:0 to document/body/root only when this auth shell is present. | Final client302, scroll302 at the effective320px viewport. No horizontal scrollbar; all controls remain accessible by vertical scrolling. |
| P2 | Supporting text needed adequate contrast. | Used #60758C for helper text and #007BB7 for white-on-blue CTA. | Focused comparison remains consistent with MAK blue/navy; contrast ratios approximately4.75:1 and4.65:1 respectively. |

No actionable P0/P1/P2 finding remains within this scope.

## Required fidelity surfaces

**Fonts and typography:** Inter is hosted locally through the already installed font package. Browser font check passed. Heading36px, body/description18px, labels14px and inputs15px at desktop; mobile input text16px. Signup uses a more compact heading/spacing to accommodate its additional controls. Font weight, line height, wrapping and input alignment were inspected in full and focused captures. Native browser antialiasing differs slightly from the raster concept.

**Spacing and layout:** Two equal desktop columns, 1116px maximum surface, 20px radius and subtle elevation. Sign-in uses approximately437px-wide fields with50px height and52px primary button. Final field labels/inputs share the same left edge. Required markers align with label baselines. At820px and below, the illustration panel hides and the form uses the available width. Phone and tablet controls do not overlap or require horizontal scrolling. Longer/error/bootstrap forms can grow naturally and scroll vertically.

**Colors and tokens:** MAK navy#102A43, primary blue#007BB7, pale-blue illustration and canvas#F5F7FA replace Scalar's green. The CTA uses an accessible solid brand shade instead of the concept's slight color variation. Focus outlines and error borders/text are visible. These are focused contrast/keyboard checks, not a full accessibility certification.

**Images and icons:** Actual supplied bilingual MAK logo is reused from `/images/mak-admin-logo.jpg`; it was not redrawn. A separate text-free illustration was generated from the selected image with the built-in image generator and inspected before placement. Generated original1038×1515 PNG was converted to a same-size high-quality JPEG,148,978bytes. It fills `/images/auth/mak-workspace.jpg`; copy remains real editable DOM text. The SUV/calendar/document/check composition and pale-blue background match the selected direction. Small vehicle and calendar drawing details differ from the concept as expected for a separately generated asset. Tabler eye/eye-off/arrow controls match the existing admin outline family. Official Google/Microsoft SVG assets from Google's Firebase UI distribution are self-hosted; no hand-drawn brand substitutes were introduced.

**Copy and content:** Welcome heading, MAK workspace description, right-panel heading/description, account switching, unavailable-provider caption and home link follow the selected concept. Signup has its corresponding heading and retains full name, email, password, confirmation, policy hint, terms and conditional administrator setup. No unsupported passkey, phone or email-link sign-in functionality was added.

## Interactions checked

- Sign-in invalid email/empty password shows linked field errors and focuses the email field, without a login request.
- Signup required-field, weak-password, confirmation mismatch and unchecked-terms errors remain available; first error receives focus. No terms were accepted and no account was created during browser QA.
- Password reveal changes the input type to text and back to password; accessible names and pressed state change with it. Matching Tabler eye/eye-off glyphs are used.
- Account switching opens the corresponding existing route.
- Microsoft secondary button displays the existing not-connected notice. Provider buttons remain secondary and explicitly labeled unavailable. No OAuth request is made.
- Forgot-password navigation opens the existing recovery form. No reset email or password change was submitted.
- Keyboard navigation reaches the submit and account-switch controls, with a visible focus outline. All form controls remain usable in phone layouts.
- Runtime console inspection returned no captured error/warning entries for the QA tab.
- Viewport override reset before handoff; the local preview remains running.

## Automated validation and limits

- ESLint passed after the JSX changes.
- Production build passed after the final CSS changes.
- Existing authentication transport/permission tests passed.
- Git whitespace check passed. Existing main-chunk size advisory remains.
- Browser QA did not submit a successful login, create a real account, accept terms, send recovery mail, or alter credentials. Successful authentication, pending/active signup responses and conditional first-admin bootstrap retain their existing code paths; these server-dependent states were not re-created live for this visual change.
- No backend files or endpoints changed. Existing unrelated uncommitted work was preserved; no commit/push performed.

## Follow-up polish

- The original supplied JPEG logo is softer than a native vector. It is intentionally preserved rather than substituted.
- The generated illustration has small vehicle/calendar detail differences from the selected mock; composition, subject, palette and visual weight match. No further P3 iteration was required.

## Implementation checklist

- Selected split design and actual brand assets placed.
- Existing form fields, validation and API handlers preserved.
- Desktop, tablet and phone captures reviewed.
- Initial P2 findings fixed and re-captured.
- Full/focused comparisons inspected and validation checks completed.

Previous dashboard verification was archived before replacing this latest project-root report: `outputs/mak-auth-design-20261022/previous-admin-design-qa.md` in the writable review workspace.

final result: passed
