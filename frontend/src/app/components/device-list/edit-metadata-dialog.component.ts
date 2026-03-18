import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Device } from '../../models/device.model';

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Device Metadata</h2>
    <mat-dialog-content>
      <div class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Device Name</mat-label>
          <input matInput [(ngModel)]="metadata.name" placeholder="e.g., Living Room Light" required>
          <mat-hint>User-friendly name for this device</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Room Name</mat-label>
          <input matInput [(ngModel)]="metadata.roomName" placeholder="e.g., Living Room">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="metadata.category">
            <mat-option value="">None</mat-option>
            <mat-option value="relay">Relay</mat-option>
            <mat-option value="sensor">Sensor</mat-option>
            <mat-option value="power_meter">Power Meter</mat-option>
            <mat-option value="gateway">Gateway</mat-option>
            <mat-option value="dimmer">Dimmer</mat-option>
            <mat-option value="rgbw">RGBW Light</mat-option>
            <mat-option value="roller">Roller Shutter</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Relay Usage</mat-label>
          <mat-select [(ngModel)]="metadata.relayUsage">
            <mat-option value="">None</mat-option>
            <mat-option value="light">Light</mat-option>
            <mat-option value="roller">Roller Shutter</mat-option>
            <mat-option value="entertainment">Entertainment</mat-option>
            <mat-option value="water_heater">Water Heater</mat-option>
            <mat-option value="heater">Heater</mat-option>
            <mat-option value="fan">Fan</mat-option>
            <mat-option value="socket">Socket</mat-option>
            <mat-option value="garage_door">Garage Door</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="device-info-display">
          <p><strong>IP Address:</strong> {{ device.ip }}</p>
          <p><strong>Device Type:</strong> {{ device.type }}</p>
          <p><strong>Model:</strong> {{ device.model || 'Unknown' }}</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!metadata.name?.trim()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .device-info-display {
      padding: 12px;
      background-color: var(--color-bg-secondary);
      border-radius: 6px;
      border: 1px solid var(--color-border-muted);
      font-size: 13px;

      p {
        margin: 4px 0;
        color: var(--color-text-secondary);
      }

      strong {
        color: var(--color-text-primary);
      }
    }

    mat-dialog-content {
      max-height: 60vh;
      overflow-y: auto;
    }
  `]
})
export class EditMetadataDialogComponent {
  metadata: {
    name?: string;
    roomName?: string;
    category?: string;
    relayUsage?: string;
  };

  constructor(
    private dialogRef: MatDialogRef<EditMetadataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public device: Device
  ) {
    // Initialize with existing metadata or empty values
    this.metadata = {
      name: device.metadata?.name || device.name || '',
      roomName: device.metadata?.roomName || '',
      category: device.metadata?.category || '',
      relayUsage: device.metadata?.relayUsage || '',
    };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.metadata);
  }
}
