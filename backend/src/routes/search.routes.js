import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import searchController from '../controllers/searchController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', searchController.search);

export default router;
