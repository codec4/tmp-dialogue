import { booleanAttribute, computed, Directive, inject, input, TemplateRef } from '@angular/core';

import { DialogFooterLayout, DialogHeaderLayout, DialogSectionDivider, DialogSectionPadding } from './dialog.types';

const PADDING_CLASSES: Record<DialogSectionPadding, string> = {
  none: 'p-0',
  sm: 'px-4 py-3',
  md: 'px-5 py-4',
  lg: 'px-6 py-5',
};

const DIVIDER_CLASSES: Record<DialogSectionDivider, string> = {
  none: '',
  top: 'border-t border-zinc-200',
  bottom: 'border-b border-zinc-200',
  both: 'border-y border-zinc-200',
};

const HEADER_LAYOUT_CLASSES: Record<DialogHeaderLayout, string> = {
  start: 'flex items-start gap-4',
  center: 'flex flex-col items-center gap-3 text-center',
  between: 'flex items-start justify-between gap-4',
};

const FOOTER_LAYOUT_CLASSES: Record<DialogFooterLayout, string> = {
  start: 'flex flex-wrap items-center justify-start gap-2',
  center: 'flex flex-wrap items-center justify-center gap-2',
  end: 'flex flex-wrap items-center justify-end gap-2',
  between: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between',
  stack: 'flex flex-col gap-2',
};

@Directive({
  selector: 'ng-template[dialogModalHeader]',
})
export class DialogModalHeaderDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  readonly padding = input<DialogSectionPadding>('md', { alias: 'dialogModalHeaderPadding' });
  readonly divider = input<DialogSectionDivider>('bottom', { alias: 'dialogModalHeaderDivider' });
  readonly layout = input<DialogHeaderLayout>('between', { alias: 'dialogModalHeaderLayout' });
  readonly sticky = input(false, { alias: 'dialogModalHeaderSticky', transform: booleanAttribute });
  readonly customClass = input('', { alias: 'dialogModalHeaderClass' });

  readonly className = computed(() =>
    [
      'dialog-modal-header shrink-0 bg-white',
      HEADER_LAYOUT_CLASSES[this.layout()],
      PADDING_CLASSES[this.padding()],
      DIVIDER_CLASSES[this.divider()],
      this.sticky() ? 'sticky top-0 z-10' : '',
      this.customClass(),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

@Directive({
  selector: 'ng-template[dialogModalBody]',
})
export class DialogModalBodyDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  readonly padding = input<DialogSectionPadding>('md', { alias: 'dialogModalBodyPadding' });
  readonly divider = input<DialogSectionDivider>('none', { alias: 'dialogModalBodyDivider' });
  readonly scroll = input(true, { alias: 'dialogModalBodyScroll', transform: booleanAttribute });
  readonly customClass = input('', { alias: 'dialogModalBodyClass' });

  readonly className = computed(() =>
    [
      'dialog-modal-body min-h-0 flex-1 space-y-4',
      PADDING_CLASSES[this.padding()],
      DIVIDER_CLASSES[this.divider()],
      this.scroll() ? 'max-h-[min(34rem,calc(100dvh-12rem))] overflow-y-auto overscroll-contain' : '',
      this.customClass(),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

@Directive({
  selector: 'ng-template[dialogModalFooter]',
})
export class DialogModalFooterDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  readonly padding = input<DialogSectionPadding>('md', { alias: 'dialogModalFooterPadding' });
  readonly divider = input<DialogSectionDivider>('top', { alias: 'dialogModalFooterDivider' });
  readonly layout = input<DialogFooterLayout>('between', { alias: 'dialogModalFooterLayout' });
  readonly sticky = input(false, { alias: 'dialogModalFooterSticky', transform: booleanAttribute });
  readonly customClass = input('', { alias: 'dialogModalFooterClass' });

  readonly className = computed(() =>
    [
      'dialog-modal-footer shrink-0 bg-white',
      FOOTER_LAYOUT_CLASSES[this.layout()],
      PADDING_CLASSES[this.padding()],
      DIVIDER_CLASSES[this.divider()],
      this.sticky() ? 'sticky bottom-0 z-10' : '',
      this.customClass(),
    ]
      .filter(Boolean)
      .join(' '),
  );
}
