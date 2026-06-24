import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

export type DialogSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'fullscreen'
  | 'fullscreen-sm'
  | 'fullscreen-md'
  | 'fullscreen-lg';

export type DialogPlacement = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type DialogAnimation = 'fade' | 'scale' | 'slide-down' | 'slide-up' | 'slide-left' | 'slide-right' | 'none';
export type DialogBackdrop = 'dim' | 'blur' | 'soft' | 'dark' | 'transparent' | 'none';
export type DialogScroll = 'inside' | 'outside';
export type DialogRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type DialogShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type DialogSectionPadding = 'none' | 'sm' | 'md' | 'lg';
export type DialogSectionDivider = 'none' | 'top' | 'bottom' | 'both';
export type DialogHeaderLayout = 'start' | 'center' | 'between';
export type DialogFooterLayout = 'start' | 'center' | 'end' | 'between' | 'stack';

export type DialogOpenSource = 'api' | 'trigger';
export type DialogCloseSource = 'api' | 'action' | 'backdrop' | 'escape' | 'form' | 'native';
export type DialogBlockReason = 'policy' | 'guard' | 'pending' | 'closing';

export interface DialogOpenedEvent {
  source: DialogOpenSource;
  nativeElement: HTMLDialogElement;
}

export interface DialogCloseRequest {
  source: DialogCloseSource;
  returnValue: string;
  nativeEvent?: Event;
  nativeElement: HTMLDialogElement;
}

export interface DialogCloseBlockedEvent extends DialogCloseRequest {
  reason: DialogBlockReason;
}

export interface DialogClosedEvent extends DialogCloseRequest {
  wasOpen: boolean;
}

export type DialogGuardResult = boolean | Promise<boolean> | Observable<boolean>;
export type DialogCloseGuardFn = (request: DialogCloseRequest) => DialogGuardResult;
export type DialogCanClose = boolean | Signal<boolean> | DialogCloseGuardFn | Promise<boolean> | Observable<boolean>;
