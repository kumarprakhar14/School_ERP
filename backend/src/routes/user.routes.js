import express from 'express';
const router = express.Router();
import { createUser, getUsers, getUser, updateUser, disableUser, enableUser, archiveUser, restoreUser } from '../controllers/userController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';
import { schoolValidityMiddleware } from '../middlewares/schoolMiddleware.js';
import { validate } from '../validators/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/userSchemas.js';

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

import { upload } from '../utils/cloudinary.js';

router.get('/', roleMiddleware(['ADMIN', 'ACCOUNTS', 'TEACHER', 'SUPER_ADMIN']), getUsers);
router.get('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), getUser);
router.post('/', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), validate({ body: createUserSchema }), createUser);
// Note: updateUser uses multer for profilePic upload, so validation runs after multer parses multipart form
router.put('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), upload.single('profilePic'), validate({ body: updateUserSchema }), updateUser);

router.patch('/:userId/disable', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), disableUser);
router.patch('/:userId/enable', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), enableUser);
router.patch('/:userId/archive', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), archiveUser);
router.patch('/:userId/restore', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), restoreUser);

export default router;
