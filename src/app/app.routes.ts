import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'generate', pathMatch: 'full' },
  { path: 'generate', loadComponent: () => import('./pages/generate/generate.component').then(m => m.GenerateComponent) },
  { path: 'process', loadComponent: () => import('./pages/process/process.component').then(m => m.ProcessComponent) },
  { path: 'upload', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },
  { path: 'report', loadComponent: () => import('./pages/report/report.component').then(m => m.ReportComponent) }
];
