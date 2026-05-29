const express = require('express');
const router = express.Router();
const { createUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);

const { upload } = require('../utils/cloudinary');

router.get('/', roleMiddleware(['ADMIN', 'ACCOUNTS', 'TEACHER']), getUsers);
router.post('/', roleMiddleware(['ADMIN']), createUser);
router.put('/:userId', roleMiddleware(['ADMIN']), upload.single('profilePic'), updateUser);
router.delete('/:userId', roleMiddleware(['ADMIN']), deleteUser);

module.exports = router;
