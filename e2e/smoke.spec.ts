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

    // 1. First-Boot Onboarding Modal Verification & Awakening
    const onboardingModal = page.getByTestId('onboarding-modal');
    await expect(onboardingModal).toBeVisible();
    await page.getByTestId('onboard-class-Vanguard').click();
    await page.getByTestId('confirm-awakening-btn').click();
    await expect(onboardingModal).toBeHidden();

    // 2. Root Tactical HUD, Persistent Room Stage & Brand Verification
    await expect(page.locator('#starter-title')).toHaveText('Linked Pocket Realms');
    await expect(page.getByTestId('active-gate-address')).toContainText(
      'Θ: Scorching Clockwork Catacombs',
    );
    await expect(page.getByTestId('realm-svg-map')).toBeVisible();
    await expect(page.getByTestId('persistent-room-stage')).toBeVisible();

    // 3. Verify zero horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // 4. Tactile Point-and-Click Navigation on Persistent Room Stage & Syntax Echo Verification
    await expect(page.getByTestId('stage-exits-bar')).toBeVisible();
    await page.getByTestId('stage-exit-N').click();
    await expect(page.getByTestId('current-room-title')).toContainText('Vaulted Crypt 1');
    await expect(page.getByTestId('syntax-echo-badge').first()).toContainText('[cmd: n]');

    // 5. Interact with Monster Card directly on the Persistent Room Stage
    const firstAttackBtn = page.locator('[data-testid^="attack-mob-btn-"]').first();
    await expect(firstAttackBtn).toBeVisible();
    await firstAttackBtn.click();

    // 6. Switch to Architect / Overseer View & Excavate a Room via Zero-Syntax `[+ Dig Room]` Ghost Button
    await page.getByTestId('role-architect-btn').click();
    await expect(page.getByTestId('architect-dock')).toBeVisible();
    const firstGhostDigBtn = page.locator('[data-testid^="stage-ghost-dig-"]').first();
    await firstGhostDigBtn.click();
    await expect(page.getByTestId('architect-dig-popover')).toBeVisible();
    await page.getByTestId('roll-procedural-room-btn').click();
    await page.getByTestId('arch-dig-btn').click();
    await expect(page.getByTestId('terminal-log')).toContainText('[@dig] Excavated new chamber');

    // 7. Switch to Spectator / Chronicle Replay View
    await page.getByTestId('role-spectator-btn').click();
    await expect(page.getByTestId('spectator-dock')).toBeVisible();
    await expect(page.getByTestId('replay-frame-readout')).toBeVisible();

    // 8. Verify On-Demand Data & Telemetry Drawers (Paperdoll, Combat DPS, Heatmap, Chronicle, P2P)
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

    // 9. Traverse P2P Portal and verify Customs Gate Clamping on Paperdoll
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
