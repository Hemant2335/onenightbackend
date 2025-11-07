import admin from "firebase-admin";

import dotenv from "dotenv";

dotenv.config();

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH!);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
