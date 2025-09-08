const express = require("express");
const router = express.Router();
const Banner = require("../../controller/banner/banner");
const upload = require("../../middleware/fileHandler");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.get("/banner", Banner.getBanner);
router.put("/banner", upload.single("background_image"), Banner.updateBanner);

module.exports = router;