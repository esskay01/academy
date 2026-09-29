# Deployment Guide — Bajrang Badminton Academy

This guide takes a **brand-new Ubuntu 24.04 VM with nothing installed** to a live site at your subdomain (examples use **`app.sksap.com`**). After setup, **every push to GitHub deploys automatically**.

It's written for your current setup:

| Item | Your setup |
|---|---|
| Server | Ubuntu 24.04 VM, AMD EPYC 7763 (x86-64), reachable over SSH with a private key |
| Code | GitHub repo `esskay01/academy` |
| Domain | `sksap.com` on Cloudflare, with a subdomain for the app |

> `DEPLOY.md` in the repo describes an Oracle Cloud ARM VM. **For your server, follow this guide instead.** The app files are the same; only the server steps differ.

---

## How it works

```
You: git push ──► GitHub Actions ──(tests pass)──► SSH into your VM ──► deploy/deploy.sh
                   lint · types · unit · e2e                            builds & restarts Docker

Visitor ──► https://app.sksap.com ──► Cloudflare (HTTPS, DDoS protection)
                                          │  encrypted tunnel, opened *outbound* by the VM
                                          ▼
                    VM: [cloudflared] ─► [app :3000] ─► [Postgres]   [nightly backup]
```

- **No web ports are opened on the VM.** Visitors reach the app only through a **Cloudflare Tunnel**, which the VM opens outbound. The VM only needs SSH (port 22) open.
- **Why a tunnel and not a plain DNS record pointing at the VM?** The app is built to sit behind Cloudflare. It reads each visitor's real IP from Cloudflare's `CF-Connecting-IP` header, which makes login brute-force protection work per person. That's only safe if the app can't be reached any other way. **So the DNS record you created for the subdomain will be replaced in Step 5.**
- **Everything runs in Docker:** Next.js app, PostgreSQL 18, cloudflared and a backup job. The image is built **on the VM**; x86-64 is fully supported.

**Time needed:** about 45–60 minutes the first time.

### What you need before starting
- [ ] The VM's **public IP address** and **SSH username** (e.g. `ubuntu` or `azureuser`, depending on the provider)
- [ ] The **private key** file for SSH (e.g. `C:\Users\Sham\.ssh\vm_key`)
- [ ] Access to **GitHub** (`esskay01/academy` → Settings) and the **Cloudflare** dashboard for `sksap.com`
- [ ] A terminal on your PC. On Windows use **Git Bash** or **PowerShell**; both have `ssh` and `scp`.

Throughout this guide, replace:
- `<VM_IP>` with the VM's public IP
- `<USER>` with the SSH username
- `<KEY>` with the path to your private key

---

## Step 0 — Make sure GitHub has your latest code on `main`

The deployment pipeline only runs for the **`main`** branch. When this guide was written:
- your latest commit (`first_push_to_github`) was on your **local `master`** branch;
- GitHub's `main` was still on an **older commit** without the deployment files (`deploy/`, `docker-compose.prod.yml`, `.github/workflows/`).

On your PC, in the project folder:

```bash
git add Guide.md
git commit -m "Add deployment guide"
git status                      # should now say "nothing to commit, working tree clean"
git push origin master:main     # publish your local master as GitHub's main
```

To use `main` locally from now on as well (recommended):

```bash
git branch -M main              # rename local master → main
git push -u origin main         # track GitHub's main
```

**Check:** on GitHub, open the repo, select the `main` branch and confirm you can see these folders and files: `deploy/`, `.github/workflows/ci-deploy.yml`, `docker-compose.prod.yml`, `Guide.md`.

> The push starts a workflow run in the **Actions** tab. The **Deploy** job will fail until Steps 1–8 are done. That's expected; ignore it for now.

---

## Step 1 — Connect to the VM

```bash
ssh -i <KEY> <USER>@<VM_IP>
```

If Windows complains that the key's permissions are too open, run this in PowerShell and retry:

```powershell
icacls <KEY> /inheritance:r /grant:r "$($env:USERNAME):R"
```

**Tip:** to avoid typing the key every time, add this to `~/.ssh/config` on your PC (`C:\Users\Sham\.ssh\config`):

```
Host academy-vm
  HostName <VM_IP>
  User <USER>
  IdentityFile <KEY>
```

Then just run `ssh academy-vm`. The rest of this guide uses the full form.

---

## Step 2 — Lock down the firewall

In your cloud provider's console, open the VM's **network security group / firewall rules**:

| Direction | Port | Rule |
|---|---|---|
| Inbound | 22 (SSH) | Allow. Ideally from your IP only, but GitHub Actions also needs it; see the note below. |
| Inbound | 80, 443, 3000, 5432 | **Not needed. Remove them if they're open.** |
| Outbound | all | Allow (the default). cloudflared needs outbound 443 and 7844. |

> **GitHub Actions and SSH:** GitHub's servers use many changing IP addresses, so port 22 must be reachable from the internet for automatic deploys. That's fine because the VM only accepts **key-based** logins. Check this on the VM:
> ```bash
> sudo sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'
> ```
> The output should be `passwordauthentication no` and `permitrootlogin no` (or `without-password`).

---

## Step 3 — Add swap if the VM has less than 4 GB of RAM

Building the app needs about 2–3 GB of memory. Check what you have:

```bash
free -h
```

If **total memory is below 4 GB** and swap shows `0B`, add a 4 GB swap file:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h        # Swap should now show 4.0Gi
```

---

## Step 4 — Install Docker and clone the repository

The repo includes a setup script that:
- updates Ubuntu;
- installs Docker and the Compose plugin;
- creates a **read-only deploy key** for GitHub;
- clones the code to `~/bajrang`.

**4a. Copy the script to the VM.** From your PC, in the project folder:

```bash
scp -i <KEY> deploy/setup-server.sh <USER>@<VM_IP>:~
```

**4b. Run it on the VM:**

```bash
ssh -i <KEY> <USER>@<VM_IP>
bash setup-server.sh git@github.com:esskay01/academy.git
```

**4c. Add the deploy key when prompted.** The script prints a public key starting with `ssh-ed25519 …` and pauses.
1. On GitHub, open **`esskay01/academy` → Settings → Deploy keys → Add deploy key**.
2. Title: `academy-vm`. Key: paste the printed line. **Leave "Allow write access" unticked.**
3. Click **Add key**, go back to the VM terminal and press **Enter**.

The script then clones the repository into `~/bajrang`.

**4d. Log out and back in** so your user can run Docker without `sudo`:

```bash
exit
ssh -i <KEY> <USER>@<VM_IP>
docker run --rm hello-world        # should print "Hello from Docker!"
```

---

## Step 5 — Create the Cloudflare Tunnel for your subdomain

**5a. Remove the DNS record you created earlier.** The tunnel needs to own the subdomain's DNS record.
1. In the **Cloudflare dashboard**, open **sksap.com → DNS → Records**.
2. Find the record for your subdomain (e.g. `app`, type **A**, pointing at the VM's IP).
3. **Delete** it. The tunnel re-creates the right record in 5c.

**5b. Create the tunnel:**
1. In the Cloudflare dashboard, open **Zero Trust**. If asked, choose the **Free** plan; it's enough.
2. Go to **Networks → Tunnels → Create a tunnel**.
3. Choose **Cloudflared**, name it `academy`, and click **Save tunnel**.
4. On the **"Install and run a connector"** page, pick any OS and **copy only the token**: the long string starting with `eyJ` after `--token`. Save it for Step 6.
5. **Don't** run the install command shown. Docker runs cloudflared for you. Click **Next**.

**5c. Route the subdomain to the app.** On the **Public Hostname** (or **Route traffic**) page:

| Field | Value |
|---|---|
| Subdomain | `app` (or your chosen subdomain) |
| Domain | `sksap.com` |
| Path | *(leave empty)* |
| Service → Type | **HTTP** |
| Service → URL | **`app:3000`** |

Click **Save**. Cloudflare creates a proxied DNS record for `app.sksap.com` automatically.

> Use `app:3000` exactly. `app` is the container's name inside Docker, not `localhost`.

**5d. HTTPS settings.** Go to **sksap.com → SSL/TLS → Edge Certificates** and turn **Always Use HTTPS** on.

---

## Step 6 — Create the production settings file (`.env`)

On the VM:

```bash
cd ~/bajrang
cp .env.production.example .env
```

Generate two secrets:

```bash
openssl rand -hex 24        # copy the output → POSTGRES_PASSWORD
openssl rand -base64 32     # copy the output → BETTER_AUTH_SECRET
```

Edit the file with `nano .env`, save with **Ctrl+O, Enter**, and exit with **Ctrl+X**:

| Setting | What to put |
|---|---|
| `PUBLIC_URL` | `https://app.sksap.com`: your subdomain, with `https://` and **no trailing slash** |
| `POSTGRES_PASSWORD` | first generated value |
| `BETTER_AUTH_SECRET` | second generated value |
| `ADMIN_EMAIL` | the email you'll use to log in as admin |
| `ADMIN_PASSWORD` | a strong password (12+ characters) |
| `ADMIN_NAME` | e.g. `Academy Admin` |
| `CLOUDFLARE_TUNNEL_TOKEN` | the `eyJ…` token from Step 5b |
| `BACKUP_KEEP_DAYS` | `14` (days of nightly backups to keep on the VM) |
| `BACKUP_UPLOAD_URL` | leave empty for now (see Step 10) |

Then protect the file:

```bash
chmod 600 .env
```

> **Keep a copy of these values in a password manager.** You need `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` to restore the site on another server.
>
> The admin account is created **only on the first deploy**. Changing `ADMIN_PASSWORD` later does not change the existing admin's password.

---

## Step 7 — First deploy (manual)

On the VM:

```bash
bash ~/bajrang/deploy/deploy.sh origin/main
```

The first run downloads images and builds the app, which takes about 3–8 minutes. The script:
1. checks out the latest `main`;
2. builds the Docker images;
3. starts Postgres, runs **database migrations and the initial seed** (admin account plus starter content);
4. starts the app, then the tunnel and the backup job;
5. waits for the app's health check and prints **`==> Deployed <commit> — healthy`**.

**Check that everything is running:**

```bash
cd ~/bajrang
docker compose -f docker-compose.prod.yml ps
```

You should see:
- `db`, `app`, `tunnel` and `backup` with status **Up**;
- `app` and `db` also showing **(healthy)**;
- `migrate` as **Exited (0)**, which is normal because it's a one-time job.

**Check the tunnel connected:**

```bash
docker compose -f docker-compose.prod.yml logs tunnel | grep -i "registered tunnel connection"
```

In Cloudflare Zero Trust → Tunnels, the `academy` tunnel should show **HEALTHY**.

**Open the site:** browse to **https://app.sksap.com**, then:
1. Click **Log in**, choose the **Admin login** tab and use `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. In **Site & contact**, change something small and **save**. The change should show on the home page.

If saving fails with *"Invalid Server Actions request"*, see **Troubleshooting** below.

---

## Step 8 — Turn on automatic deploys from GitHub

From now on, GitHub Actions will SSH into the VM and run `deploy.sh` after all tests pass. It needs **its own SSH key**, separate from your personal key.

**8a. Create a key for GitHub Actions** (on your PC, in any folder):

```bash
ssh-keygen -t ed25519 -f gh_actions_deploy -N "" -C "github-actions-deploy"
```

This creates `gh_actions_deploy` (private) and `gh_actions_deploy.pub` (public).

**8b. Allow that key on the VM.** Copy the one line from `gh_actions_deploy.pub`, then on the VM:

```bash
echo 'ssh-ed25519 AAAA…paste the whole line… github-actions-deploy' >> ~/.ssh/authorized_keys
```

Test it from your PC:

```bash
ssh -i gh_actions_deploy <USER>@<VM_IP> 'echo ok'
```

The output should be `ok`.

**8c. Get the VM's host fingerprint** (on your PC). Use the **IP address**, not the subdomain, because the subdomain now points to Cloudflare:

```bash
ssh-keyscan -t ed25519 <VM_IP>
```

Copy the whole output line (it starts with the IP).

**8d. Add GitHub secrets.** Go to **`esskay01/academy` → Settings → Secrets and variables → Actions → New repository secret** and add four secrets:

| Name | Value |
|---|---|
| `DEPLOY_HOST` | the VM's public IP (`<VM_IP>`) |
| `DEPLOY_USER` | the SSH username (`<USER>`) |
| `DEPLOY_SSH_KEY` | the **entire contents** of `gh_actions_deploy`, including the `-----BEGIN…` and `-----END…` lines |
| `DEPLOY_KNOWN_HOSTS` | the `ssh-keyscan` output line from 8c |

Then **delete `gh_actions_deploy` and `gh_actions_deploy.pub` from your PC**. GitHub has the key now.

**8e. If your subdomain is NOT `app.sksap.com`,** edit `.github/workflows/ci-deploy.yml`, replace both occurrences of `https://app.sksap.com` with your URL, then commit and push.

**8f. (Optional) Require your approval before each release.** Go to **Settings → Environments → production** (it appears after the first run) and add yourself under **Required reviewers**.

**8g. Run the pipeline.** Go to **Actions → CI & Deploy → the latest run → Re-run all jobs**, or push any commit to `main`. The run has three jobs:

| Job | What it does | Typical time |
|---|---|---|
| Lint, types & unit tests | code checks | ~2 min |
| End-to-end (Docker) | starts the full app in Docker on GitHub's runner and clicks through the site like a user | ~8–10 min |
| Deploy to app.sksap.com | SSH → `deploy.sh <exact commit>` → checks the public site responds | ~3–5 min |

When all three are green, the site is running that commit.

---

## Step 9 — Everyday workflow

1. Make changes on your PC and test them locally if you like (`docker compose up -d --build`).
2. Commit and push to `main`:
   ```bash
   git add -A
   git commit -m "Describe the change"
   git push
   ```
3. Watch **GitHub → Actions**. If tests fail, nothing is deployed and the live site stays on the previous version. Open the failed job to see why; a Playwright report is attached to failed e2e runs.

Only commits on `main` deploy. Pull requests run the tests but never deploy.

---

## Step 10 — Backups

The `backup` container writes a compressed database dump **every night after 02:00 IST** to `~/bajrang/backups/` on the VM and keeps `BACKUP_KEEP_DAYS` days. Uploaded photos are stored in the database, so they're included.

| Task | Command (on the VM, in `~/bajrang`) |
|---|---|
| Take a backup now | `docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now` |
| List backups | `ls -lh backups/` |
| Copy one to your PC | *(run on your PC)* `scp -i <KEY> <USER>@<VM_IP>:~/bajrang/backups/bajrang-YYYY-MM-DD.sql.gz .` |

**Restore a backup** (⚠️ this replaces the current data):

```bash
cd ~/bajrang
gunzip -c backups/bajrang-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U bajrang -d bajrang
```

**Off-server copies (recommended):** copies on the same VM don't survive losing the VM. Either download a backup to your PC regularly with the `scp` command above, or set `BACKUP_UPLOAD_URL` in `.env`. That URL must be a storage URL that accepts an HTTP `PUT` upload, such as an Oracle Cloud Object Storage *pre-authenticated request* (free tier) ending in `/o/`. Then run:

```bash
docker compose -f docker-compose.prod.yml up -d backup
docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now   # should say "uploaded"
```

---

## Day-to-day operations (on the VM, in `~/bajrang`)

| Task | Command |
|---|---|
| Status of all services | `docker compose -f docker-compose.prod.yml ps` |
| Follow app logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Other logs | same, with `tunnel`, `db`, `migrate` or `backup` |
| Restart the app | `docker compose -f docker-compose.prod.yml restart app` |
| Deploy the latest `main` by hand | `bash deploy/deploy.sh origin/main` |
| Deploy / roll back to a specific commit | `bash deploy/deploy.sh <commit-sha>` |
| Disk usage | `df -h` and `docker system df` |
| Free disk from old images | `docker image prune -f` (deploy does this automatically) |
| After changing `.env` | `docker compose -f docker-compose.prod.yml up -d` |
| OS security updates | `sudo apt update && sudo apt upgrade -y` (Ubuntu also applies them automatically) |
| Reboot | `sudo reboot`. All containers restart on their own. |

> **Rolling back:** `deploy.sh <older-sha>` restores older **code**, but database changes (migrations) only go forward. If a release changed the database, restore the backup taken before it as well.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `permission denied … docker.sock` | You haven't logged out and back in since Step 4. Run `exit` and reconnect. |
| `deploy.sh`: *Missing .env* | Step 6 not done, or the file isn't in `~/bajrang`. |
| `docker compose` says *required variable … is missing* | That setting is empty in `.env`. Fill it in and re-run `deploy.sh`. |
| Build stops with `Killed` / out of memory | Add swap (Step 3) or give the VM more RAM. |
| Site shows a **Cloudflare 1033 / 502** error | Tunnel not connected. Check `docker compose -f docker-compose.prod.yml logs tunnel`. Usually the token was pasted incompletely, or the public hostname's URL isn't exactly `app:3000` with type HTTP. |
| Subdomain doesn't resolve, or shows the old server | The old DNS record wasn't deleted (Step 5a), or the tunnel's public hostname wasn't saved. Check **DNS → Records**: the subdomain should be a proxied CNAME to `…cfargotunnel.com`. |
| Admin saves fail with *"Invalid Server Actions request"* | In **Zero Trust → Tunnels → academy → Public hostname → Edit → Additional application settings → HTTP Settings**, set **HTTP Host Header** to `app.sksap.com`. |
| Log in works but you're logged straight back out | `PUBLIC_URL` in `.env` isn't exactly `https://app.sksap.com`. Fix it, then run `docker compose -f docker-compose.prod.yml up -d`. |
| Login says *"Too many requests"* | Built-in brute-force protection. Wait about 10 seconds and try again. |
| Actions **Deploy** job: `Permission denied (publickey)` | `DEPLOY_SSH_KEY` or `DEPLOY_USER` is wrong, or the public key isn't in `~/.ssh/authorized_keys` on the VM (Step 8b). |
| Actions **Deploy** job: `Host key verification failed` | `DEPLOY_KNOWN_HOSTS` doesn't match. Re-run `ssh-keyscan -t ed25519 <VM_IP>` and update the secret. |
| Actions **Deploy** job: `Connection timed out` | Port 22 isn't reachable from the internet (Step 2), or `DEPLOY_HOST` is the subdomain instead of the IP. |
| The workflow didn't run after a push | You pushed a branch other than `main` (see Step 0). |
| Actions job "Check the public site" fails but deploy succeeded | The URL in `ci-deploy.yml` doesn't match your subdomain (Step 8e). |

---

## Security checklist

- [ ] Only SSH (22) is open inbound; 80, 443, 3000 and 5432 are closed (Step 2).
- [ ] SSH password login is disabled (Step 2 check).
- [ ] `.env` has `chmod 600` and is **never** committed. It's in `.gitignore`.
- [ ] The GitHub deploy key (VM → GitHub) is **read-only**.
- [ ] The GitHub Actions SSH key (GitHub → VM) exists only in GitHub Secrets, not on your PC.
- [ ] A strong `ADMIN_PASSWORD`, and secrets stored in a password manager.
- [ ] Backups are copied off the VM regularly (Step 10).
- [ ] *Optional:* in **Cloudflare Zero Trust → Access → Applications**, protect `app.sksap.com/admin*` with an email one-time PIN, so only your team can even open the admin pages. This is free for up to 50 users.
