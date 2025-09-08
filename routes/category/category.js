const express = require("express");
const router = express.Router();
const Category = require("../../controller/category/category");
const upload = require("../../middleware/fileHandler"); // Use your multer setup here
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.get("/category", Category.getAllCategories);
router.get("/category/:id", Category.getCategoryById);
router.post("/category", upload.single("image"), Category.addCategory);
router.put("/category/:id", upload.single("img"), Category.editCategory);
router.patch("/category/:id/status", Category.updateCategoryStatus);
router.delete("/category/:id", Category.deleteCategory);


module.exports = router;