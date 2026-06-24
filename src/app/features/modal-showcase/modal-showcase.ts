import { Component, computed, signal } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import {
  DialogAnimation,
  DialogBackdrop,
  DialogCanClose,
  DialogCloseBlockedEvent,
  DialogCloseRequest,
  DialogCloseSource,
  DialogClosedEvent,
  DialogCloseDirective,
  DialogModalBodyDirective,
  DialogModalFooterDirective,
  DialogModalHeaderDirective,
  DialogModalDirective,
  DialogPlacement,
  DialogScroll,
  DialogSize,
  DialogTriggerDirective,
} from '../../shared/dialog';

type GuardMode = 'signal' | 'promise' | 'rxjs';

@Component({
  selector: 'app-modal-showcase',
  imports: [
    DialogModalDirective,
    DialogModalHeaderDirective,
    DialogModalBodyDirective,
    DialogModalFooterDirective,
    DialogTriggerDirective,
    DialogCloseDirective,
  ],
  templateUrl: './modal-showcase.html',
  styleUrl: './modal-showcase.css',
})
export class ModalShowcase {
  readonly sizes: DialogSize[] = ['xs', 'sm', 'md', 'lg', 'xl', 'fullscreen', 'fullscreen-sm', 'fullscreen-md', 'fullscreen-lg'];
  readonly placements: DialogPlacement[] = ['center', 'top', 'bottom', 'left', 'right'];
  readonly animations: DialogAnimation[] = ['fade', 'scale', 'slide-down', 'slide-up', 'slide-left', 'slide-right', 'none'];
  readonly backdrops: DialogBackdrop[] = ['dim', 'blur', 'soft', 'dark', 'transparent', 'none'];
  readonly scrollModes: DialogScroll[] = ['inside', 'outside'];
  readonly guardModes: GuardMode[] = ['signal', 'promise', 'rxjs'];

  readonly primaryOpen = signal(false);
  readonly nestedOpen = signal(false);
  readonly size = signal<DialogSize>('md');
  readonly placement = signal<DialogPlacement>('center');
  readonly animation = signal<DialogAnimation>('scale');
  readonly backdrop = signal<DialogBackdrop>('dim');
  readonly scroll = signal<DialogScroll>('inside');
  readonly closeOnBackdrop = signal(true);
  readonly closeOnEscape = signal(true);
  readonly allowClose = signal(true);
  readonly guardMode = signal<GuardMode>('signal');
  readonly animationMs = signal(180);
  readonly closeAnimationMs = signal(70);

  readonly closeGuard = computed<DialogCanClose>(() => {
    const mode = this.guardMode();

    if (mode === 'signal') {
      return this.allowClose;
    }

    if (mode === 'promise') {
      return (_request: DialogCloseRequest) =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(this.allowClose()), 320);
        });
    }

    return (_request: DialogCloseRequest): Observable<boolean> => of(this.allowClose()).pipe(delay(320));
  });

  readonly lastEvent = signal('No dialog events yet.');
  readonly guardLabel = computed(() => {
    if (this.guardMode() === 'signal') {
      return 'Signal guard';
    }

    return this.guardMode() === 'promise' ? 'Promise guard' : 'RxJS Observable guard';
  });

  openFromState(): void {
    this.primaryOpen.set(true);
  }

  requestApiClose(): void {
    this.primaryOpen.set(false);
  }

  setAnimationMs(value: Event): void {
    const input = value.target instanceof HTMLInputElement ? value.target : null;
    this.animationMs.set(input ? Number(input.value) : 180);
  }

  setCloseAnimationMs(value: Event): void {
    const input = value.target instanceof HTMLInputElement ? value.target : null;
    this.closeAnimationMs.set(input ? Number(input.value) : 70);
  }

  setSize(value: DialogSize): void {
    this.size.set(value);
  }

  setPlacement(value: DialogPlacement): void {
    this.placement.set(value);
  }

  setAnimation(value: DialogAnimation): void {
    this.animation.set(value);
  }

  setBackdrop(value: DialogBackdrop): void {
    this.backdrop.set(value);
  }

  setScroll(value: DialogScroll): void {
    this.scroll.set(value);
  }

  setGuardMode(value: GuardMode): void {
    this.guardMode.set(value);
  }

  toggleBackdrop(): void {
    this.closeOnBackdrop.update((value) => !value);
  }

  toggleEscape(): void {
    this.closeOnEscape.update((value) => !value);
  }

  toggleAllowClose(): void {
    this.allowClose.update((value) => !value);
  }

  onCloseRequested(event: DialogCloseRequest): void {
    this.lastEvent.set(`Close requested: ${this.formatSource(event.source)} (${event.returnValue || 'no return value'})`);
  }

  onCloseBlocked(event: DialogCloseBlockedEvent): void {
    this.lastEvent.set(`Close blocked by ${event.reason}: ${this.formatSource(event.source)}`);
  }

  onClosed(event: DialogClosedEvent): void {
    this.lastEvent.set(`Closed by ${this.formatSource(event.source)} with "${event.returnValue || 'empty'}"`);
  }

  private formatSource(source: DialogCloseSource): string {
    return source.replace('-', ' ');
  }
}
