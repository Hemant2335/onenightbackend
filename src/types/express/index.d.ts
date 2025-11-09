declare global {
  namespace Express {
    interface Request {
      user: {
        uid: string;
        email?: string;
        phone_number?: string;
      };
    }
  }
}
