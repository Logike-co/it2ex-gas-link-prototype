import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Sin agrupar la detección de cambios por eventos: con las pantallas precargadas, una
    // navegación termina en el mismo evento que la inicia, y la pantalla nueva (sus campos y la
    // barra de la sesión) debe quedar pintada y enlazada al final de ese evento, no un cuadro después.
    provideZoneChangeDetection(),
    // Las pantallas se cargan por demanda y luego se precargan todas: navegar no espera la red.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
  ],
};
