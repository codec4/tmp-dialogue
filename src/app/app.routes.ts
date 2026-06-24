import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'modals',
    loadComponent: () => import('./features/modal-showcase/modal-showcase').then((module) => module.ModalShowcase),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'modals',
  },
  {
    path: '**',
    redirectTo: 'modals',
  },
];
