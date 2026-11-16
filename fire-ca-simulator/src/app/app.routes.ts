import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Головна | FireSim КА' },
  {
    path: 'simulator',
    title: 'Симулятор | FireSim КА',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/simulator/simulator.component').then((m) => m.SimulatorComponent)
      },
      {
        path: 'results',
        title: 'Результати | FireSim КА',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/results/results.component').then((m) => m.ResultsComponent)
          },
          {
            path: ':id',
            title: 'Запуск | FireSim КА',
            loadComponent: () => import('./pages/results/run-detail.component').then((m) => m.RunDetailComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'methodology',
    title: 'Методологія | FireSim КА',
    loadComponent: () => import('./pages/methodology/methodology.component').then((m) => m.MethodologyComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/methodology/methodology-intro.component').then((m) => m.MethodologyIntroComponent)
      },
      {
        path: 'cellular-automata',
        loadComponent: () => import('./pages/methodology/ca.component').then((m) => m.CaComponent),
        children: [
          {
            path: 'rules',
            loadComponent: () => import('./pages/methodology/ca-rules.component').then((m) => m.CaRulesComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'data-sources',
    title: 'Джерела даних | FireSim КА',
    loadComponent: () => import('./pages/data-sources/data-sources.component').then((m) => m.DataSourcesComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/data-sources/data-overview.component').then((m) => m.DataOverviewComponent)
      },
      {
        path: 'nasa-firms',
        loadComponent: () => import('./pages/data-sources/firms.component').then((m) => m.FirmsComponent),
        children: [
          {
            path: 'points',
            loadComponent: () => import('./pages/data-sources/firms-points.component').then((m) => m.FirmsPointsComponent)
          }
        ]
      },
      {
        path: 'copernicus-dem',
        loadComponent: () => import('./pages/data-sources/dem.component').then((m) => m.DemComponent)
      },
      {
        path: 'era5',
        loadComponent: () => import('./pages/data-sources/era5.component').then((m) => m.Era5Component)
      }
    ]
  },
  {
    path: 'about',
    title: 'Про проєкт | FireSim КА',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent)
  },
  { path: 'results', redirectTo: '/simulator/results', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
