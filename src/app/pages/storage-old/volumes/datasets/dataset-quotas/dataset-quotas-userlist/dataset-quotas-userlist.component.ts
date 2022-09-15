import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild, ChangeDetectionStrategy,
  AfterViewInit,
  TemplateRef,
  OnDestroy,
} from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { filter, switchMap, tap } from 'rxjs/operators';
import { DatasetQuotaType } from 'app/enums/dataset.enum';
import helptext from 'app/helptext/storage/volumes/datasets/dataset-quotas';
import { DatasetQuota, SetDatasetQuota } from 'app/interfaces/dataset-quota.interface';
import { QueryFilter, QueryParams } from 'app/interfaces/query-api.interface';
import { EmptyConfig, EmptyType } from 'app/modules/entity/entity-empty/entity-empty.component';
import { EntityUtils } from 'app/modules/entity/utils';
import { DatasetQuotaAddFormComponent } from 'app/pages/storage-old/volumes/datasets/dataset-quotas/dataset-quota-add-form/dataset-quota-add-form.component';
import { DatasetQuotaEditFormComponent } from 'app/pages/storage-old/volumes/datasets/dataset-quotas/dataset-quota-edit-form/dataset-quota-edit-form.component';
import {
  AppLoaderService, DialogService, StorageService, WebSocketService,
} from 'app/services';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { LayoutService } from 'app/services/layout.service';

@UntilDestroy()
@Component({
  templateUrl: './dataset-quotas-userlist.component.html',
  styleUrls: ['./dataset-quotas-userlist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetQuotasUserlistComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild('pageHeader') pageHeader: TemplateRef<unknown>;

  datasetId: string;
  dataSource: MatTableDataSource<DatasetQuota> = new MatTableDataSource([]);
  invalidQuotas: DatasetQuota[] = [];
  displayedColumns: string[] = ['name', 'id', 'quota', 'used_bytes', 'used_percent', 'obj_quota', 'obj_used', 'obj_used_percent', 'actions'];
  defaultSort: Sort = { active: 'id', direction: 'asc' };

  isLoading = false;
  loadingConfig: EmptyConfig = {
    type: EmptyType.Loading,
    large: false,
    title: this.translate.instant('Loading...'),
  };
  emptyConfig: EmptyConfig = {
    type: EmptyType.NoPageData,
    title: this.translate.instant('No User Quotas'),
    large: true,
  };
  errorConfig: EmptyConfig = {
    type: EmptyType.Errors,
    large: true,
    title: this.translate.instant('Can not retrieve response'),
  };
  emptyOrErrorConfig: EmptyConfig = this.emptyConfig;

  useFullFilter = true;
  protected fullFilter: QueryParams<DatasetQuota> = [['OR', [['quota', '>', 0], ['obj_quota', '>', 0]]]];
  protected emptyFilter: QueryParams<DatasetQuota> = [];
  protected invalidFilter: QueryParams<DatasetQuota> = [['name', '=', null] as QueryFilter<DatasetQuota>] as QueryParams<DatasetQuota>;

  constructor(
    protected ws: WebSocketService,
    protected storageService: StorageService,
    protected dialogService: DialogService,
    protected loader: AppLoaderService,
    protected aroute: ActivatedRoute,
    private translate: TranslateService,
    private slideIn: IxSlideInService,
    private cdr: ChangeDetectorRef,
    private layoutService: LayoutService,
  ) { }

  ngOnInit(): void {
    const paramMap = this.aroute.snapshot.params;
    this.datasetId = paramMap.pk;
    this.useFullFilter = window.localStorage.getItem('useFullFilter') !== 'false';
    this.getUserQuotas();

    this.slideIn.onClose$.pipe(untilDestroyed(this)).subscribe(() => {
      this.getUserQuotas();
    });
  }

  ngAfterViewInit(): void {
    this.layoutService.pageHeaderUpdater$.next(this.pageHeader);
  }

  ngOnDestroy(): void {
    window.localStorage.setItem('useFullFilter', 'true');
  }

  renderRowValue(row: DatasetQuota, field: string): string | number {
    switch (field) {
      case 'name':
        if (!row[field]) {
          return `*ERR* (${this.translate.instant(helptext.shared.nameErr)}), ID: ${row.id}`;
        }
        return row[field];
      case 'quota':
        return this.storageService.convertBytesToHumanReadable(row[field], 0);
      case 'used_percent':
        return `${Math.round(row[field] * 100) / 100}%`;
      case 'obj_used_percent':
        return `${Math.round(row[field] * 100) / 100}%`;
      case 'used_bytes':
        if (row[field] !== 0) {
          return this.storageService.convertBytesToHumanReadable(row[field], 2);
        }
        return row[field];
      default:
        return row[field as keyof DatasetQuota];
    }
  }

  private getRemoveQuotaPayload(quotas: DatasetQuota[]): SetDatasetQuota[] {
    const payload: SetDatasetQuota[] = [];
    for (const quota of quotas) {
      payload.push({
        id: quota.id.toString(),
        quota_type: DatasetQuotaType.User,
        quota_value: 0,
      });
      payload.push({
        id: quota.id.toString(),
        quota_type: DatasetQuotaType.UserObj,
        quota_value: 0,
      });
    }
    return payload;
  }

  getUserQuotas(): void {
    const filter = this.useFullFilter ? this.fullFilter : this.emptyFilter;
    this.isLoading = true;
    this.ws.call(
      'pool.dataset.get_quota',
      [this.datasetId, DatasetQuotaType.User, filter],
    ).pipe(untilDestroyed(this)).subscribe({
      next: (quotas: DatasetQuota[]) => {
        this.isLoading = false;
        this.createDataSource(quotas);
        this.checkInvalidQuotas();
      },
      error: () => {
        this.emptyOrErrorConfig = this.errorConfig;
      },
    });
  }

  createDataSource(quotas: DatasetQuota[] = []): void {
    if (!quotas.length) {
      this.emptyOrErrorConfig = this.emptyConfig;
    }
    this.dataSource = new MatTableDataSource(quotas);
    this.dataSource.sort = this.sort;
    this.cdr.markForCheck();
  }

  checkInvalidQuotas(): void {
    this.ws.call(
      'pool.dataset.get_quota',
      [this.datasetId, DatasetQuotaType.User, this.invalidFilter],
    ).pipe(untilDestroyed(this)).subscribe((quotas: DatasetQuota[]) => {
      if (quotas?.length) {
        this.invalidQuotas = quotas;
      }
    });
  }

  toggleDisplay(): void {
    let title: string = helptext.users.filter_dialog.title_filter;
    let message: string = helptext.users.filter_dialog.message_filter;
    let button: string = helptext.users.filter_dialog.button_filter;
    if (this.useFullFilter) {
      title = helptext.users.filter_dialog.title_show;
      message = helptext.users.filter_dialog.message_show;
      button = helptext.users.filter_dialog.button_show;
    }

    this.useFullFilter = !this.useFullFilter;
    this.dialogService.confirm({
      title,
      message,
      hideCheckBox: true,
      buttonMsg: button,
    }).pipe(untilDestroyed(this)).subscribe((confirmed) => {
      if (confirmed) {
        window.localStorage.setItem('useFullFilter', this.useFullFilter.toString());
        this.getUserQuotas();
      } else {
        this.useFullFilter = !this.useFullFilter;
      }
    });
  }

  removeInvalidQuotas(): void {
    this.dialogService.confirm({
      title: this.translate.instant('Remove Invalid Quotas'),
      message: this.translate.instant('This action will set all dataset quotas for the removed or invalid users to 0,\
 virutally removing any dataset quota entires for such users. Are you sure you want to proceed?'),
      buttonMsg: this.translate.instant('Remove'),
    }).pipe(filter(Boolean), untilDestroyed(this)).subscribe(() => {
      this.loader.open();
      this.ws.call('pool.dataset.set_quota', [this.datasetId, this.getRemoveQuotaPayload(this.invalidQuotas)])
        .pipe(untilDestroyed(this))
        .subscribe({
          next: () => {
            this.loader.close();
            this.getUserQuotas();
          },
          error: (err) => {
            this.loader.close();
            new EntityUtils().handleWsError(this, err, this.dialogService);
          },
        });
    });
  }

  doAdd(): void {
    const form = this.slideIn.open(DatasetQuotaAddFormComponent);
    form.setupAddQuotaForm(DatasetQuotaType.User, this.datasetId);
  }

  doEdit(row: DatasetQuota): void {
    const form = this.slideIn.open(DatasetQuotaEditFormComponent);
    form.setupEditQuotaForm(DatasetQuotaType.User, this.datasetId, row.id);
  }

  doDelete(row: DatasetQuota): void {
    this.dialogService.confirm({
      title: this.translate.instant('Delete User Quota'),
      message: this.translate.instant('Are you sure you want to delete the user quota <b>{name}</b>?', { name: row.name }),
      buttonMsg: this.translate.instant('Delete'),
      hideCheckBox: true,
    }).pipe(
      filter(Boolean),
      tap(() => this.loader.open()),
      switchMap(() => this.ws.call('pool.dataset.set_quota', [this.datasetId, this.getRemoveQuotaPayload([row])])),
      untilDestroyed(this),
    ).subscribe({
      next: () => {
        this.loader.close();
        this.getUserQuotas();
      },
      error: (err) => {
        this.loader.close();
        new EntityUtils().handleWsError(this, err, this.dialogService);
      },
    });
  }

  filter(value: string): void {
    this.dataSource.filter = value;
  }
}