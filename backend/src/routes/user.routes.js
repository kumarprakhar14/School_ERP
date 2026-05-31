const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

const { upload } = require('../utils/cloudinary');

router.get('/', roleMiddleware(['ADMIN', 'ACCOUNTS', 'TEACHER', 'SUPER_ADMIN']), getUsers);
router.get('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), getUser);
router.post('/', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), createUser);
router.put('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), upload.single('profilePic'), updateUser);
router.delete('/:userId', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), deleteUser);

module.exports = router;
