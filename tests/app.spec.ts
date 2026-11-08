import { expect, test } from "@playwright/test";

test("demo edits, validation, save, discard and backup work without device access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Her hareket",
  );
  await page.getByRole("button", { name: "Önce demoyu keşfet" }).click();
  await expect(page.locator(".connection-pill")).toContainText("Demo modu");
  await page
    .getByRole("button", { name: "Kademe 1: 400 DPI", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "DPI", exact: true }).fill("451");
  await expect(
    page.getByRole("button", { name: "Uygula", exact: true }),
  ).toBeDisabled();
  await page.getByRole("spinbutton", { name: "DPI", exact: true }).fill("450");
  await page.getByRole("button", { name: "Uygula", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Demo ayarları güncellendi",
  );
  await expect(
    page.getByRole("button", { name: "Kademe 1: 450 DPI", exact: true }),
  ).toBeVisible();
  await page.getByRole("spinbutton", { name: "DPI", exact: true }).fill("500");
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "DPI", exact: true }),
  ).toHaveValue("450");
  await page.getByRole("button", { name: "Performans", exact: true }).click();
  await page.getByRole("button", { name: "4000 Hz", exact: true }).click();
  await page.getByRole("switch", { name: "Motion Sync", exact: true }).click();
  await page.getByRole("button", { name: "Uygula", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page
    .getByRole("button", { name: "Cihaz ve yedek", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Güncel ayarları indir" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("settings.json");
  await page.getByRole("button", { name: "İngilizceye geç" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Device & backup",
  );
  await page.getByRole("button", { name: "Exit demo", exact: true }).click();
  await expect(page.locator(".connection-pill")).toHaveText("Not connected");
  expect(errors).toEqual([]);
});

test("mobile navigation and accessible connection help", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .getByRole("button", { name: "DPI kademeleri", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "DPI kademeleri",
  );
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Bağlantı yardımı" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Linux");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("an unsupported browser gets a clear connection error", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hid", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Fareyi bağla", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
