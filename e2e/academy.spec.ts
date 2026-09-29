import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bajrang.academy";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const PASSWORD = "Player@12345";

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
/** Letters-only unique token, for names (digits would make odd initials). */
const uniqueWord = () => [...String(Date.now()).slice(-7)].map((d) => "abcdefghij"[Number(d)]).join("");

// 1×1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Date of birth").fill("2008-04-12");
  await page.getByLabel("Current skill level").selectOption("intermediate");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.waitForURL("**/dashboard**");
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
  await page.getByLabel("Password").fill(password);

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
  const figure = page.locator("#testimonials figure").filter({ hasText: name });
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
