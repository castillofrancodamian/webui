import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { MockComponents, MockDirective } from 'ng-mocks';
import { mockAuth } from 'app/core/testing/utils/mock-auth.utils';
import { DetailsHeightDirective } from 'app/directives/details-height/details-height.directive';
import { VirtualizationInstance } from 'app/interfaces/virtualization.interface';
import {
  AllInstancesHeaderComponent,
} from 'app/pages/virtualization/components/all-instances/all-instances-header/all-instances-header.component';
import { AllInstancesComponent } from 'app/pages/virtualization/components/all-instances/all-instances.component';
import {
  InstanceDetailsComponent,
} from 'app/pages/virtualization/components/all-instances/instance-details/instance-details.component';
import { InstanceListComponent } from 'app/pages/virtualization/components/all-instances/instance-list/instance-list.component';
import { VirtualizationConfigStore } from 'app/pages/virtualization/stores/virtualization-config.store';
import { VirtualizationDevicesStore } from 'app/pages/virtualization/stores/virtualization-devices.store';
import { VirtualizationInstancesStore } from 'app/pages/virtualization/stores/virtualization-instances.store';
import { VirtualizationViewStore } from 'app/pages/virtualization/stores/virtualization-view.store';

describe('AllInstancesComponent', () => {
  let spectator: Spectator<AllInstancesComponent>;
  const createComponent = createComponentFactory({
    component: AllInstancesComponent,
    providers: [
      mockAuth(),
      mockProvider(VirtualizationConfigStore, {
        initialize: jest.fn(),
      }),
      mockProvider(VirtualizationInstancesStore, {
        initialize: jest.fn(),
      }),
      mockProvider(VirtualizationViewStore, {
        initialize: jest.fn(),
        showMobileDetails: jest.fn(),
        setMobileDetails: jest.fn(),
      }),
      mockProvider(VirtualizationDevicesStore, {
        selectedInstance: jest.fn(() => ({ id: 'instance1' } as VirtualizationInstance)),
        resetInstance: jest.fn(),
      }),
    ],
    declarations: [
      MockDirective(DetailsHeightDirective),
      MockComponents(
        AllInstancesHeaderComponent,
        InstanceDetailsComponent,
        InstanceListComponent,
      ),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('initializes config store on init', () => {
    expect(spectator.inject(VirtualizationConfigStore).initialize).toHaveBeenCalled();
    expect(spectator.inject(VirtualizationInstancesStore).initialize).toHaveBeenCalled();
    expect(spectator.inject(VirtualizationViewStore).initialize).toHaveBeenCalled();
  });
});
