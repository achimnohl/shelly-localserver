import { Route } from '@angular/router';
import { DeviceListComponent } from './components/device-list/device-list.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: DeviceListComponent,
  },
  {
    path: 'devices',
    component: DeviceListComponent,
  },
];
