const express = require("express");
const router = express.Router();
const GeneralSettings = require("../../controller/settings/generalSetting");
const upload = require("../../middleware/fileHandler"); // Your configured multer middleware
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.get("/general-settings", GeneralSettings.getGeneralSettings);

router.put(
  "/general-settings",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  GeneralSettings.updateGeneralSettings
);

module.exports = router;
