import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DialogCloseDirective } from './dialog-close.directive';
import { DialogModalDirective } from './dialog-modal.directive';
import { DialogModalBodyDirective, DialogModalFooterDirective, DialogModalHeaderDirective } from './dialog-modal-section.directive';
import { DialogTriggerDirective } from './dialog-trigger.directive';
import {
  DialogAnimation,
  DialogBackdrop,
  DialogCanClose,
  DialogCloseBlockedEvent,
  DialogClosedEvent,
  DialogCloseRequest,
  DialogPlacement,
  DialogScroll,
  DialogSize,
} from './dialog.types';

@Component({
  imports: [
    DialogModalDirective,
    DialogModalHeaderDirective,
    DialogModalBodyDirective,
    DialogModalFooterDirective,
    DialogTriggerDirective,
    DialogCloseDirective,
  ],
  template: `
    <button id="trigger" type="button" [dialogTriggerFor]="modal">Open</button>

    <dialog
      dialogModal
      #modal="dialogModal"
      [(dialogOpen)]="open"
      [dialogSize]="size()"
      [dialogPlacement]="placement()"
      [dialogAnimation]="animation()"
      [dialogBackdrop]="backdrop()"
      [dialogScroll]="scroll()"
      [dialogCloseOnBackdrop]="closeOnBackdrop()"
      [dialogCloseOnEscape]="closeOnEscape()"
      [dialogAnimationMs]="animationMs()"
      [dialogCloseAnimationMs]="closeAnimationMs()"
      [dialogCanClose]="guard()"
      (dialogCloseRequested)="requested.push($event)"
      (dialogCloseBlocked)="blocked.push($event)"
      (dialogClosed)="closed.push($event)"
    >
      <ng-template
        dialogModalHeader
        dialogModalHeaderPadding="lg"
        dialogModalHeaderLayout="center"
        dialogModalHeaderSticky
        dialogModalHeaderClass="section-header"
      >
        <span id="header-content">Header</span>
      </ng-template>
      <ng-template
        dialogModalBody
        dialogModalBodyPadding="sm"
        [dialogModalBodyScroll]="bodyScroll()"
        dialogModalBodyClass="section-body"
      >
        <form id="dialog-form" method="dialog">
          <button id="form-close" type="submit" value="form-value">Form close</button>
        </form>
        <button id="action-close" type="button" dialogClose="action-value">Action close</button>
      </ng-template>
      <ng-template
        dialogModalFooter
        dialogModalFooterLayout="end"
        dialogModalFooterClass="section-footer custom-footer"
      >
        <span id="footer-content">Footer</span>
      </ng-template>
    </dialog>
  `,
})
class DialogHost {
  readonly open = signal(false);
  readonly size = signal<DialogSize>('md');
  readonly placement = signal<DialogPlacement>('center');
  readonly animation = signal<DialogAnimation>('scale');
  readonly backdrop = signal<DialogBackdrop>('dim');
  readonly scroll = signal<DialogScroll>('inside');
  readonly closeOnBackdrop = signal(true);
  readonly closeOnEscape = signal(true);
  readonly animationMs = signal(0);
  readonly closeAnimationMs = signal(0);
  readonly bodyScroll = signal(true);
  readonly allowClose = signal(true);
  readonly guard = signal<DialogCanClose>(this.allowClose);

  readonly requested: DialogCloseRequest[] = [];
  readonly blocked: DialogCloseBlockedEvent[] = [];
  readonly closed: DialogClosedEvent[] = [];
}

@Component({
  imports: [DialogModalDirective, DialogModalHeaderDirective, DialogModalBodyDirective],
  template: `
    <dialog dialogModal>
      @if (showHeader()) {
        <ng-template dialogModalHeader>
          <span id="optional-header-content">Optional header</span>
        </ng-template>
      }
      <ng-template dialogModalBody>
        <span id="optional-body-content">Body</span>
      </ng-template>
    </dialog>
  `,
})
class OptionalHeaderHost {
  readonly showHeader = signal(false);
}

describe('DialogModalDirective', () => {
  beforeEach(async () => {
    installDialogPolyfill();

    await TestBed.configureTestingModule({
      imports: [DialogHost],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens from a signal-backed two-way model and from a trigger directive', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);

    host.open.set(true);
    fixture.detectChanges();
    await settle();

    expect(dialog.open).toBe(true);
    expect(getDirective(fixture).state()).toBe('open');

    getDirective(fixture).requestClose('api', 'reset');
    await settle();
    fixture.detectChanges();

    expect(host.open()).toBe(false);

    getButton(fixture.nativeElement, 'trigger').click();
    fixture.detectChanges();
    await settle();

    expect(dialog.open).toBe(true);
    expect(host.open()).toBe(true);
  });

  it('closes through dialogClose and returns the configured value', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;

    await openDialog(fixture);
    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(host.open()).toBe(false);
    expect(host.requested.at(-1)?.source).toBe('action');
    expect(host.closed.at(-1)?.returnValue).toBe('action-value');
  });

  it('closes on backdrop click and Escape when policy allows them', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);

    await openDialog(fixture);
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(rect(20, 20, 120, 120));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(host.closed.at(-1)?.source).toBe('backdrop');

    await openDialog(fixture);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    await settle();

    expect(host.closed.at(-1)?.source).toBe('escape');
  });

  it('blocks backdrop and Escape closes when policy disables them', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);

    host.closeOnBackdrop.set(false);
    host.closeOnEscape.set(false);
    await openDialog(fixture);

    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(rect(20, 20, 120, 120));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    await settle();

    expect(dialog.open).toBe(true);
    expect(host.blocked.map((event) => event.source)).toEqual(['backdrop', 'escape']);
    expect(host.blocked.every((event) => event.reason === 'policy')).toBe(true);
  });

  it('keeps native light-dismiss disabled so backdrop closes can animate', () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);

    fixture.detectChanges();

    expect(dialog.getAttribute('closedby')).toBe('closerequest');

    host.closeOnEscape.set(false);
    fixture.detectChanges();

    expect(dialog.getAttribute('closedby')).toBe('none');
  });

  it('keeps backdrop closes in the closing state until the animation finishes', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);
    const directive = getDirective(fixture);

    host.animationMs.set(180);
    host.closeAnimationMs.set(25);
    await openDialog(fixture);
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(rect(20, 20, 120, 120));

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(dialog.open).toBe(true);
    expect(directive.state()).toBe('closing');
    expect(dialog.dataset['state']).toBe('closing');
    expect(host.closed.length).toBe(0);

    await wait(10);

    expect(dialog.open).toBe(true);

    await wait(25);
    fixture.detectChanges();

    expect(dialog.open).toBe(false);
    expect(host.closed.at(-1)?.source).toBe('backdrop');
  });

  it('cancels a pending close timer when reopened during the closing state', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);
    const directive = getDirective(fixture);

    host.closeAnimationMs.set(35);
    await openDialog(fixture);

    void directive.requestClose('api', 'stale-close');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(dialog.open).toBe(true);
    expect(directive.state()).toBe('closing');

    directive.show('api');
    fixture.detectChanges(false);
    await settle();

    expect(dialog.open).toBe(true);
    expect(directive.state()).toBe('open');

    await wait(45);

    expect(dialog.open).toBe(true);
    expect(host.open()).toBe(true);
    expect(host.closed.length).toBe(0);
  });

  it('supports method=dialog forms and native requestClose()', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);
    const directive = getDirective(fixture);

    await openDialog(fixture);
    const form = fixture.nativeElement.querySelector('#dialog-form') as HTMLFormElement;
    const submitter = getButton(fixture.nativeElement, 'form-close');
    const event = new Event('submit', { bubbles: true, cancelable: true }) as SubmitEvent;
    Object.defineProperty(event, 'submitter', { value: submitter });
    form.dispatchEvent(event);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(host.closed.at(-1)?.source).toBe('form');
    expect(host.closed.at(-1)?.returnValue).toBe('form-value');

    await openDialog(fixture);
    directive.requestNativeClose('native-value');
    fixture.detectChanges();
    await settle();

    expect(dialog.open).toBe(false);
    expect(host.closed.at(-1)?.source).toBe('native');
    expect(host.closed.at(-1)?.returnValue).toBe('native-value');
  });

  it('supports signal, promise, and RxJS Observable close guards', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;

    host.allowClose.set(false);
    await openDialog(fixture);
    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();
    await settle();

    expect(getDialogElement(fixture.nativeElement).open).toBe(true);
    expect(host.blocked.at(-1)?.reason).toBe('guard');

    host.allowClose.set(true);
    host.guard.set(() => Promise.resolve(true));
    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    expect(host.closed.at(-1)?.returnValue).toBe('action-value');

    await openDialog(fixture);
    host.guard.set(of(true));
    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();
    await settle();

    expect(host.closed.at(-1)?.returnValue).toBe('action-value');
  });

  it('blocks repeated close attempts while an async guard is pending', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    let resolveGuard!: (value: boolean) => void;

    host.guard.set(
      () =>
        new Promise<boolean>((resolve) => {
          resolveGuard = resolve;
        }),
    );

    await openDialog(fixture);
    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();

    expect(getDirective(fixture).guardPending()).toBe(true);

    getButton(fixture.nativeElement, 'action-close').click();
    fixture.detectChanges();
    await settle();

    expect(host.blocked.at(-1)?.reason).toBe('pending');

    resolveGuard(false);
    await settle();
    fixture.detectChanges();

    expect(getDialogElement(fixture.nativeElement).open).toBe(true);
    expect(host.blocked.at(-1)?.reason).toBe('guard');
  });

  it('maps variant inputs to classes and data attributes', () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;
    const dialog = getDialogElement(fixture.nativeElement);

    host.size.set('xl');
    host.placement.set('bottom');
    host.animation.set('slide-up');
    host.backdrop.set('blur');
    host.scroll.set('outside');
    fixture.detectChanges();

    expect(dialog.classList.contains('max-w-4xl')).toBe(true);
    expect(dialog.classList.contains('overflow-y-auto')).toBe(true);
    expect(dialog.dataset['placement']).toBe('bottom');
    expect(dialog.dataset['animation']).toBe('slide-up');
    expect(dialog.dataset['backdrop']).toBe('blur');
    expect(dialog.dataset['scroll']).toBe('outside');
  });

  it('maps bottom and right placement state', async () => {
    const bottomFixture = TestBed.createComponent(DialogHost);
    bottomFixture.componentInstance.placement.set('bottom');
    await openDialog(bottomFixture);

    expect(getDialogElement(bottomFixture.nativeElement).dataset['placement']).toBe('bottom');

    const rightFixture = TestBed.createComponent(DialogHost);
    rightFixture.componentInstance.placement.set('right');
    await openDialog(rightFixture);

    expect(getDialogElement(rightFixture.nativeElement).dataset['placement']).toBe('right');
  });

  it('maps header, body, and footer section directive classes', () => {
    const fixture = TestBed.createComponent(DialogHost);
    const host = fixture.componentInstance;

    fixture.detectChanges();

    const header = getElementByClass(fixture.nativeElement, 'section-header');
    const body = getElementByClass(fixture.nativeElement, 'section-body');
    const footer = getElementByClass(fixture.nativeElement, 'section-footer');

    expect(header.classList.contains('dialog-modal-header')).toBe(true);
    expect(header.classList.contains('items-center')).toBe(true);
    expect(header.classList.contains('px-6')).toBe(true);
    expect(header.classList.contains('sticky')).toBe(true);

    expect(body.classList.contains('dialog-modal-body')).toBe(true);
    expect(body.classList.contains('px-4')).toBe(true);
    expect(body.classList.contains('overflow-y-auto')).toBe(true);

    host.bodyScroll.set(false);
    fixture.detectChanges();

    expect(body.classList.contains('overflow-y-auto')).toBe(false);

    expect(footer.classList.contains('dialog-modal-footer')).toBe(true);
    expect(footer.classList.contains('justify-end')).toBe(true);
    expect(footer.classList.contains('custom-footer')).toBe(true);
  });

  it('renders header only when a dialogModalHeader template exists', () => {
    const fixture = TestBed.createComponent(OptionalHeaderHost);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialog-modal-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('#optional-body-content')).not.toBeNull();

    fixture.componentInstance.showHeader.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dialog-modal-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#optional-header-content')?.textContent).toContain('Optional header');
  });
});

async function openDialog(fixture: ReturnType<typeof TestBed.createComponent<DialogHost>>): Promise<void> {
  fixture.componentInstance.open.set(true);
  fixture.detectChanges(false);
  await settle();
}

function getDirective(fixture: ReturnType<typeof TestBed.createComponent<DialogHost>>): DialogModalDirective {
  return fixture.debugElement.query(By.directive(DialogModalDirective)).injector.get(DialogModalDirective);
}

function getDialogElement(root: HTMLElement): HTMLDialogElement {
  return root.querySelector('dialog') as HTMLDialogElement;
}

function getButton(root: HTMLElement, id: string): HTMLButtonElement {
  return root.querySelector(`#${id}`) as HTMLButtonElement;
}

function getElementByClass(root: HTMLElement, className: string): HTMLElement {
  return root.querySelector(`.${className}`) as HTMLElement;
}

function rect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function installDialogPolyfill(): void {
  const prototype = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: (returnValue?: string) => void;
    requestClose?: (returnValue?: string) => void;
  };

  Object.defineProperty(prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement, returnValue = '') {
      this.returnValue = returnValue;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });

  Object.defineProperty(prototype, 'requestClose', {
    configurable: true,
    value(this: HTMLDialogElement, returnValue = '') {
      const event = new Event('cancel', { cancelable: true });
      const shouldClose = this.dispatchEvent(event);

      if (shouldClose) {
        this.close(returnValue);
      }
    },
  });

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
