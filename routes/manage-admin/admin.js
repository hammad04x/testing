
const express = require("express");
const router = express.Router();
const admin = require("../../controller/manage-admin/admin");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

// Simple routes without token & role check
router.get("/getadmin", admin.getadmin);
router.get("/getadminbyid/:id", admin.getadminbyid);

router.post("/addadmin", admin.addadmin);
router.put("/updateadmin/:id", admin.updateadmin);
router.put("/updateadminstatus/:id", admin.adminstatus);
router.delete("/deleteadmin/:id", admin.deleteAdmin);

module.exports = router;



