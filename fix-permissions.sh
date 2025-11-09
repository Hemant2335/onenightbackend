#!/bin/bash
# Fix permissions for dist and generated directories

echo "Fixing permissions for dist and generated directories..."
echo "You may be prompted for your password."

sudo chown -R $(whoami) dist generated src/generated 2>/dev/null || true
sudo chmod -R u+w dist generated src/generated 2>/dev/null || true

echo "Permissions fixed! You can now run 'npm run dev'"

