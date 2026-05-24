const express = require('express');
const router = express.Router();
const { createUser, getUsers } = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const { schoolValidityMiddleware } = require('../middlewares/schoolMiddleware');

router.use(authMiddleware);
router.use(schoolValidityMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);

module.exports = router;
