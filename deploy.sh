#!/bin/bash

# Configuration
APP_DIR="/home/ubuntu/herridez/HerRidez-backend"
REPO_URL="git@github.com:EGC-india/HerRidez-backend.git"
PM2_PROCESS_NAME="herridez-backend"
KEEP_RELEASES=1

# Date as a release identifier
RELEASE_DATE=$(date +%Y%m%d%H%M%S)
NEW_RELEASE_DIR="$APP_DIR/releases/$RELEASE_DATE"

echo "🚀 Starting deployment for $PM2_PROCESS_NAME: $RELEASE_DATE"

# Load NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 1. Create directory structure if needed
if [ ! -d "$APP_DIR/releases" ]; then
    mkdir -p "$APP_DIR/releases"
    mkdir -p "$APP_DIR/storage"
fi

# 2. Clone the latest code
echo "📦 Cloning repository..."
git clone --depth 1 $REPO_URL $NEW_RELEASE_DIR
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed: Git clone failed. Check your SSH keys and Repo URL."
    exit 1
fi

# 3. Copy .env files from shared storage or preserving existing
# Prioritize .env.production and copy it as .env so dotenv picks it up
if [ -f "$APP_DIR/.env.production" ]; then
    echo "📄 Found .env.production, using it as .env"
    cp "$APP_DIR/.env.production" "$NEW_RELEASE_DIR/.env"
elif [ -f "$APP_DIR/storage/.env.production" ]; then
    echo "📄 Found storage/.env.production, using it as .env"
    cp "$APP_DIR/storage/.env.production" "$NEW_RELEASE_DIR/.env"
elif [ -f "$APP_DIR/.env" ]; then
    echo "📄 Found .env, using it"
    cp "$APP_DIR/.env" "$NEW_RELEASE_DIR/.env"
elif [ -f "$APP_DIR/storage/.env" ]; then
    echo "📄 Found storage/.env, using it"
    cp "$APP_DIR/storage/.env" "$NEW_RELEASE_DIR/.env"
else
    echo "⚠️ Warning: No .env or .env.production found. Application might fail to start."
fi

# 4. Install Dependencies
echo "npm installing..."
cd $NEW_RELEASE_DIR

# Optimization: Copy node_modules from previous release
if [ -d "$APP_DIR/current/node_modules" ]; then
    echo "📦 Copying node_modules from previous release..."
    cp -r "$APP_DIR/current/node_modules" "$NEW_RELEASE_DIR/node_modules"
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed: npm install failed."
    rm -rf $NEW_RELEASE_DIR
    exit 1
fi

# 5. Build the application
echo "🛠️ Building..."
# Increase memory limit just in case
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed: Build failed."
    rm -rf $NEW_RELEASE_DIR
    exit 1
fi

# Optimization: Remove devDependencies
echo "✂️ Pruning devDependencies..."
npm prune --production

# 6. Update Symlink (Atomic Switch)
echo "🔗 Switching symlink..."
rm -rf $APP_DIR/current
ln -sfn $NEW_RELEASE_DIR $APP_DIR/current

# 7. Restart PM2
echo "🔄 Reloading PM2..."
cd $APP_DIR/current
# Force delete to clear old CWD cache and ensure fresh start from new releases dir
pm2 delete $PM2_PROCESS_NAME 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production

# 8. Save PM2 list
pm2 save

# 9. Cleanup old releases
echo "🧹 Cleaning up old releases..."
cd $APP_DIR/releases
ls -dt * | tail -n +$(($KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "🎉 Deployment Successful!"
