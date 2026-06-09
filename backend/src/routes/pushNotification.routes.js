import express from 'express';
const router = express.Router();
import { subscribe, unsubscribe } from '../controllers/pushNotificationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { subscribeSchema } from '../validators/pushNotificationSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

router.post('/subscribe', validate({ body: subscribeSchema }), subscribe);
router.post('/unsubscribe', unsubscribe);

export default router;