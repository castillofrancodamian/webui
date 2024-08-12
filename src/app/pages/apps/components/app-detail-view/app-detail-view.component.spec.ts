import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';
import { createRoutingFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { MockComponents, MockModule } from 'ng-mocks';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { of } from 'rxjs';
import { mockCall, mockJob, mockWebSocket } from 'app/core/testing/utils/mock-websocket.utils';
import { App } from 'app/interfaces/app.interface';
import { AvailableApp } from 'app/interfaces/available-app.interface';
import { CatalogApp } from 'app/interfaces/catalog.interface';
import { PageHeaderModule } from 'app/modules/page-header/page-header.module';
import { OrNotAvailablePipe } from 'app/modules/pipes/or-not-available/or-not-available.pipe';
import { AppCardLogoComponent } from 'app/pages/apps/components/app-card-logo/app-card-logo.component';
import {
  AppAvailableInfoCardComponent,
} from 'app/pages/apps/components/app-detail-view/app-available-info-card/app-available-info-card.component';
import { AppDetailViewComponent } from 'app/pages/apps/components/app-detail-view/app-detail-view.component';
import {
  AppDetailsHeaderComponent,
} from 'app/pages/apps/components/app-detail-view/app-details-header/app-details-header.component';
import {
  AppDetailsSimilarComponent,
} from 'app/pages/apps/components/app-detail-view/app-details-similar/app-details-similar.component';
import {
  AppResourcesCardComponent,
} from 'app/pages/apps/components/app-detail-view/app-resources-card/app-resources-card.component';
import { AppsStore } from 'app/pages/apps/store/apps-store.service';
import { DockerStore } from 'app/pages/apps/store/docker.store';
import { InstalledAppsStore } from 'app/pages/apps/store/installed-apps-store.service';
import { AuthService } from 'app/services/auth/auth.service';

const appsResponse = [{
  name: 'webdav',
  catalog: 'TRUENAS',
  train: 'community',
  description: 'webdav',
  app_readme: '<h1>WebDAV</h1>\n<p> When application ...</p>',
  last_update: { $date: 452 },
}] as AvailableApp[];

const existingCatalogApp = {
  name: 'webdav',
  versions: {
    ['1.0.9' as string]: {},
  },
  latest_version: '1.0.9',
} as CatalogApp;

describe('AppDetailViewComponent', () => {
  let spectator: Spectator<AppDetailViewComponent>;
  let loader: HarnessLoader;

  const createComponent = createRoutingFactory({
    component: AppDetailViewComponent,
    imports: [
      NgxSkeletonLoaderModule,
      MockModule(PageHeaderModule),
      OrNotAvailablePipe,
    ],
    declarations: [
      AppDetailsHeaderComponent,
      MockComponents(
        AppResourcesCardComponent,
        AppAvailableInfoCardComponent,
        AppCardLogoComponent,
        AppDetailsSimilarComponent,
      ),
    ],
    providers: [
      InstalledAppsStore,
      mockWebSocket([
        mockJob('app.create'),
        mockJob('app.update'),
        mockCall('catalog.get_app_details', existingCatalogApp),
        mockCall('app.query', [{} as App]),
        mockCall('service.started', true),
      ]),
      mockProvider(AuthService, {
        user$: of({ attributes: { appsAgreement: true } }),
        hasRole: () => of(true),
      }),
      mockProvider(AppsStore, {
        availableApps$: of(appsResponse),
        isLoading$: of(false),
      }),
      mockProvider(DockerStore, {
        selectedPool$: of('pool'),
      }),
    ],
    params: { appId: 'webdav', catalog: 'TRUENAS', train: 'community' },
  });

  beforeEach(() => {
    spectator = createComponent();
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
  });

  it('redirect to install app when Install button is pressed', async () => {
    const saveButton = await loader.getHarness(MatButtonHarness.with({ text: 'Install' }));
    await saveButton.click();
    expect(spectator.inject(Router).navigate).toHaveBeenCalledWith(['/apps', 'available', 'community', 'webdav', 'install']);
  });
});