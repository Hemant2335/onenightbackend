# Quick Fix for Permission Issues

The `dist/lib/prisma.js` file is owned by root. Run this command to fix it:

```bash
sudo rm -f dist/lib/prisma.js && sudo chown -R $(whoami) dist/lib && npm run dev
```

Or run the fix script:
```bash
./fix-prisma-perms.sh
```

After fixing permissions, the server should start successfully!

