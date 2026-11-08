// Explicit, interactive hardware smoke test. The browser's own device picker requires a selection.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
if (process.env.HARDWARE_TEST !== "1")
  throw new Error(
    "Run with HARDWARE_TEST=1 to allow a temporary DPI change and restoration.",
  );
await mkdir(".hardware-check", { recursive: true });
const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
let original;
let writeVerified = false;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function raw(operation, block) {
  return page.evaluate(
    async ({ operation, block }) => {
      const { Transport, supported } = await import("/src/lib/device.ts");
      const device = (await navigator.hid.getDevices()).find(supported);
      if (!device) throw new Error("No authorized AULA device");
      if (!device.opened) await device.open();
      const transport = new Transport(
        device,
        [0x22a0, 0x22ba].includes(device.productId),
      );
      try {
        if (operation === "restore")
          await transport.writeConfig(new Uint8Array(block));
        return Array.from(await transport.readBlock(5, 128));
      } finally {
        transport.abort();
      }
    },
    { operation, block },
  );
}
try {
  await page.goto(process.env.APP_URL || "http://127.0.0.1:5173/");
  await page.getByRole("button", { name: "Fareyi bağla", exact: true }).click();
  console.log(
    "Select AULA-8K Dongle in the browser permission dialog. Waiting up to 3 minutes.",
  );
  await page.locator(".connection-pill.online").waitFor({ timeout: 180000 });
  original = await raw("read");
  await writeFile(".hardware-check/original.json", JSON.stringify(original));
  const active = original[12];
  const stage = Array.from({ length: 6 }, (_, i) => i).find((i) => {
    const o = 14 + i * 9;
    const x = original[o + 2] | (original[o + 3] << 8);
    const y = original[o + 4] | (original[o + 5] << 8);
    return (
      i !== active &&
      !!original[o] &&
      x >= 100 &&
      y >= 100 &&
      x <= 41950 &&
      y <= 41950 &&
      x % 50 === 0 &&
      y % 50 === 0
    );
  });
  if (stage === undefined) throw new Error("No suitable inactive stage");
  const offset = 14 + stage * 9;
  const oldX = original[offset + 2] | (original[offset + 3] << 8);
  const oldY = original[offset + 4] | (original[offset + 5] << 8);
  await page
    .getByRole("button", {
      name: `Kademe ${stage + 1}: ${oldX} DPI`,
      exact: true,
    })
    .click();
  if (original[offset + 1]) {
    await page
      .getByRole("spinbutton", { name: "X DPI", exact: true })
      .fill(String(oldX + 50));
    await page
      .getByRole("spinbutton", { name: "Y DPI", exact: true })
      .fill(String(oldY + 50));
  } else
    await page
      .getByRole("spinbutton", { name: "DPI", exact: true })
      .fill(String(oldX + 50));
  await page.getByRole("button", { name: "Uygula", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("fareden doğrulandı", {
    timeout: 12000,
  });
  const changed = await raw("read");
  const differences = changed.flatMap((b, i) => (b === original[i] ? [] : [i]));
  if (
    !differences.length ||
    differences.some(
      (i) => ![offset + 2, offset + 3, offset + 4, offset + 5].includes(i),
    )
  )
    throw new Error("Unexpected changed bytes");
  if ((changed[offset + 2] | (changed[offset + 3] << 8)) !== oldX + 50)
    throw new Error("DPI write readback failed");
  writeVerified = true;
  await page.screenshot({ path: ".hardware-check/dpi.png", fullPage: true });
  console.log("Browser DPI write verified:", {
    stage: stage + 1,
    from: oldX,
    to: oldX + 50,
    differences,
  });
  if (errors.length) throw new Error(errors.join("; "));
} finally {
  if (original) {
    const restored = await raw("restore", original);
    if (JSON.stringify(restored) !== JSON.stringify(original))
      throw new Error("Original settings were not restored exactly");
    await writeFile(
      ".hardware-check/result.json",
      JSON.stringify(
        {
          hardware: "AULA V9 Ultra+",
          webHid: true,
          writeVerified,
          originalRestored: true,
          bytesCompared: 128,
          date: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log("Original 128-byte settings restored and verified.");
  }
  await browser.close();
}
