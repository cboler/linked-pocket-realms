import { expect, test } from '@playwright/test';

test('wake the Astral Echo, talk to it, and send it scouting', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('confirm-awakening-btn').click();
  await expect(page.getByTestId('onboarding-modal')).toBeHidden();

  // Wake it with a command; it appears in the room as someone you can talk to.
  const cmd = page.getByTestId('terminal-input');
  await cmd.fill('echo on');
  await page.getByTestId('terminal-submit-btn').click();
  await expect(page.getByTestId('terminal-log')).toContainText('Kite_Zero the Hexblade is awake');

  await page.getByTestId('talk-echo-chip').click();
  await expect(page.getByTestId('echo-panel')).toBeVisible();
  await expect(page.getByTestId('echo-status-line')).toContainText('Lv.');

  await page.getByTestId('echo-start-job-scout').click();
  await expect(page.getByTestId('echo-job-job-scout')).toContainText('Working');
  await expect(page.getByTestId('echo-log')).toContainText('scouted', { timeout: 15_000 });

  // No horizontal overflow with the panel open.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBeFalsy();
});
