#!/bin/bash
echo "Fixing permissions for dist/lib/prisma.js..."
sudo rm -f dist/lib/prisma.js
sudo chown -R $(whoami) dist/lib
echo "Done! Try 'npm run dev' again"
