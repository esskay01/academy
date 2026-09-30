import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bajrang.academy";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const PASSWORD = "Player@12345";

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
/** Letters-only unique token, for names (digits would make odd initials). */
const uniqueWord = () => [...String(Date.now()).slice(-7)].map((d) => "abcdefghij"[Number(d)]).join("");

// 64×64 PNG. (A 1×1 image reports naturalWidth 0 through a srcset because the
// browser divides by the chosen density, so it is too small to prove loading.)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeklEQVR4nO3PwQkAIBDAsBvM/XEh/w7hIwiFDpDOPuvrhgsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEteOwCkQmR0gvHRCMAAAAASUVORK5CYII=", "base64");

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Date of birth").fill("2008-04-12");
  await page.getByLabel("Current skill level").selectOption("intermediate");
  await page.getByLabel("Blood group").selectOption("B+");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);

  // Better Auth rate-limits sign-up (3 per 10s per IP) in production builds, and
  // on fast CI runners consecutive tests hit it. Wait out the window and retry,
  // as login() does, instead of weakening the limiter for tests.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole("button", { name: "Create my account" }).click();
    const outcome = await Promise.race([
      page
        .waitForURL("**/dashboard**", { timeout: 15_000 })
        .then(() => "navigated")
        .catch(() => "timeout"),
      formAlert(page)
        .waitFor({ timeout: 15_000 })
        .then(() => "alert")
        .catch(() => "timeout"),
    ]);
    if (outcome === "navigated") return;
    if (outcome === "alert" && !(await formAlert(page).innerText()).includes("Too many requests")) break;
    await page.waitForTimeout(11_000);
  }
  await page.waitForURL("**/dashboard**", { timeout: 5_000 });
}

/** The form's own error message (Next.js also renders an empty role=alert route announcer). */
function formAlert(page: Page) {
  return page.locator("form [role=alert]");
}

async function login(page: Page, email: string, password: string, as: "player" | "admin" = "player") {
  await page.context().clearCookies();
  await page.goto("/login");
  if (as === "admin") await page.getByRole("tab", { name: "Admin login" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  // Better Auth rate-limits sign-in (a few attempts per 10s per IP) in production.
  // This suite logs in many times in quick succession, so wait out the window
  // and retry instead of weakening the limiter for tests.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole("button", { name: as === "admin" ? "Log in as admin" : "Log in" }).click();
    const outcome = await Promise.race([
      page
        .waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 })
        .then(() => "navigated")
        .catch(() => "timeout"),
      formAlert(page)
        .waitFor({ timeout: 15_000 })
        .then(() => "alert")
        .catch(() => "timeout"),
    ]);
    if (outcome !== "alert" || !(await formAlert(page).innerText()).includes("Too many requests")) return;
    await page.waitForTimeout(11_000);
  }
}

async function loginAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
  await page.waitForURL("**/admin");
}

function memberRow(page: Page, email: string) {
  return page.getByTestId("member-row").filter({ hasText: email });
}

test("home page shows the academy content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const id of ["programs", "coaches", "schedule", "contact"]) {
    await expect(page.locator(`section#${id}`)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Join the academy" }).first()).toBeVisible();
});

test("hero court: doubles demo loops; a visitor picks a player, names themselves, plays a rally and returns", async ({ page }) => {
  await page.goto("/");
  const shuttle = page.getByTestId("shuttle");

  // Attract loop: four players, the shuttle keeps moving on its own.
  for (const id of [0, 1, 2, 3]) await expect(page.getByTestId(`player-${id}`)).toBeAttached();
  const before = await shuttle.evaluate((el) => el.style.transform);
  await expect.poll(() => shuttle.evaluate((el) => el.style.transform), { timeout: 5_000 }).not.toBe(before);

  // Enter → choose player/court → name.
  await page.getByRole("button", { name: "Play a rally" }).click();
  await page.getByRole("button", { name: /Bottom court · left/ }).click();
  const nameInput = page.getByLabel("Your name");
  await nameInput.fill("x");
  await page.getByRole("button", { name: "Start rally" }).click();
  await expect(page.getByText("Use 2–16 characters.")).toBeVisible();
  await nameInput.fill("Ace Tester");
  await page.getByRole("button", { name: "Start rally" }).click();

  // Playing: HUD shows the visitor; steer a little with the keyboard.
  await expect(page.getByTestId("game-hud")).toContainText("Ace Tester", { timeout: 5_000 });
  await expect(page.getByTestId("player-2")).toContainText("Ace Tester (you)");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowRight");

  // The rally ends (won or lost), then the visitor returns to the demo.
  const result = page.getByTestId("rally-result");
  await expect(result).toBeVisible({ timeout: 60_000 });
  await expect(result).toContainText("Returns");
  await page.getByRole("button", { name: "Back to demo" }).click();
  await expect(page.getByTestId("last-rally")).toContainText("Ace Tester");
  await expect(page.getByRole("button", { name: "Play a rally" })).toBeVisible();
});

test("protected pages redirect anonymous visitors to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("registration → admin inbox approve → member becomes active", async ({ page }) => {
  const email = `player-${unique()}@test.dev`;
  await register(page, "Pending Player", email);
  await expect(page.getByTestId("status-badge").first()).toHaveText("Pending approval");
  await expect(page.getByText(email)).toBeVisible();

  // A non-admin can't use the admin panel…
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard/);

  // …or the admin login tab.
  await login(page, email, PASSWORD, "admin");
  await expect(formAlert(page)).toContainText("doesn't have admin access");

  await loginAdmin(page);
  await page.goto("/admin/inbox");
  const card = page.getByTestId("inbox-item").filter({ hasText: email });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveCount(0);

  await login(page, email, PASSWORD);
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Active");
  await expect(page.getByTestId("status-title")).toHaveText("You're an active member");
});

test("rejecting a registration leaves the member inactive", async ({ page }) => {
  const email = `reject-${unique()}@test.dev`;
  await register(page, "Rejected Player", email);

  await loginAdmin(page);
  await page.goto("/admin/inbox");
  const card = page.getByTestId("inbox-item").filter({ hasText: email });
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card).toHaveCount(0);

  await login(page, email, PASSWORD);
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Inactive");
});

test("admin can mark an active member inactive and promote members to admin", async ({ page }) => {
  const email = `member-${unique()}@test.dev`;
  await register(page, "Soon Admin", email);

  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  const row = memberRow(page, email);
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row.getByTestId("status-badge")).toHaveText("Active");

  // Deactivate needs a confirming second click.
  await row.getByRole("button", { name: "Mark inactive" }).click();
  await row.getByRole("button", { name: "Confirm deactivate" }).click();
  await expect(row.getByTestId("status-badge")).toHaveText("Inactive");

  await login(page, email, PASSWORD);
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Inactive");

  // Promote: promotion also re-activates so the new admin can work.
  await loginAdmin(page);
  await page.goto("/admin/admins");
  await page.getByLabel("Existing member's email").fill(email);
  await page.getByRole("button", { name: "Grant admin access" }).click();
  await expect(page.getByTestId("admin-row").filter({ hasText: email })).toBeVisible();

  await login(page, email, PASSWORD, "admin");
  await page.waitForURL("**/admin");
  // Name may include the pending-count badge, e.g. "Inbox 1".
  await expect(page.getByRole("link", { name: /^Inbox( \d+)?$/ })).toBeVisible();

  // Deactivating an admin also strips admin access.
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await row.getByRole("button", { name: "Mark inactive" }).click();
  await row.getByRole("button", { name: "Confirm deactivate" }).click();
  await expect(page.getByText("Admin access was removed.")).toBeVisible();
  await expect(row.getByTestId("status-badge")).toHaveText("Inactive");
  await expect(row.getByText("Admin", { exact: true })).toHaveCount(0); // role badge gone
  await expect(row.getByRole("button", { name: "Activate" })).toBeVisible();
});

test("admin can create a brand-new admin account", async ({ page }) => {
  const email = `new-admin-${unique()}@test.dev`;
  await loginAdmin(page);
  await page.goto("/admin/admins");
  await page.getByLabel("Full name").fill("Fresh Admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Temporary password").fill("Fresh@12345");
  await page.getByRole("button", { name: "Create admin" }).click();
  await expect(page.getByTestId("admin-row").filter({ hasText: email })).toBeVisible();

  await login(page, email, "Fresh@12345", "admin");
  await page.waitForURL("**/admin");
});

test("admin edits to contact info, coaches and slots appear on the website", async ({ page }) => {
  const tag = unique();
  const phone = `+91 90000 ${tag.slice(-5)}`;
  const coach = `Coach ${tag}`;
  const slot = `Batch ${tag}`;

  await loginAdmin(page);

  await page.goto("/admin/settings");
  await page.getByLabel("Phone").fill(phone);
  await page.getByRole("button", { name: "Save website info" }).click();
  await expect(page.getByText("Website information updated.")).toBeVisible();

  await page.goto("/admin/coaches");
  await page.getByRole("button", { name: "Add a coach" }).click();
  await page.locator("#coach-new-name").fill(coach);
  await page.locator("#coach-new-title").fill("Guest Coach");
  await page.locator("#coach-new-bio").fill("Visiting specialist.");
  await page.locator("#coach-new-spec").fill("Drop shots");
  await page.locator("#coach-new-photo").setInputFiles({ name: "coach.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Add coach", exact: true }).click();
  await expect(page.getByText("Coach added.")).toBeVisible();

  await page.goto("/admin/slots");
  await page.getByRole("button", { name: "Add a training slot" }).click();
  await page.locator("#slot-new-title").fill(slot);
  await page.locator("#slot-new-days").fill("Sat · Sun");
  await page.getByRole("button", { name: "Add slot", exact: true }).click();
  await expect(page.getByText("Slot added.")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#contact")).toContainText(phone);
  await expect(page.locator("#coaches")).toContainText(coach);
  // Uploaded coach photo is served and actually loads.
  const coachImg = page.locator("#coaches article").filter({ hasText: coach }).locator("img");
  await expect(coachImg).toHaveJSProperty("complete", true);
  expect(await coachImg.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator("#schedule")).toContainText(slot);
});

test("admin can't deactivate or demote themselves", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(ADMIN_EMAIL)}`);
  const row = memberRow(page, ADMIN_EMAIL);
  await expect(row).toContainText("(you)");
  await expect(row.getByRole("button", { name: "Mark inactive" })).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Remove admin" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Improvements round
// ---------------------------------------------------------------------------

test("registration phone: fixed +91, digits only, exactly 10", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText("+91", { exact: true })).toBeVisible();
  const phone = page.getByLabel("Phone");
  await phone.fill("98765-abc 43210");
  await expect(phone).toHaveValue("9876543210"); // non-digits stripped as you type

  await phone.fill("12345");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByText("Enter your 10-digit mobile number")).toBeVisible();
});

test("admin members: paging, no overflow, sign-out always visible, delete inactive", async ({ page }) => {
  const email = `delete-${unique()}@test.dev`;
  await register(page, "Delete Me", email);

  await page.setViewportSize({ width: 1100, height: 600 });
  await loginAdmin(page);

  await page.goto("/admin/members?size=10");
  await expect(page.getByLabel("Rows per page")).toHaveValue("10");
  expect(await page.getByTestId("member-row").count()).toBeLessThanOrEqual(10);
  await expect(page.getByTestId("pagination-summary")).toContainText(/Showing 1–\d+ of \d+/);
  await page.getByLabel("Rows per page").selectOption("20");
  await expect(page).toHaveURL(/size=20/);

  // The table scrolls inside its card instead of pushing the page wider.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const path of ["/admin/members", "/admin/coaches", "/admin/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeInViewport();
  }

  // Only inactive members can be deleted.
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  const row = memberRow(page, email);
  await expect(row.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await row.getByRole("button", { name: "Reject" }).click();
  await expect(row.getByTestId("status-badge")).toHaveText("Inactive");

  await page.goto(`/admin/members?status=inactive&q=${encodeURIComponent(email)}`);
  await row.getByRole("button", { name: "Delete" }).click();
  await row.getByRole("button", { name: "Delete forever?" }).click();
  await expect(page.getByText("was deleted permanently")).toBeVisible();
  await expect(row).toHaveCount(0);

  await login(page, email, PASSWORD);
  await expect(formAlert(page)).toBeVisible(); // account no longer exists
});

test("admin edits a member with a photo; recently approved members show in the hero", async ({ page }) => {
  const first = `Kiran${uniqueWord()}`;
  const email = `photo-${unique()}@test.dev`;
  await register(page, `${first} Rao`, email);

  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await memberRow(page, email).getByRole("button", { name: "Approve" }).click();
  await expect(memberRow(page, email).getByTestId("status-badge")).toHaveText("Active");
  await memberRow(page, email).getByRole("link", { name: "Edit" }).click();

  // Non-images are rejected by content, whatever the file name says.
  await page.locator("#member-photo").setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("<html>nope</html>") });
  await page.getByRole("button", { name: "Save member" }).click();
  await expect(page.getByText("Use a JPG, PNG or WebP image.").first()).toBeVisible();

  await page.getByLabel("Full name").fill(`${first} Sharma`);
  await page.getByLabel("Phone").fill("9123456780");
  await page.locator("#member-photo").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save member" }).click();
  await expect(page.getByText("details were saved")).toBeVisible();

  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  const row = memberRow(page, email);
  await expect(row).toContainText(`${first} Sharma`);
  await expect(row).toContainText("+91 91234 56780");
  const src = await row.locator("img").getAttribute("src");
  expect(src).toMatch(/^\/media\//);
  expect((await page.request.get(src!)).headers()["content-type"]).toBe("image/png");

  // Home hero: newest approved member, photo + hover card with public info only.
  await page.goto("/");
  const avatar = page.getByRole("button", { name: `About ${first} S.` });
  await expect(avatar.locator("img")).toHaveAttribute("src", src!);
  await avatar.hover();
  const card = page.getByRole("tooltip");
  await expect(card).toContainText(`${first} S.`);
  await expect(card).toContainText("Intermediate player");
  await expect(card).not.toContainText(email);
});

test("admin publishes a testimonial with a photo on the home page", async ({ page }) => {
  const name = `Parent ${uniqueWord()}`;
  await loginAdmin(page);
  await page.goto("/admin/testimonials");
  await page.getByRole("button", { name: "Add a testimonial" }).click();
  await page.locator("#tst-new-photo").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await page.locator("#tst-new-name").fill(name);
  await page.locator("#tst-new-role").fill("Parent of a U-11 player");
  await page.locator("#tst-new-quote").fill("Fantastic coaching and a warm community.");
  await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
  await expect(page.getByText("Testimonial added.")).toBeVisible();

  await page.goto("/");
  // The banner repeats cards for a seamless loop; only the originals carry the test id.
  const figure = page.getByTestId("testimonial").filter({ hasText: name });
  await expect(figure).toContainText("Fantastic coaching");
  await expect(figure.locator("img")).toHaveAttribute("src", /^\/media\//);
});

// ---------------------------------------------------------------------------
// Memberships & payments
// ---------------------------------------------------------------------------

/** Calendar date in India, offset by `days` (matches the app's academyToday()). */
function indiaDate(days = 0) {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

test("admin records a membership payment; member sees days left; it expires to inactive", async ({ page }) => {
  const email = `plan-${unique()}@test.dev`;
  await register(page, "Plan Member", email);

  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  const row = memberRow(page, email);
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row.getByTestId("status-badge")).toHaveText("Active");
  await row.getByRole("link", { name: "Edit" }).click();

  // Record: Starter program, part-paid, starting today for 10 days.
  await page.getByRole("button", { name: "Record a membership / payment" }).click();
  await page.locator("#ms-new-program").selectOption({ label: "Starter (₹2,500/mo)" });
  await page.locator("#ms-new-fee").fill("2500");
  await page.locator("#ms-new-paid").fill("1000");
  await page.locator("#ms-new-start").fill(indiaDate());
  await page.locator("#ms-new-months").fill("0");
  await page.locator("#ms-new-days").fill("10");
  const endField = page.locator("#ms-new-end");
  await expect(endField).toBeDisabled(); // computed, not editable
  await expect(endField).not.toHaveValue("—");
  await page.getByRole("button", { name: "Record membership" }).click();
  await expect(page.getByText("Membership recorded — ends")).toBeVisible();

  const plan = page.getByTestId("membership-row").first();
  await expect(plan).toContainText("Partially paid");
  await expect(plan).toContainText("10 days left");

  // The member sees the same, as a meter chart.
  await login(page, email, PASSWORD);
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("days-left")).toHaveText("10");
  await expect(page.getByTestId("fee-chart")).toContainText("Starter");
  await expect(page.getByTestId("fee-chart").getByTestId("payment-badge")).toHaveText("Partially paid");
  await expect(page.getByRole("meter").first()).toBeVisible();

  // Move the membership into the past: once it has ended, the member turns inactive.
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await memberRow(page, email).getByRole("link", { name: "Edit" }).click();
  await page.getByTestId("membership-row").first().locator("..").locator("..").getByRole("button", { name: "Edit" }).click();
  const startField = page.locator("[id^=ms-][id$=-start]").last();
  await startField.fill(indiaDate(-40));
  await page.getByRole("button", { name: "Save membership" }).click();
  await expect(page.getByText("Member is now inactive")).toBeVisible();

  // Re-activating without a new membership is refused (the sweep would undo it).
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await expect(memberRow(page, email).getByTestId("status-badge")).toHaveText("Inactive");
  await memberRow(page, email).getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("record a new membership first")).toBeVisible();

  await login(page, email, PASSWORD);
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("status-badge").first()).toHaveText("Inactive");
  await expect(page.getByText("membership ended on")).toBeVisible();
  await expect(page.getByTestId("days-left")).toHaveText("0");

  // Renewal: recording a current membership re-activates the member.
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await memberRow(page, email).getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Record a membership / payment" }).click();
  await page.locator("#ms-new-program").selectOption({ label: "Starter (₹2,500/mo)" });
  await page.locator("#ms-new-paid").fill("2500");
  await page.getByRole("button", { name: "Record membership" }).click();
  await expect(page.getByText("Member is active again.")).toBeVisible();
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await expect(memberRow(page, email).getByTestId("status-badge")).toHaveText("Active");
});

test("admin edits the hero highlight chips; a blank value hides a chip", async ({ page }) => {
  // Defaults from the migration are shown before any edit.
  await page.goto("/");
  await expect(page.getByTestId("hero-chip-1")).toBeAttached();

  const value = `${Date.now() % 100000} district titles`;
  await loginAdmin(page);
  await page.goto("/admin/settings");
  await expect(page.getByLabel("Top-left chip — value")).not.toHaveValue("");
  await page.getByLabel("Top-left chip — label").fill("Since 2014");
  await page.getByLabel("Top-left chip — value").fill(value);
  await page.getByLabel("Bottom-right chip — value").fill("");
  await page.getByRole("button", { name: "Save website info" }).click();
  await expect(page.getByText("Website information updated.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("hero-chip-1")).toContainText("Since 2014");
  await expect(page.getByTestId("hero-chip-1")).toContainText(value);
  await expect(page.getByTestId("hero-chip-2")).toHaveCount(0);
});

test("password field: show/hide toggle and live strength meter on sign-up", async ({ page }) => {
  await page.goto("/register");
  const pw = page.getByLabel("Password", { exact: true });
  await pw.fill("password");
  await expect(page.getByTestId("password-strength")).toContainText("Weak");
  await pw.fill(PASSWORD);
  await expect(page.getByTestId("password-strength")).toContainText("Strong");
  await expect(pw).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(pw).toHaveAttribute("type", "text");
});

test("member changes their own password; admin resets it", async ({ page }) => {
  const email = `pw-${unique()}@test.dev`;
  const changed = "Changed@12345";
  const reset = "Reset@123456";
  await register(page, "Password Player", email);

  // Member: wrong current password is rejected, then a real change succeeds.
  await page.getByLabel("Current password").fill("Wrong@12345");
  await page.getByLabel("New password", { exact: true }).fill(changed);
  await page.getByLabel("Confirm new password").fill(changed);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Your current password is incorrect.")).toBeVisible();
  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();

  await login(page, email, changed);
  await page.waitForURL("**/dashboard");

  // Admin: reset it from the member's edit page.
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await memberRow(page, email).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("New password", { exact: true }).fill(reset);
  await page.getByLabel("Confirm new password").fill(reset);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("password was reset")).toBeVisible();

  await login(page, email, reset);
  await page.waitForURL("**/dashboard");
});

test("unknown pages show the branded 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Out of bounds!" })).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("theme switcher: light/dark choice applies instantly and persists across pages", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkBg = await bodyBg();

  await page.getByRole("radio", { name: "Light theme" }).first().click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect.poll(bodyBg).not.toBe(darkBg);

  // Persisted and applied before paint on the next page (no flash back to dark).
  await page.goto("/login");
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Light theme" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: "Dark theme" }).click();
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("admin overview: registrations chart, fees, renewals and batch occupancy", async ({ page }) => {
  // A fresh registration lands in this week's bar.
  await register(page, "Chart Player", `chart-${unique()}@test.dev`);
  await loginAdmin(page);

  const chart = page.getByTestId("signups-chart");
  await expect(chart).toContainText("New registrations");
  const thisWeek = chart.getByLabel(/registrations$/).last();
  await thisWeek.hover();
  await expect(chart.getByRole("tooltip")).toContainText(/[1-9]\d* registrations?/);

  await expect(page.getByTestId("fees-collected")).toContainText("₹");
  await expect(page.getByTestId("fees-due")).toContainText("₹");
  await expect(page.getByRole("heading", { name: "Renewals due" })).toBeVisible();
  await expect(page.getByTestId("occupancy").getByRole("meter").first()).toBeVisible();
});

test("link previews: home page advertises a 1200×630 share image", async ({ page, request }) => {
  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toMatch(/\/opengraph-image/);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const res = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("accessibility: key pages pass axe WCAG 2.1 AA in both themes", async ({ browser }) => {
  test.setTimeout(240_000);
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await context.newPage();
    const audit = async (path: string) => {
      await page.goto(path);
      // Scroll through so reveal-on-scroll content is visible when audited.
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 700) await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(500);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary, `${theme} ${path}`).toEqual([]);
    };
    for (const path of ["/", "/login", "/register"]) await audit(path);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
    for (const path of ["/admin", "/admin/members", "/dashboard"]) await audit(path);
    await context.close();
  }
});

test("admin members on a phone: rows become cards with status and actions on screen", async ({ page }) => {
  const email = `phone-${unique()}@test.dev`;
  await register(page, "Phone Card", email);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);

  const row = memberRow(page, email);
  const inViewport = async (locator: ReturnType<Page["locator"]>) => {
    const box = (await locator.boundingBox())!;
    return box.x >= 0 && box.x + box.width <= 390;
  };
  await expect(row.getByTestId("status-badge")).toBeVisible();
  expect(await inViewport(row.getByTestId("status-badge"))).toBe(true);
  expect(await inViewport(row.getByRole("button", { name: "Approve" }))).toBe(true);
  // Cells label themselves in card layout; the table header is hidden.
  await expect(row.locator('td[data-label="Phone"]')).toContainText("+91");
  await expect(page.locator("thead")).toBeHidden();
  // No sideways scrolling.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("responsive: no page scrolls sideways on a 360px phone or a 768px tablet", async ({ browser }) => {
  test.setTimeout(240_000);
  const publicPaths = ["/", "/login", "/register"];
  const adminPaths = ["/admin", "/admin/inbox", "/admin/members", "/admin/admins", "/admin/coaches", "/admin/slots", "/admin/programs", "/admin/announcements", "/admin/testimonials", "/admin/settings", "/dashboard"];
  for (const width of [360, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const widths: Record<string, number> = {};
    const measure = async (path: string) => {
      await page.goto(path);
      widths[path] = await page.evaluate(() => document.documentElement.scrollWidth);
    };
    for (const path of publicPaths) await measure(path);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
    for (const path of adminPaths) await measure(path);
    const overflowing = Object.entries(widths).filter(([, w]) => w > width);
    expect(overflowing, `pages wider than ${width}px`).toEqual([]);
    await context.close();
  }
});

test("registration requires a blood group", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("No Blood Group");
  await page.getByLabel("Email").fill(`nobg-${unique()}@test.dev`);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Date of birth").fill("2008-04-12");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByText("Select your blood group")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);

  // The server refuses it too, not just the form.
  const signUpWithoutBloodGroup = () =>
    page.request.post("/api/auth/sign-up/email", {
      // Same-origin like a browser, so this tests the blood-group rule, not CSRF protection.
      headers: { origin: new URL(page.url()).origin },
      data: { name: "Api Bypass", email: `nobg-api-${unique()}@test.dev`, password: PASSWORD, phone: "+919876543210", skillLevel: "beginner" },
    });
  // The sign-up rate limiter runs before the blood-group check; wait out a 429 if earlier tests used the window.
  let res = await signUpWithoutBloodGroup();
  for (let attempt = 0; res.status() === 429 && attempt < 3; attempt++) {
    await page.waitForTimeout(11_000);
    res = await signUpWithoutBloodGroup();
  }
  expect(res.status()).toBe(400);
  expect(await res.text()).toContain("blood group");
});

test("ID card: member ID on approval, no card without photo, CR80 PDF, QR verification and reissue", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const email = `card-${unique()}@test.dev`;
  await register(page, `Card ${uniqueWord()}`, email);
  // No member ID until approved.
  await expect(page.getByText("Issued on approval")).toBeVisible();

  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  const row = memberRow(page, email);
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row.getByTestId("member-code")).toHaveText(/^BBA-\d{4}-\d{5}$/);
  const code = (await row.getByTestId("member-code").innerText()).trim();

  // Searchable by member ID.
  await page.goto(`/admin/members?q=${code}`);
  await expect(memberRow(page, email)).toBeVisible();

  // Without a photo the card can't be printed or downloaded.
  await memberRow(page, email).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/members\/[^/?]+$/);
  const memberUrl = page.url();
  await page.getByRole("link", { name: "ID card" }).click();
  await expect(page.getByTestId("id-card-issues")).toContainText("photo");
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveCount(0);
  const blocked = await page.request.get(`${new URL(memberUrl).pathname}/id-card/pdf`);
  expect(blocked.status()).toBe(409);

  // With a photo it's ready: a 2-page CR80 PDF (85.6 × 53.98 mm) named after the ID.
  await page.goto(memberUrl);
  await page.locator("#member-photo").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save member" }).click();
  await expect(page.getByText("details were saved")).toBeVisible();
  await page.getByRole("link", { name: "ID card" }).click();
  const download = page.getByRole("link", { name: "Download PDF" });
  await expect(download).toBeVisible();
  const pdf = await page.request.get((await download.getAttribute("href"))!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(pdf.headers()["content-disposition"]).toContain(`attachment; filename="${code}-id-card.pdf"`);
  const body = (await pdf.body()).toString("latin1");
  expect(body.startsWith("%PDF-")).toBe(true);
  expect(body.match(/\/Type \/Page\b/g)).toHaveLength(2);
  expect(body).toMatch(/\/MediaBox \[ 0 0 242\.6\d* 153\.0\d* \]/);

  // Non-admins can't fetch cards: logged out → sent to login (never a PDF);
  // a signed-in member passes the proxy's cookie check but the route refuses (403).
  const pdfPath = new URL(pdf.url()).pathname;
  const anon = await browser.newContext();
  const loggedOut = await anon.request.get(pdfPath, { maxRedirects: 0 });
  expect(loggedOut.status()).toBe(307);
  expect(loggedOut.headers()["location"]).toContain("/login");
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await login(memberPage, email, PASSWORD);
  await memberPage.waitForURL("**/dashboard");
  await expect(memberPage.getByText(code)).toBeVisible(); // their own member ID on the dashboard
  expect((await memberPage.request.get(pdfPath)).status()).toBe(403);
  await memberContext.close();

  // The QR's verification page works logged out and shows live status.
  const verifyPath = (await page.getByRole("link", { name: "Open verification page" }).getAttribute("href"))!;
  const publicPage = await anon.newPage();
  await publicPage.goto(verifyPath);
  await expect(publicPage.getByTestId("verify-result")).toHaveAttribute("data-status", "active");
  await expect(publicPage.getByRole("heading", { name: "Valid member" })).toBeVisible();
  await expect(publicPage.getByTestId("verify-member-code")).toHaveText(code);
  await expect(publicPage.getByTestId("verify-plan")).toHaveText("No membership recorded");

  // Front-desk scan of the Code 128 (member ID) finds the same member.
  await page.goto("/admin/verify");
  await page.getByLabel("Member ID or card scan").fill(code.toLowerCase());
  await page.getByLabel("Member ID or card scan").press("Enter");
  await expect(page.getByTestId("verify-member-code")).toHaveText(code);

  // Lost card: reissue → the old QR stops verifying; the member ID stays the same.
  await page.goto(`${new URL(memberUrl).pathname}/id-card`);
  await page.getByRole("button", { name: /Reissue card/ }).click();
  await page.getByRole("button", { name: /Old card stops working/ }).click();
  await expect(page.getByText("New card issued")).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { name: "Card not recognised" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open verification page" })).not.toHaveAttribute("href", verifyPath);
  await expect(page.getByRole("heading", { name: "Member ID card" })).toBeVisible();
  await expect(page.getByText(code).first()).toBeVisible();

  // Accessibility of the new pages.
  for (const p of [page, publicPage]) {
    const { violations } = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
  await anon.close();
});

test("members upload and change their own photo from the dashboard", async ({ page }) => {
  await register(page, `Selfie ${uniqueWord()}`, `selfie-${unique()}@test.dev`);
  const photo = page.locator("#my-photo");
  await expect(page.getByText("Upload photo")).toBeVisible();

  // Non-images are rejected by content.
  await photo.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("<html>nope</html>") });
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByText("Use a JPG, PNG or WebP image.").first()).toBeVisible();

  await photo.setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByText("Your photo was updated.")).toBeVisible();
  await page.reload();
  // Persisted: the header avatar is now the uploaded image, and the button offers to change it.
  await expect(page.locator('main img[src^="/media/"], main img[srcset*="%2Fmedia%2F"]').first()).toBeVisible();
  await expect(page.getByText("Change photo")).toBeVisible();
  await expect(page.getByText("Remove current photo")).toHaveCount(0);
});

test("clicking a member in the list shows their details read-only", async ({ page }) => {
  const email = `viewme-${unique()}@test.dev`;
  const name = `View ${uniqueWord()}`;
  await register(page, name, email);
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await memberRow(page, email).getByRole("link", { name }).click();
  await page.waitForURL(/\/admin\/members\/[^/]+\/view$/);

  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  const details = page.getByTestId("member-details");
  await expect(details).toContainText(email);
  await expect(details).toContainText("+91 98765 43210");
  await expect(details).toContainText("B+");
  await expect(details).toContainText("Intermediate");
  // Read-only: no form fields; Edit is one click away.
  await expect(page.locator("main input, main select, main textarea")).toHaveCount(0);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue(name);
});

test("batch finder filters the schedule by level", async ({ page }) => {
  await page.goto("/#schedule");
  const cards = page.locator("#schedule").getByTestId("batch-card");
  const total = await cards.count();
  expect(total).toBeGreaterThan(1);

  // Seed data has beginner batches; the chip shows how many.
  const beginner = page.getByRole("button", { name: /^Beginner \d+$/ });
  const expected = Number((await beginner.innerText()).match(/\d+/)![0]);
  await beginner.click();
  await expect(beginner).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveCount(expected);
  for (const card of await cards.all()) await expect(card).toContainText("Beginner");

  await page.getByRole("button", { name: /^All batches/ }).click();
  await expect(cards).toHaveCount(total);
});
