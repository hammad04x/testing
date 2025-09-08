const express = require("express");
const router = express.Router();
const Gallery = require("../../controller/gallary/gallary");
const upload = require("../../middleware/fileHandler");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.get("/gallery", Gallery.getAllGallery);
router.get("/galleryClient", Gallery.getAllGalleryClient);
router.get("/gallery/:id", Gallery.getGalleryById);
router.post("/gallery", upload.single("img"), Gallery.addGallery);
router.put("/gallery/:id", upload.single("img"), Gallery.editGallery);
router.delete("/gallery/:id", Gallery.deleteGallery);

module.exports = router;
