import { Directive, HostListener, inject, input } from '@angular/core';

import { DialogModalDirective } from './dialog-modal.directive';

@Directive({
  selector: '[dialogClose]',
})
export class DialogCloseDirective {
  readonly #nearestModal = inject(DialogModalDirective, { optional: true });

  readonly returnValue = input<unknown>('', { alias: 'dialogClose' });
  readonly target = input<DialogModalDirective | null>(null, { alias: 'dialogCloseFor' });

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();

    const modal = this.target() ?? this.#nearestModal;

    if (!modal) {
      return;
    }

    void modal.requestClose('action', this.#normalizeReturnValue(event), event);
  }

  #normalizeReturnValue(event: Event): string {
    const explicitValue = this.returnValue();

    if (explicitValue !== undefined && explicitValue !== null && explicitValue !== '') {
      return String(explicitValue);
    }

    const element = event.currentTarget;

    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      return element.value;
    }

    return '';
  }
}
