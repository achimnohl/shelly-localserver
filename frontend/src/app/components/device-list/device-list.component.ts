import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DeviceService } from '../../services/device.service';
import { WebSocketService } from '../../services/websocket.service';
import { PowerMonitoringService } from '../../services/power-monitoring.service';
import { Device } from '../../models/device.model';
import { EditMetadataDialogComponent } from './edit-metadata-dialog.component';
import { Subject, takeUntil, timeout, catchError, of } from 'rxjs';

@Component({
  selector: 'app-device-list',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss'],
})
export class DeviceListComponent implements OnInit, OnDestroy {
  devices: Device[] = [];
  loading = false;
  discovering = false;
  queryingPower = false;
  error: string | null = null;
  discoveryMessage: string | null = null;
  viewMode: 'cards' | 'list' = 'cards';
  private destroy$ = new Subject<void>();

  constructor(
    private deviceService: DeviceService,
    private wsService: WebSocketService,
    private powerService: PowerMonitoringService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  get devicesByRoom(): Map<string, Device[]> {
    const grouped = new Map<string, Device[]>();
    
    this.devices.forEach(device => {
      const roomName = device.metadata?.roomName || 'Uncategorized';
      if (!grouped.has(roomName)) {
        grouped.set(roomName, []);
      }
      grouped.get(roomName)!.push(device);
    });

    // Sort rooms alphabetically, but put 'Uncategorized' last
    return new Map([...grouped.entries()].sort((a, b) => {
      if (a[0] === 'Uncategorized') return 1;
      if (b[0] === 'Uncategorized') return -1;
      return a[0].localeCompare(b[0]);
    }));
  }

  get roomNames(): string[] {
    return Array.from(this.devicesByRoom.keys());
  }

  getDevicesForRoom(roomName: string): Device[] {
    return this.devicesByRoom.get(roomName) || [];
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'cards' ? 'list' : 'cards';
  }

  ngOnInit(): void {
    this.loadDevices();
    this.subscribeToWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDevices(): void {
    this.loading = true;
    this.error = null;
    
    console.log('DeviceListComponent: Loading devices...');
    
    this.deviceService
      .getAllDevices()
      .pipe(
        timeout(30000), // 30 second timeout
        catchError((err) => {
          console.error('DeviceListComponent: Error caught in pipe:', err);
          this.error = 'Failed to load devices: ' + (err.message || err.name || 'Unknown error');
          this.cdr.detectChanges();
          return of([]); // Return empty array on error
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (devices) => {
          console.log('DeviceListComponent: Received devices:', devices);
          console.log('DeviceListComponent: Device count:', devices.length);
          this.devices = devices;
          this.loading = false;
          console.log('DeviceListComponent: Loading complete');
          this.cdr.detectChanges(); // Force change detection
        },
        error: (err) => {
          console.error('DeviceListComponent: Error in subscribe:', err);
          this.error = 'Failed to load devices: ' + (err.message || err.name || 'Unknown error');
          this.loading = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          console.log('DeviceListComponent: Observable completed');
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private subscribeToWebSocket(): void {
    // Subscribe to device updates
    this.wsService
      .onDeviceUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const device = this.devices.find((d) => d._id === event.deviceId);
        if (device) {
          device.state = event.state;
          device.online = event.state.online;
          
          // Update power metrics if available
          if (event.state.power !== undefined) {
            device.currentPower = event.state.power;
            device.lastPowerUpdate = new Date();
          }
          if (event.state.voltage !== undefined) {
            device.voltage = event.state.voltage;
          }
          if (event.state.current !== undefined) {
            device.current = event.state.current;
          }
          if (event.state.energy !== undefined) {
            device.totalEnergy = event.state.energy;
          }
          
          this.cdr.detectChanges();
        }
      });

    // Subscribe to device online events
    this.wsService
      .onDeviceOnline()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const device = this.devices.find((d) => d._id === event.deviceId);
        if (device) {
          device.online = true;
        }
      });

    // Subscribe to device offline events
    this.wsService
      .onDeviceOffline()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const device = this.devices.find((d) => d._id === event.deviceId);
        if (device) {
          device.online = false;
        }
      });
  }

  toggleDevice(device: Device): void {
    if (!device._id) return;

    this.deviceService
      .controlDevice(device._id, { action: 'toggle' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDevice) => {
          console.log('Toggle response:', updatedDevice);
          const index = this.devices.findIndex((d) => d._id === device._id);
          if (index !== -1) {
            // Create a new array to trigger change detection
            this.devices = [
              ...this.devices.slice(0, index),
              updatedDevice,
              ...this.devices.slice(index + 1)
            ];
          }
          this.snackBar.open(`${updatedDevice.name || device.name} toggled successfully`, 'Close', { duration: 3000 });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error controlling device:', err);
          this.snackBar.open(`Failed to control ${device.name}`, 'Close', { duration: 5000 });
        },
      });
  }

  deleteDevice(device: Device): void {
    if (!device._id) return;
    
    // Material Design way - you could use MatDialog for confirmation in the future
    if (confirm(`Are you sure you want to delete ${device.name}?`)) {
      this.deviceService
        .deleteDevice(device._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.devices = this.devices.filter((d) => d._id !== device._id);
            this.snackBar.open(`${device.name} deleted successfully`, 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting device:', err);
            this.snackBar.open(`Failed to delete ${device.name}`, 'Close', { duration: 5000 });
          },
        });
    }
  }

  editMetadata(device: Device): void {
    if (!device._id) return;

    const dialogRef = this.dialog.open(EditMetadataDialogComponent, {
      width: '500px',
      data: device
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && device._id) {
        this.deviceService
          .updateDeviceMetadata(device._id, result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedDevice) => {
              const index = this.devices.findIndex((d) => d._id === device._id);
              if (index !== -1) {
                this.devices[index] = updatedDevice;
              }
              this.snackBar.open(`${device.name} metadata updated`, 'Close', { duration: 3000 });
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error updating device metadata:', err);
              this.snackBar.open(`Failed to update ${device.name} metadata`, 'Close', { duration: 5000 });
            },
          });
      }
    });
  }

  refreshStatus(device: Device): void {
    if (!device._id) return;

    this.deviceService
      .getDeviceStatus(device._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          const index = this.devices.findIndex((d) => d._id === device._id);
          if (index !== -1) {
            this.devices[index].state = status;
            this.devices[index].online = status.online;
          }
          this.snackBar.open(`${device.name} refreshed`, 'Close', { duration: 2000 });
        },
        error: (err) => {
          console.error('Error refreshing device status:', err);
          this.snackBar.open(`Failed to refresh ${device.name}`, 'Close', { duration: 3000 });
        },
      });
  }

  getDevicePowerInfo(device: Device): string {
    // Try new dedicated power field first, fallback to state.power
    const power = device.currentPower ?? device.state?.power;
    
    if (power !== undefined && power !== null && power > 0) {
      return `${power.toFixed(1)}W`;
    }
    
    return 'N/A';
  }

  getDeviceVoltage(device: Device): string {
    const voltage = device.voltage ?? device.state?.voltage;
    if (voltage !== undefined && voltage !== null) {
      return `${voltage.toFixed(0)}V`;
    }
    return '';
  }

  getDeviceCurrent(device: Device): string {
    const current = device.current ?? device.state?.current;
    if (current !== undefined && current !== null) {
      return `${current.toFixed(2)}A`;
    }
    return '';
  }

  getSwitchState(device: Device): boolean {
    if (!device.state) return false;
    return device.state.output === true || device.state.on === true;
  }

  discoverAndSaveDevices(): void {
    this.discovering = true;
    this.error = null;
    this.discoveryMessage = 'Scanning network for Shelly devices...';
    
    this.deviceService
      .scanSubnetAndSave()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.discovering = false;
          this.discoveryMessage = `Discovery complete! Found ${result.discovered} devices, saved ${result.saved} new devices.`;
          if (result.skipped > 0) {
            this.discoveryMessage += ` (${result.skipped} already existed)`;
          }
          // Reload the device list
          this.loadDevices();
          // Clear message after 5 seconds
          setTimeout(() => {
            this.discoveryMessage = null;
          }, 5000);
        },
        error: (err) => {
          this.discovering = false;
          this.error = 'Discovery failed: ' + (err.error?.message || err.message);
          this.discoveryMessage = null;
          console.error('Error during discovery:', err);
        },
      });
  }

  queryAllPower(): void {
    this.queryingPower = true;
    this.snackBar.open('Querying power data from all devices...', 'Close', { duration: 3000 });
    
    this.powerService
      .queryAllDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.queryingPower = false;
          if (response.success) {
            const successful = response.results.filter((r: any) => r.success).length;
            this.snackBar.open(
              `Power data updated for ${successful}/${response.results.length} devices`,
              'Close',
              { duration: 3000 }
            );
            // Reload devices to show updated power data
            this.loadDevices();
          } else {
            this.snackBar.open('Failed to query power data', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          this.queryingPower = false;
          this.snackBar.open('Error querying power data: ' + err.message, 'Close', { duration: 3000 });
          console.error('Error querying power:', err);
        },
      });
  }

  getLastPowerUpdate(device: Device): string {
    if (!device.lastPowerUpdate) return '';
    
    const now = new Date();
    const lastUpdate = new Date(device.lastPowerUpdate);
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  getTotalEnergy(device: Device): string {
    const energy = device.totalEnergy;
    if (!energy || energy === 0) return '';
    
    if (energy < 1000) {
      return `${energy.toFixed(0)} Wh`;
    }
    return `${(energy / 1000).toFixed(2)} kWh`;
  }
}
