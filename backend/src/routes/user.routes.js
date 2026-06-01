import express from 'express';
const router = express.Router();
import { createUser, getUsers, getUser, updateUser, deleteUser } from '../controllers/userController.js';
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
router.delete('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), deleteUser);

export default router;
