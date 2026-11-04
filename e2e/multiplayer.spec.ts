import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';

/**
 * Two separate browsers (separate storage) connected over real WebRTC.
 * Runs only in the `multiplayer` project (see playwright.config.ts).
 */

async function newPlayer(
  browser: Browser,
  name: string,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.getByTestId('onboarding-name-input').fill(name);
  await page.getByTestId('confirm-awakening-btn').click();
  await expect(page.getByTestId('onboarding-modal')).toBeHidden();
  return { ctx, page };
}

async function openNetwork(page: Page): Promise<void> {
  await page.getByTestId('drawer-network-btn').click();
  await expect(page.getByTestId('connectivity-note')).toBeVisible();
}

async function closeDrawer(page: Page): Promise<void> {
  await page.getByTestId('close-drawer-btn').first().click();
}

test('two browsers connect with codes; the host decides the visitor’s kill', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const host = await newPlayer(browser, 'Host_Ari');
  const visitor = await newPlayer(browser, 'Visitor_Bea');

  // The plain connectivity note is on screen.
  await openNetwork(host.page);
  await expect(host.page.getByTestId('connectivity-note')).toContainText('mobile data');

  // Visitor makes a join code; host answers it; visitor applies the reply.
  await openNetwork(visitor.page);
  await visitor.page.getByTestId('make-join-code-btn').click();
  const joinCode = await visitor.page.getByTestId('local-connection-code').inputValue();
  expect(joinCode.length).toBeGreaterThan(100);

  await host.page.getByTestId('remote-connection-code-input').fill(joinCode);
  await host.page.getByTestId('use-connection-code-btn').click();
  await expect(host.page.getByTestId('connection-message')).toContainText('reply code');
  const replyCode = await host.page.getByTestId('local-connection-code').inputValue();

  await visitor.page.getByTestId('remote-connection-code-input').fill(replyCode);
  await visitor.page.getByTestId('use-connection-code-btn').click();

  // Real WebRTC link opens on both sides; the visitor is taken into the host's dungeon.
  await expect(visitor.page.getByTestId('peer-link-open')).toBeVisible({ timeout: 20_000 });
  await expect(host.page.getByTestId('peer-link-open')).toBeVisible({ timeout: 20_000 });
  await expect(visitor.page.getByTestId('authority-host-note')).toContainText('Host_Ari');
  await expect(host.page.getByTestId('hosting-live-note')).toBeVisible();
  await closeDrawer(visitor.page);
  await closeDrawer(host.page);
  await expect(host.page.getByTestId('terminal-log')).toContainText(
    'Visitor_Bea entered your dungeon',
  );

  // Visitor walks into the first crypt and fights the guardian there.
  await visitor.page.getByTestId('fp-step-forward').click();
  await expect(visitor.page.getByTestId('current-room-title')).toContainText('Vaulted Crypt 1');
  const visitorLog = visitor.page.getByTestId('terminal-log');
  for (let i = 0; i < 20; i++) {
    if (await visitorLog.getByText('defeated! Earned').count()) break;
    await visitor.page.keyboard.press('1');
    await visitor.page.waitForTimeout(900);
    await visitor.page.keyboard.press('2');
    await visitor.page.waitForTimeout(900);
  }
  await expect(visitorLog).toContainText('defeated! Earned', { timeout: 10_000 });

  // The host's own copy agrees: the host announced the kill in its log.
  await expect(host.page.getByTestId('terminal-log')).toContainText('Visitor_Bea defeated');

  await host.ctx.close();
  await visitor.ctx.close();
});

/**
 * Lobby flow through a broker. Skipped unless LPR_TEST_BROKER_URL points at a local broker
 * (never the live one), e.g. `npm start` in the broker repo, then
 * `LPR_TEST_BROKER_URL=http://localhost:8080 npx playwright test --project=multiplayer`.
 */
test('a visitor joins a host through the lobby', async ({ browser }) => {
  const brokerUrl = process.env['LPR_TEST_BROKER_URL'];
  test.skip(!brokerUrl, 'set LPR_TEST_BROKER_URL to a local broker to run');
  test.setTimeout(120_000);

  const withBroker = async (name: string) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((url) => {
      localStorage.setItem('linked_pocket_realms_broker_url', url as string);
    }, brokerUrl);
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByTestId('onboarding-name-input').fill(name);
    await page.getByTestId('confirm-awakening-btn').click();
    await expect(page.getByTestId('onboarding-modal')).toBeHidden();
    return { ctx, page };
  };

  // Unique per run: a shared broker may still list hosts from earlier runs for up to 60 s.
  const hostName = `Lobby_Host_${Date.now().toString(36).slice(-5)}`;
  const host = await withBroker(hostName);
  const visitor = await withBroker('Lobby_Visitor');

  await openNetwork(host.page);
  await host.page.getByTestId('toggle-hosting-btn').click();
  await expect(host.page.getByTestId('toggle-hosting-btn')).toContainText('Open to visitors');

  await openNetwork(visitor.page);
  await visitor.page.getByTestId('refresh-broker-lobbies-btn').click();
  const join = visitor.page
    .locator('[data-testid^="remote-session-"]', { hasText: hostName })
    .locator('[data-testid^="join-lobby-"]');
  await expect(join).toBeVisible({ timeout: 15_000 });
  await join.click();

  // The host checks the lobby every 20 s, so allow one heartbeat plus connection time.
  await expect(visitor.page.getByTestId('authority-host-note')).toContainText(hostName, {
    timeout: 45_000,
  });

  await host.ctx.close();
  await visitor.ctx.close();
});
