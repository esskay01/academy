#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 (ARM) VM on Oracle Cloud.
# Run as the default `ubuntu` user:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/deploy/setup-server.sh -o setup.sh   (public repo)
#   ...or copy this file over with scp, then:  bash setup.sh git@github.com:<you>/<repo>.git
set -euo pipefail

REPO_URL="${1:?usage: bash setup-server.sh git@github.com:<you>/<repo>.git}"
APP_DIR="$HOME/bajrang"

echo "==> Updating packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates unattended-upgrades

if ! command -v docker >/dev/null; then
  echo "==> Installing Docker Engine + Compose plugin"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
sudo systemctl enable --now docker

echo "==> GitHub deploy key (read-only access for this VM to clone the repo)"
mkdir -p ~/.ssh && chmod 700 ~/.ssh
if [ ! -f ~/.ssh/github_deploy ]; then
  ssh-keygen -t ed25519 -N "" -C "bajrang-vm-deploy" -f ~/.ssh/github_deploy
fi
if ! grep -q "Host github.com" ~/.ssh/config 2>/dev/null; then
  printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
  chmod 600 ~/.ssh/config
fi
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null

echo
echo "Add this public key to GitHub → your repo → Settings → Deploy keys (read-only):"
echo "--------------------------------------------------------------------------------"
cat ~/.ssh/github_deploy.pub
echo "--------------------------------------------------------------------------------"
read -r -p "Press Enter once the deploy key is added... "

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chmod +x "$APP_DIR/deploy/"*.sh
mkdir -p "$APP_DIR/backups"

echo
echo "Done. Next:"
echo "  1. cp $APP_DIR/.env.production.example $APP_DIR/.env && nano $APP_DIR/.env"
echo "  2. Log out and back in (so the docker group applies), then:"
echo "     $APP_DIR/deploy/deploy.sh origin/main"
