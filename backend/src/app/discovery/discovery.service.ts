import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mdns = require('multicast-dns');
import { ShellyService } from '../shelly/shelly.service';

export interface DiscoveredDevice {
  ip: string;
  hostname: string;
  model?: string;
  generation?: string;
  macAddress?: string;
  firmwareVersion?: string;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private mdnsInstance: any;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly shellyService: ShellyService,
  ) {}

  async scanNetwork(): Promise<DiscoveredDevice[]> {
    this.logger.log('🔍 DiscoveryService.scanNetwork() - Starting network scan for Shelly devices...');
    this.discoveredDevices.clear();

    const mdnsEnabled = this.configService.get<boolean>('MDNS_ENABLED', true);
    this.logger.log(`📡 mDNS Enabled: ${mdnsEnabled}`);
    
    if (!mdnsEnabled) {
      this.logger.warn('⚠️ mDNS discovery is disabled in configuration');
      return [];
    }

    return new Promise((resolve) => {
      this.mdnsInstance = mdns();
      const timeout = setTimeout(() => {
        this.cleanup();
        const devices = Array.from(this.discoveredDevices.values());
        this.logger.log(`✅ Network scan complete. Found ${devices.length} Shelly devices.`);
        if (devices.length > 0) {
          devices.forEach(d => this.logger.log(`  📱 ${d.model} at ${d.ip} (${d.hostname})`));
        } else {
          this.logger.warn('⚠️ No Shelly devices found via mDNS. Try POST /discovery/scan-subnet instead.');
        }
        resolve(devices);
      }, 5000); // 5 second scan timeout

      this.mdnsInstance.on('response', async (response: any) => {
        try {
          // Look for Shelly devices in the response
          const answers = response.answers || [];
          
          for (const answer of answers) {
            if (answer.type === 'A' && answer.name) {
              const hostname = answer.name.toLowerCase();
              const ip = answer.data;

              // Check if it's a Shelly device by hostname pattern
              if (this.isShellyDevice(hostname)) {
                if (!this.discoveredDevices.has(ip)) {
                  this.logger.debug(`Found potential Shelly device: ${hostname} at ${ip}`);
                  
                  // Probe the device to get more information
                  const probe = await this.shellyService.probeDevice(ip);
                  if (probe.reachable && probe.info) {
                    this.discoveredDevices.set(ip, {
                      ip,
                      hostname,
                      model: probe.info.model,
                      generation: probe.info.generation,
                      macAddress: probe.info.macAddress,
                      firmwareVersion: probe.info.firmwareVersion,
                    });
                    this.logger.log(`Discovered Shelly device: ${probe.info.model} at ${ip}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error processing mDNS response: ${error.message}`);
        }
      });

      // Query for all local services
      this.mdnsInstance.query({
        questions: [
          { name: '_http._tcp.local', type: 'PTR' },
          { name: 'shelly', type: 'A' },
        ],
      });
    });
  }

  private isShellyDevice(hostname: string): boolean {
    const shellyPatterns = [
      'shelly',
      'shellyplus',
      'shelly1',
      'shelly2',
      'shellypro',
      'shellyplug',
    ];
    return shellyPatterns.some(pattern => hostname.includes(pattern));
  }

  private cleanup() {
    if (this.mdnsInstance) {
      try {
        this.mdnsInstance.destroy();
      } catch (error) {
        this.logger.error(`Error destroying mDNS instance: ${error.message}`);
      }
      this.mdnsInstance = null;
    }
  }

  async scanSubnet(): Promise<DiscoveredDevice[]> {
    this.logger.log('🔍 DiscoveryService.scanSubnet() - Starting subnet scan (fallback method)...');
    const subnet = this.configService.get<string>('DISCOVERY_SUBNET', '192.168.0.0/24');
    this.logger.log(`📡 Scanning subnet: ${subnet}`);
    const devices: DiscoveredDevice[] = [];

    // Parse subnet to get IP range
    const baseIP = subnet.split('/')[0];
    const octets = baseIP.split('.');
    const baseOctet = parseInt(octets[3]);

    // Scan common range (1-254)
    const promises: Promise<void>[] = [];
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${octets[0]}.${octets[1]}.${octets[2]}.${i}`;
      
      promises.push(
        this.shellyService.probeDevice(ip).then((probe) => {
          if (probe.reachable && probe.info) {
            devices.push({
              ip,
              hostname: probe.info.hostname || `shelly-${ip}`,
              model: probe.info.model,
              generation: probe.info.generation,
              macAddress: probe.info.macAddress,
              firmwareVersion: probe.info.firmwareVersion,
            });
            this.logger.log(`Discovered device at ${ip}: ${probe.info.model}`);
          }
        }).catch(() => {
          // Silently ignore unreachable IPs
        })
      );

      // Batch requests to avoid overwhelming the network
      if (promises.length >= 20) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Wait for remaining promises
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    this.logger.log(`Subnet scan complete. Found ${devices.length} devices.`);
    return devices;
  }

  onModuleDestroy() {
    this.cleanup();
  }
}
