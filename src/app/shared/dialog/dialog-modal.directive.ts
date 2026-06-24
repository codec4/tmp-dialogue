import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  contentChild,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom, isObservable } from 'rxjs';

import { DialogModalBodyDirective, DialogModalFooterDirective, DialogModalHeaderDirective } from './dialog-modal-section.directive';
import {
  DialogAnimation,
  DialogBackdrop,
  DialogBlockReason,
  DialogCanClose,
  DialogCloseBlockedEvent,
  DialogCloseGuardFn,
  DialogCloseRequest,
  DialogCloseSource,
  DialogClosedEvent,
  DialogGuardResult,
  DialogOpenedEvent,
  DialogOpenSource,
  DialogPlacement,
  DialogRadius,
  DialogScroll,
  DialogShadow,
  DialogSize,
} from './dialog.types';

type DialogState = 'closed' | 'opening' | 'open' | 'closing';

const BASE_CLASSES =
  'dialog-modal fixed z-50 box-border w-[calc(100dvw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] border-0 bg-white p-0 text-left text-zinc-950 outline-none ring-1 ring-black/10';

const SIZE_CLASSES: Record<DialogSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  fullscreen: 'h-dvh max-h-dvh w-dvw max-w-dvw rounded-none',
  'fullscreen-sm': 'max-sm:h-dvh max-sm:max-h-dvh max-sm:w-dvw max-sm:max-w-dvw max-sm:rounded-none',
  'fullscreen-md': 'max-md:h-dvh max-md:max-h-dvh max-md:w-dvw max-md:max-w-dvw max-md:rounded-none',
  'fullscreen-lg': 'max-lg:h-dvh max-lg:max-h-dvh max-lg:w-dvw max-lg:max-w-dvw max-lg:rounded-none',
};

const SCROLL_CLASSES: Record<DialogScroll, string> = {
  inside: 'overflow-hidden',
  outside: 'overflow-y-auto',
};

const RADIUS_CLASSES: Record<DialogRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

const SHADOW_CLASSES: Record<DialogShadow, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-2xl',
};

@Component({
  selector: 'dialog[dialogModal]',
  exportAs: 'dialogModal',
  template: `
    @if (headerSlot(); as header) {
      <header [class]="header.className()">
        <ng-container [ngTemplateOutlet]="header.templateRef" />
      </header>
    }

    @if (bodySlot(); as body) {
      <div [class]="body.className()">
        <ng-container [ngTemplateOutlet]="body.templateRef" />
      </div>
    } @else {
      <ng-content />
    }

    @if (footerSlot(); as footer) {
      <footer [class]="footer.className()">
        <ng-container [ngTemplateOutlet]="footer.templateRef" />
      </footer>
    }
  `,
  imports: [NgTemplateOutlet],
})
export class DialogModalDirective {
  readonly #elementRef = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly open = model(false, { alias: 'dialogOpen' });

  readonly size = input<DialogSize>('md', { alias: 'dialogSize' });
  readonly placement = input<DialogPlacement>('center', { alias: 'dialogPlacement' });
  readonly animation = input<DialogAnimation>('scale', { alias: 'dialogAnimation' });
  readonly backdrop = input<DialogBackdrop>('dim', { alias: 'dialogBackdrop' });
  readonly scroll = input<DialogScroll>('inside', { alias: 'dialogScroll' });
  readonly radius = input<DialogRadius>('lg', { alias: 'dialogRadius' });
  readonly shadow = input<DialogShadow>('xl', { alias: 'dialogShadow' });
  readonly closeOnBackdrop = input(true, { alias: 'dialogCloseOnBackdrop', transform: booleanAttribute });
  readonly closeOnEscape = input(true, { alias: 'dialogCloseOnEscape', transform: booleanAttribute });
  readonly animationMs = input(180, { alias: 'dialogAnimationMs', transform: numberAttribute });
  readonly closeAnimationMs = input(70, { alias: 'dialogCloseAnimationMs', transform: numberAttribute });
  readonly canClose = input<DialogCanClose | null>(null, { alias: 'dialogCanClose' });
  readonly panelClass = input('', { alias: 'dialogPanelClass' });
  readonly customClass = input('', { alias: 'dialogClass' });

  readonly opened = output<DialogOpenedEvent>({ alias: 'dialogOpened' });
  readonly closeRequested = output<DialogCloseRequest>({ alias: 'dialogCloseRequested' });
  readonly closeBlocked = output<DialogCloseBlockedEvent>({ alias: 'dialogCloseBlocked' });
  readonly closed = output<DialogClosedEvent>({ alias: 'dialogClosed' });

  readonly state = signal<DialogState>('closed');
  readonly guardPending = signal(false);
  readonly headerSlot = contentChild(DialogModalHeaderDirective);
  readonly bodySlot = contentChild(DialogModalBodyDirective);
  readonly footerSlot = contentChild(DialogModalFooterDirective);

  readonly #hostClasses = computed(() =>
    [
      BASE_CLASSES,
      SIZE_CLASSES[this.size()],
      SCROLL_CLASSES[this.scroll()],
      RADIUS_CLASSES[this.radius()],
      SHADOW_CLASSES[this.shadow()],
      this.panelClass(),
      this.customClass(),
    ]
      .filter(Boolean)
      .join(' '),
  );

  #closeTimer: ReturnType<typeof setTimeout> | undefined;
  #openFrame: number | undefined;
  #nextOpenSource: DialogOpenSource = 'api';
  #activeCloseSource: DialogCloseSource = 'native';
  #pendingReturnValue = '';
  #pendingNativeRequest: { source: DialogCloseSource; returnValue: string } | undefined;

  constructor() {
    effect(() => {
      const shouldOpen = this.open();
      const dialog = this.#dialog;

      if (shouldOpen && !dialog.open && this.state() !== 'opening') {
        this.#openElement(this.#nextOpenSource);
        this.#nextOpenSource = 'api';
      }

      if (!shouldOpen && dialog.open && this.state() !== 'closing') {
        void this.requestClose('api');
      }
    });

    this.#destroyRef.onDestroy(() => {
      this.#clearCloseTimer();
      this.#clearOpenFrame();
    });
  }

  @HostBinding('class')
  get className(): string {
    return this.#hostClasses();
  }

  @HostBinding('attr.role')
  readonly role = 'dialog';

  @HostBinding('attr.aria-modal')
  readonly ariaModal = 'true';

  @HostBinding('attr.closedby')
  get closedBy(): 'closerequest' | 'none' {
    return this.closeOnEscape() ? 'closerequest' : 'none';
  }

  @HostBinding('attr.data-state')
  get stateAttribute(): DialogState {
    return this.state();
  }

  @HostBinding('attr.data-size')
  get sizeAttribute(): DialogSize {
    return this.size();
  }

  @HostBinding('attr.data-placement')
  get placementAttribute(): DialogPlacement {
    return this.placement();
  }

  @HostBinding('attr.data-animation')
  get animationAttribute(): DialogAnimation {
    return this.animation();
  }

  @HostBinding('attr.data-backdrop')
  get backdropAttribute(): DialogBackdrop {
    return this.backdrop();
  }

  @HostBinding('attr.data-scroll')
  get scrollAttribute(): DialogScroll {
    return this.scroll();
  }

  @HostBinding('attr.data-guard-pending')
  get pendingAttribute(): 'true' | null {
    return this.guardPending() ? 'true' : null;
  }

  @HostBinding('style.--dialog-animation-ms')
  get animationDuration(): string {
    return `${this.#effectiveAnimationMs()}ms`;
  }

  @HostBinding('style.--dialog-close-animation-ms')
  get closeAnimationDuration(): string {
    return `${this.#effectiveCloseAnimationMs()}ms`;
  }

  @HostBinding('attr.data-has-header')
  get hasHeaderAttribute(): 'true' | null {
    return this.headerSlot() ? 'true' : null;
  }

  @HostBinding('attr.data-has-body')
  get hasBodyAttribute(): 'true' | null {
    return this.bodySlot() ? 'true' : null;
  }

  @HostBinding('attr.data-has-footer')
  get hasFooterAttribute(): 'true' | null {
    return this.footerSlot() ? 'true' : null;
  }

  get nativeElement(): HTMLDialogElement {
    return this.#dialog;
  }

  show(source: DialogOpenSource = 'api'): void {
    this.#nextOpenSource = source;

    if (this.open()) {
      this.#openElement(source);
      return;
    }

    this.open.set(true);
  }

  async requestClose(source: DialogCloseSource = 'api', returnValue = '', nativeEvent?: Event): Promise<boolean> {
    const request = this.#createCloseRequest(source, returnValue, nativeEvent);

    this.closeRequested.emit(request);

    if (!this.#dialog.open && this.state() === 'closed') {
      this.open.set(false);
      return true;
    }

    if (this.state() === 'closing') {
      return this.#blockClose(request, 'closing');
    }

    if (!this.#closePolicyAllows(source)) {
      return this.#blockClose(request, 'policy');
    }

    if (this.guardPending()) {
      return this.#blockClose(request, 'pending');
    }

    const allowedResult = this.#resolveCanClose(request);
    let allowed: boolean;

    if (this.#isPromiseLike(allowedResult)) {
      this.guardPending.set(true);

      try {
        allowed = await allowedResult;
      } finally {
        this.guardPending.set(false);
      }
    } else {
      allowed = allowedResult;
    }

    if (!allowed) {
      return this.#blockClose(request, 'guard');
    }

    this.#animateAndClose(request);
    return true;
  }

  requestNativeClose(returnValue = ''): void {
    const dialog = this.#dialog as HTMLDialogElement & { requestClose?: (returnValue?: string) => void };

    if (typeof dialog.requestClose === 'function' && dialog.open) {
      this.#pendingNativeRequest = { source: 'native', returnValue };
      dialog.requestClose(returnValue);
      return;
    }

    void this.requestClose('native', returnValue);
  }

  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    if (!this.#isBackdropClick(event)) {
      return;
    }

    void this.requestClose('backdrop', '', event);
  }

  @HostListener('cancel', ['$event'])
  onCancel(event: Event): void {
    event.preventDefault();

    const pendingRequest = this.#pendingNativeRequest;
    this.#pendingNativeRequest = undefined;

    if (pendingRequest) {
      void this.requestClose(pendingRequest.source, pendingRequest.returnValue, event);
      return;
    }

    void this.requestClose('escape', '', event);
  }

  @HostListener('close', ['$event'])
  onNativeClose(event: Event): void {
    const wasOpen = this.state() !== 'closed';
    const returnValue = this.#dialog.returnValue || this.#pendingReturnValue || '';
    const source = this.#activeCloseSource;

    this.#clearCloseTimer();
    this.#clearOpenFrame();
    this.#pendingReturnValue = '';
    this.#activeCloseSource = 'native';
    this.state.set('closed');

    if (this.open()) {
      this.open.set(false);
    }

    this.closed.emit({
      source,
      returnValue,
      nativeEvent: event,
      nativeElement: this.#dialog,
      wasOpen,
    });
  }

  @HostListener('submit', ['$event'])
  onSubmit(event: SubmitEvent): void {
    const form = event.target instanceof HTMLFormElement ? event.target : null;

    if (!form || form.method.toLowerCase() !== 'dialog') {
      return;
    }

    event.preventDefault();
    const submitter = event.submitter;
    const returnValue = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter.value : '';
    void this.requestClose('form', returnValue, event);
  }

  get #dialog(): HTMLDialogElement {
    return this.#elementRef.nativeElement;
  }

  #openElement(source: DialogOpenSource): void {
    const dialog = this.#dialog;

    if (dialog.open) {
      this.#clearCloseTimer();
      this.state.set('open');
      return;
    }

    this.#clearCloseTimer();
    this.#clearOpenFrame();
    this.state.set('opening');

    try {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } catch {
      dialog.setAttribute('open', '');
    }

    this.opened.emit({ source, nativeElement: dialog });
    this.#openFrame = window.requestAnimationFrame(() => this.state.set('open'));
  }

  #animateAndClose(request: DialogCloseRequest): void {
    this.#activeCloseSource = request.source;
    this.#pendingReturnValue = request.returnValue;
    this.state.set('closing');
    this.#clearCloseTimer();

    const delay = this.#effectiveCloseAnimationMs();

    if (delay === 0) {
      queueMicrotask(() => this.#closeElement(request.returnValue));
      return;
    }

    this.#closeTimer = setTimeout(() => this.#closeElement(request.returnValue), delay);
  }

  #closeElement(returnValue: string): void {
    this.#closeTimer = undefined;

    if (typeof this.#dialog.close === 'function') {
      this.#dialog.close(returnValue);
      return;
    }

    this.#dialog.returnValue = returnValue;
    this.#dialog.removeAttribute('open');
    this.#dialog.dispatchEvent(new Event('close'));
  }

  #createCloseRequest(source: DialogCloseSource, returnValue: string, nativeEvent?: Event): DialogCloseRequest {
    return {
      source,
      returnValue,
      nativeEvent,
      nativeElement: this.#dialog,
    };
  }

  #closePolicyAllows(source: DialogCloseSource): boolean {
    if (source === 'backdrop') {
      return this.closeOnBackdrop();
    }

    if (source === 'escape') {
      return this.closeOnEscape();
    }

    return true;
  }

  #blockClose(request: DialogCloseRequest, reason: DialogBlockReason): false {
    this.closeBlocked.emit({ ...request, reason });

    if (!this.open() && this.#dialog.open) {
      this.open.set(true);
    }

    return false;
  }

  #resolveCanClose(request: DialogCloseRequest): boolean | Promise<boolean> {
    const guard = this.canClose();

    if (guard === null || guard === undefined) {
      return true;
    }

    try {
      const result = this.#readGuardResult(guard, request);

      if (isObservable(result)) {
        return firstValueFrom(result).then((resolved) => resolved !== false).catch(() => false);
      }

      if (this.#isPromiseLike(result)) {
        return Promise.resolve(result).then((resolved) => resolved !== false).catch(() => false);
      }

      return result !== false;
    } catch {
      return false;
    }
  }

  #readGuardResult(guard: DialogCanClose, request: DialogCloseRequest): DialogGuardResult {
    if (typeof guard === 'function') {
      const guardFn = guard as DialogCloseGuardFn | (() => DialogGuardResult);
      return guardFn.length === 0 ? (guardFn as () => DialogGuardResult)() : (guardFn as DialogCloseGuardFn)(request);
    }

    return guard;
  }

  #isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
    return typeof (value as Promise<T>)?.then === 'function';
  }

  #blockNativeLightDismiss(): boolean {
    return !this.closeOnBackdrop() || !this.closeOnEscape();
  }

  #isBackdropClick(event: MouseEvent): boolean {
    if (event.target !== this.#dialog || !this.#dialog.open) {
      return false;
    }

    if (this.#blockNativeLightDismiss()) {
      event.preventDefault();
    }

    const rect = this.#dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }

  #effectiveAnimationMs(): number {
    if (this.animation() === 'none') {
      return 0;
    }

    const value = this.animationMs();
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  #effectiveCloseAnimationMs(): number {
    if (this.animation() === 'none') {
      return 0;
    }

    const value = this.closeAnimationMs();
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  #clearCloseTimer(): void {
    if (!this.#closeTimer) {
      return;
    }

    clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  }

  #clearOpenFrame(): void {
    if (this.#openFrame === undefined) {
      return;
    }

    window.cancelAnimationFrame(this.#openFrame);
    this.#openFrame = undefined;
  }
}
