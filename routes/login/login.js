const express = require('express');
const router = express.Router();
const login = require('../../controller/login/login');
const verifyToken = require('../../middleware/verifyToken');
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.post('/login', login.login);
router.post('/refresh-token', verifyToken, login.refreshToken);
router.post('/update-activity', verifyToken, login.updateActivity);
router.post('/logout', verifyToken, login.logout);
router.get('/getagencybyid/:id', verifyToken, login.getAgencyById);

module.exports = router;
