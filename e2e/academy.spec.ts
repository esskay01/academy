import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bajrang.academy";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const PASSWORD = "Player@12345";

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill("+91 98765 43210");
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
  await expect(page.getByRole("link", { name: "Inbox", exact: true })).toBeVisible();

  // Deactivating an admin also strips admin access.
  await loginAdmin(page);
  await page.goto(`/admin/members?q=${encodeURIComponent(email)}`);
  await row.getByRole("button", { name: "Mark inactive" }).click();
  await row.getByRole("button", { name: "Confirm deactivate" }).click();
  await expect(page.getByText("Admin access was removed.")).toBeVisible();
  await expect(row.getByTestId("status-badge")).toHaveText("Inactive");
  await expect(row.getByText("Admin", { exact: true })).toHaveCount(0); // role badge gone
  await expect(row.getByRole("button", { name: "Make admin" })).toBeVisible();
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
