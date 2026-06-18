import { Router } from 'express';
import {
  getGlobalFlags,
  createGlobalFlag,
  archiveGlobalFlag
} from '../controllers/globalFlag.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

router.get('/', getGlobalFlags);
router.post('/', createGlobalFlag);
router.put('/:id/archive', archiveGlobalFlag);

export default router;
