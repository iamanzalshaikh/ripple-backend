#!/bin/bash
# Template: set APP_DIR, REPO_URL, PM2_PROCESS_NAME before using non-Docker deploys.

set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/ripple/ripple-backend}"
REPO_URL="${REPO_URL:-git@github.com:YOUR_ORG/ripple-backend.git}"
PM2_PROCESS_NAME="${PM2_PROCESS_NAME:-ripple-backend}"

echo "Deploy scaffold only — configure APP_DIR and REPO_URL, then add your build steps."
