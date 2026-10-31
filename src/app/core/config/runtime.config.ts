/**
 * Production Runtime Configuration for Linked Pocket Realms
 *
 * Automatically stamped on deployment via cloud-function/deploy.sh or deploy.ps1.
 */
export interface RuntimeConfig {
  defaultBrokerUrl: string;
  autoConnectBroker: boolean;
  heartbeatIntervalMs: number;
}

export const RUNTIME_CONFIG: RuntimeConfig = {
  defaultBrokerUrl: 'https://linked-pocket-realms-broker-uc.a.run.app',
  autoConnectBroker: true,
  heartbeatIntervalMs: 15000,
};
