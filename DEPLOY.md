# Deploying to app.sksap.com (Oracle Cloud Always Free + Cloudflare Tunnel)

```
 GitHub push ──► GitHub Actions: lint · types · unit · e2e ──► SSH ──► Oracle VM (ARM, Ubuntu)
                                                                         docker compose (prod)
 Visitor ──► Cloudflare (DNS, HTTPS, DDoS) ◄── outbound tunnel ── cloudflared ─► app ─► Postgres
                                                                         backup ─► Object Storage
```

- **Cost:** ₹0 on Oracle Always Free, the Cloudflare free plan and GitHub Actions' free minutes.
- **No open web ports:** the VM only accepts SSH. Web traffic comes in through the Cloudflare Tunnel, which the VM opens outbound.
- **Deploys:** every push to `main` is tested. If everything passes, that exact commit is built on the VM (natively on ARM) and deployed.

Follow the parts in order. Parts 1–7 are one-time setup.

---

## Part 1 — Oracle Cloud account

1. Sign up at **cloud.oracle.com**. A card is needed for verification (a small temporary hold).
2. **Home region:** choose **India West (Mumbai)** or **India South (Hyderabad)**. ⚠️ This is permanent, and Always Free resources exist only in your home region.
3. **Upgrade to Pay-As-You-Go:** go to *Billing & Cost Management → Upgrade and Manage Payment*. You still pay nothing while you stay within the Always Free limits, and PAYG accounts are not reclaimed when idle. A quiet academy site could otherwise be reclaimed.
4. **Budget alert:** go to *Billing → Budgets → Create Budget*. Set the amount to **₹1** with an email alert at 100%, so any accidental charge is flagged at once.

## Part 2 — Create the VM

Go to *Compute → Instances → Create instance*:

| Setting | Value |
|---|---|
| Image | **Canonical Ubuntu 24.04** (the *aarch64* build) |
| Shape | **Ampere → VM.Standard.A1.Flex**, **2 OCPU / 12 GB** (Always Free allows up to 4 / 24 in total) |
| Networking | Default VCN, public subnet, **assign a public IPv4** |
| SSH keys | Upload your public key, or let Oracle generate one and **download the private key** |
| Boot volume | Tick *Specify a custom boot volume size*: **100 GB** |

If you see "Out of host capacity", try another availability domain or retry later. It usually clears.

Note the **public IP**. From your PC:

```bash
ssh ubuntu@<VM_IP>
```

## Part 3 — Put the code on GitHub

Create a **private** repository on GitHub (e.g. `bajrang-academy`), with no README. Then on your PC:

```bash
cd Bajrang_academy_latest
git add -A && git commit -m "Deployment setup"
git branch -M main                      # the workflow deploys from `main`
git remote add origin git@github.com:<you>/bajrang-academy.git
git push -u origin main
```

The first push runs CI. The **deploy** job will fail until Part 7 is done; that's expected.

## Part 4 — Prepare the server

From your PC, copy the setup script to the VM and run it:

```bash
scp deploy/setup-server.sh ubuntu@<VM_IP>:~
ssh ubuntu@<VM_IP>
bash setup-server.sh git@github.com:<you>/bajrang-academy.git
```

The script:
- updates the system;
- installs Docker;
- creates a **read-only deploy key**, prints it and pauses. Add it on GitHub under *repo → Settings → Deploy keys → Add deploy key*; leave "Allow write access" **unticked**. Press Enter.
- clones the repo to `~/bajrang`.

Then **log out and back in** so your user can run Docker.

## Part 5 — Cloudflare Tunnel for app.sksap.com

`sksap.com` must be using Cloudflare's nameservers. It is if the domain shows as **Active** in your Cloudflare dashboard.

1. Open **Cloudflare dashboard → Zero Trust** (the free plan is fine), then *Networks → Tunnels → Create a tunnel*.
2. Choose **Cloudflared** and name it `bajrang`.
3. On the "Install connector" screen, **copy the token**: the long `eyJ…` value after `--token`. Don't run the install command; Docker runs cloudflared for us.
4. **Public hostname:**
   - Subdomain `app`, domain `sksap.com`
   - Service type **HTTP**, URL **`app:3000`**

   Cloudflare creates the DNS record automatically.
5. *SSL/TLS → Edge Certificates*: turn **Always Use HTTPS** on.

## Part 6 — Production settings on the VM

```bash
cd ~/bajrang
cp .env.production.example .env
openssl rand -hex 24        # → POSTGRES_PASSWORD
openssl rand -base64 32     # → BETTER_AUTH_SECRET
nano .env                   # fill in every value, including the tunnel token and your admin email/password
chmod 600 .env
```

`PUBLIC_URL` must be exactly `https://app.sksap.com`. Login cookies and security checks depend on it.

## Part 7 — First deploy, then automatic deploys

**First deploy (by hand, on the VM):**

```bash
bash ~/bajrang/deploy/deploy.sh origin/main
```

The first build takes a few minutes. When it prints `Deployed … healthy`:
- open **https://app.sksap.com**;
- log in on the **Admin login** tab with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

**Let GitHub deploy for you.** On your PC, create a key used only by GitHub Actions:

```bash
ssh-keygen -t ed25519 -f gh_actions_deploy -N "" -C "github-actions"
ssh-copy-id -i gh_actions_deploy.pub ubuntu@<VM_IP>      # or append the .pub to ~/.ssh/authorized_keys on the VM
ssh-keyscan -t ed25519 <VM_IP>                           # copy this output for DEPLOY_KNOWN_HOSTS
```

Then on GitHub go to *repo → Settings → Secrets and variables → Actions → New repository secret* and add:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | the VM's public IP |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | the full contents of `gh_actions_deploy` (the private key) |
| `DEPLOY_KNOWN_HOSTS` | the `ssh-keyscan` output line |

Delete the local `gh_actions_deploy` files once they're saved. Re-run the failed workflow, or push any change. From now on, **every push to `main` that passes all tests goes live automatically**.

To approve each release manually: *Settings → Environments → production → Required reviewers*.

## Part 8 — Off-server backups (recommended)

The `backup` service already writes a compressed database dump every night after 02:00 IST to `~/bajrang/backups` and keeps 14 days. Photos are stored in the database, so they're included. To also keep copies outside the VM:

1. In Oracle go to *Storage → Buckets → Create bucket* and name it `bajrang-backups` (private).
2. In the bucket, go to *Lifecycle Policy Rules → Create rule* and **Delete** objects older than **30 days**.
3. In the bucket, go to *Pre-Authenticated Requests → Create*:
   - Target: **Bucket**
   - Access: **Permit object writes**
   - Expiration: e.g. 1 year. Set a calendar reminder to renew it.

   Copy the URL; it ends in `/o/`.
4. On the VM, put that URL in `.env` as `BACKUP_UPLOAD_URL=…`, then run:

   ```bash
   cd ~/bajrang
   docker compose -f docker-compose.prod.yml up -d backup
   docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now   # should say "uploaded"
   ```

**Restore a backup** (this overwrites the current data):

```bash
cd ~/bajrang
gunzip -c backups/bajrang-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U bajrang -d bajrang
```

---

## Day-to-day operations (on the VM, in `~/bajrang`)

| Task | Command |
|---|---|
| Status | `docker compose -f docker-compose.prod.yml ps` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` (or `tunnel`, `backup`, `migrate`) |
| Restart the app | `docker compose -f docker-compose.prod.yml restart app` |
| Deploy a specific commit | `bash deploy/deploy.sh <commit-sha>` |
| Roll back | `bash deploy/deploy.sh <previous-good-sha>`* |
| Backup now | `docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now` |

\*Database migrations only go forward. Rolling back code across a migration may need a restore.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Admin saves fail with *"Invalid Server Actions request"* | Next.js requires the request `Host` to match the browser's origin. In the tunnel's public hostname go to *Additional application settings → HTTP Settings* and set **HTTP Host Header** = `app.sksap.com`. |
| Login works but you're immediately logged out | `PUBLIC_URL` in `.env` must be exactly `https://app.sksap.com`. Then run `deploy.sh` again. |
| `tunnel` container keeps restarting | Check `docker compose … logs tunnel`. Usually the token was pasted incompletely. |
| Deploy job: `Host key verification failed` | `DEPLOY_KNOWN_HOSTS` doesn't match the VM. Re-run `ssh-keyscan -t ed25519 <VM_IP>` and update the secret. |
| Build runs out of memory | Give the VM more RAM (up to 24 GB is free), or add swap. |

## Security notes

- **Nothing public except SSH (key-only):** no web port is exposed, and the app listens only on `127.0.0.1` on the VM. Ubuntu on Oracle allows SSH keys only by default; keep it that way.
- **Real client IP:** the app reads visitors' IPs from Cloudflare's `CF-Connecting-IP` header. That's what makes login rate-limiting work per person. It's only safe because the app can't be reached except through Cloudflare, so don't publish port 3000.
- **Optional extra lock on the admin area:** *Zero Trust → Access → Applications* can require an email one-time code for `app.sksap.com/admin*` before the page even loads. This is free for up to 50 users.
- **Never commit `.env`** (it's in `.gitignore`). Keep a copy of its values in a password manager, because the database password and auth secret are needed to restore on a new server.
