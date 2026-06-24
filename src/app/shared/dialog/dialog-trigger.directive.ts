import { Directive, HostListener, input } from '@angular/core';

import { DialogModalDirective } from './dialog-modal.directive';

@Directive({
  selector: '[dialogTriggerFor]',
})
export class DialogTriggerDirective {
  readonly target = input.required<DialogModalDirective>({ alias: 'dialogTriggerFor' });

  @HostListener('click')
  onClick(): void {
    this.target().show('trigger');
  }
}
