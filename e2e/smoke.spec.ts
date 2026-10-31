import { test, expect } from '@playwright/test';

test.describe('Linked Pocket Realms — Tactical HUD, Perspectives & Drawers E2E', () => {
  test('should load 100dvh HUD cleanly, execute terminal/HUD commands, switch perspectives, and open drawers without overflow', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');

    // 1. Root Tactical HUD & Brand Verification
    await expect(page.locator('#starter-title')).toHaveText('Linked Pocket Realms');
    await expect(page.getByTestId('active-gate-address')).toContainText(
      'Θ: Scorching Clockwork Catacombs',
    );
    await expect(page.getByTestId('realm-svg-map')).toBeVisible();

    // 2. Verify zero horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // 3. Test Explorer View & Terminal Dual-Input Command Execution
    await expect(page.getByTestId('explorer-dock')).toBeVisible();
    const terminalInput = page.getByTestId('terminal-input');
    await terminalInput.fill('n');
    await page.getByTestId('terminal-submit-btn').click();
    await expect(page.getByTestId('current-room-title')).toContainText('Vaulted Crypt 1');

    // Cast skill via terminal command
    await terminalInput.fill('cast sunder automaton');
    await page.getByTestId('terminal-submit-btn').click();
    await expect(page.getByTestId('terminal-log')).toContainText('sunder');

    // 4. Switch to Architect / Overseer View & Excavate a Room (@dig)
    await page.getByTestId('role-architect-btn').click();
    await expect(page.getByTestId('architect-dock')).toBeVisible();
    await page.getByTestId('arch-dig-btn').click();
    await expect(page.getByTestId('terminal-log')).toContainText('[@dig] Excavated new chamber');

    // 5. Switch to Spectator / Chronicle Replay View
    await page.getByTestId('role-spectator-btn').click();
    await expect(page.getByTestId('spectator-dock')).toBeVisible();
    await expect(page.getByTestId('replay-frame-readout')).toBeVisible();

    // 6. Verify On-Demand Data & Telemetry Drawers (Paperdoll, Combat DPS, Heatmap, Chronicle, P2P)
    await page.getByTestId('drawer-paperdoll-btn').click();
    await expect(page.getByTestId('paperdoll-drawer-content')).toBeVisible();
    await expect(page.getByTestId('attribute-radar-svg')).toBeVisible();

    await page.getByTestId('drawer-combat-btn').click();
    await expect(page.getByTestId('combat-telemetry-drawer-content')).toBeVisible();
    await expect(page.getByTestId('roll-histogram-svg')).toBeVisible();

    await page.getByTestId('drawer-analytics-btn').click();
    await expect(page.getByTestId('realm-analytics-drawer-content')).toBeVisible();

    await page.getByTestId('drawer-chronicle-btn').click();
    await expect(page.getByTestId('chronicle-drawer-content')).toBeVisible();
    await expect(page.getByTestId('career-progression-svg')).toBeVisible();

    // 7. Traverse P2P Portal and verify Customs Gate Clamping on Paperdoll
    await page.getByTestId('drawer-network-btn').click();
    await expect(page.getByTestId('network-drawer-content')).toBeVisible();
    await page.getByTestId('traverse-portal-peer-astral-echo').click();
    await expect(page.getByTestId('active-gate-address')).toContainText(
      'Δ: Silent Fungal Observatory',
    );

    await page.getByTestId('drawer-paperdoll-btn').click();
    await expect(page.getByTestId('clamped-item-badge').first()).toBeVisible();
    await page.getByTestId('close-drawer-btn').click();

    expect(consoleErrors).toEqual([]);
  });
});
