import { Router } from 'express';
import { authenticate } from '../middlewares/middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { getAllUsers } from '../controllers/admin.controller';

const router = Router();

router.get('/users', authenticate, isAdmin, getAllUsers);

export default router;
