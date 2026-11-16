import { ApplicationConfig } from '@angular/core';
import { PreloadAllModules, provideRouter, withHashLocation, withPreloading } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Маршрутизація через # дозволяє розміщувати застосунок на будь-якому статичному хостингу.
    // Решта сторінок підвантажується у фоні після відкриття головної, тому перехід між ними миттєвий.
    provideRouter(routes, withHashLocation(), withPreloading(PreloadAllModules)),
    provideHttpClient()
  ]
};
