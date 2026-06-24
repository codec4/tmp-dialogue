# Angular Tailwind Native Dialog Modal Plan

## Summary
- Initialize this folder as a latest-stable Angular SPA with routing, strict mode, standalone APIs, Vitest tests, npm, and Tailwind v4.
- Build a directive-first native `<dialog>` modal system with Preline-inspired visuals, no Preline dependency.
- Add a routed interactive showcase for sizes, placement, animations, backdrop styles, scrolling, close behavior, nested modals, return values, and async close guards.

## Key Changes
- Create the project with:
  `npx -y @angular/cli@latest new dialogue-angular --directory . --routing --style css --standalone --strict --test-runner vitest --skip-git --defaults --package-manager npm --ssr=false --interactive=false`
- Add Tailwind manually: install `tailwindcss @tailwindcss/postcss postcss`, create `.postcssrc.json`, and import `tailwindcss` in `src/styles.css`.
- Add app-shared primitives under `src/app/shared/dialog`:
  - `dialog[dialogModal]`, exported as `dialogModal`
  - `[dialogTriggerFor]`
  - `[dialogClose]`
  - `ng-template[dialogModalHeader]`, `ng-template[dialogModalBody]`, `ng-template[dialogModalFooter]`
- Public modal API:
  - `[(dialogOpen)]`
  - `dialogSize`: `xs | sm | md | lg | xl | fullscreen | fullscreen-sm | fullscreen-md | fullscreen-lg`
  - `dialogPlacement`: `center | top | bottom | left | right`
  - `dialogAnimation`: `fade | scale | slide-down | slide-up | slide-left | slide-right | none`
  - `dialogBackdrop`: `dim | blur | soft | dark | transparent | none`
  - `dialogScroll`: `inside | outside`
  - `[dialogCloseOnBackdrop]`, `[dialogCloseOnEscape]`, `[dialogAnimationMs]`, `[dialogCloseAnimationMs]`
  - `[dialogCanClose]`: async guard returning `boolean | Promise<boolean> | Observable<boolean>`
  - Outputs: `dialogOpened`, `dialogCloseRequested`, `dialogCloseBlocked`, `dialogClosed`
- Section directive API:
  - Sections are template slots rendered by `dialog[dialogModal]`; absent templates do not render matching section DOM.
  - Header: `dialogModalHeaderPadding`, `dialogModalHeaderDivider`, `dialogModalHeaderLayout`, `dialogModalHeaderSticky`, `dialogModalHeaderClass`
  - Body: `dialogModalBodyPadding`, `dialogModalBodyDivider`, `dialogModalBodyScroll`, `dialogModalBodyClass`
  - Footer: `dialogModalFooterPadding`, `dialogModalFooterDivider`, `dialogModalFooterLayout`, `dialogModalFooterSticky`, `dialogModalFooterClass`
- Use `showModal()`, `requestClose()`, `close()`, `cancel`/`close` events, `returnValue`, `method="dialog"` form handling, `::backdrop`, and `closedby` where supported.
- Use JS-assisted close animations: enter `closing` state, await guard, wait configured animation duration, then call native `close()`.
- Add routed showcase at `/modals`; default route redirects there.

## Test Plan
- Unit-test opening via `[(dialogOpen)]` and `[dialogTriggerFor]`.
- Unit-test closing via backdrop, Escape, `[dialogClose]`, native `requestClose()`, and dialog form return values.
- Unit-test async guard allow/block behavior, including repeated close attempts while pending.
- Unit-test class/state mapping for size, placement, animation, backdrop, scroll mode, and closing state.
- Run `npm test -- --watch=false` and `npm run build`.

## Assumptions
- Use latest stable Angular instead of installed global Angular CLI `21.0.5`.
- Preserve existing `.agents`, `.codex`, and `.git` metadata; use `--skip-git` because this shell does not see a valid Git worktree.
- No modal component in v1; directives plus global Tailwind/CSS classes are enough.
- Sources checked: [Angular installation](https://angular.dev/installation), [Angular `ng new`](https://angular.dev/cli/new), [Angular Tailwind](https://angular.dev/guide/tailwind), [Tailwind Angular guide](https://tailwindcss.com/docs/installation/framework-guides/angular), [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [Preline modal reference](https://preline.co/docs/components/modal.html), [Angular `ng test`](https://angular.dev/cli/test).
