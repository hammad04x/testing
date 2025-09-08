const express = require("express");
const router = express.Router();
const Item = require("../../controller/category/item");
const upload = require("../../middleware/fileHandler");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

// Admin / basic
router.get("/item", Item.getAllItems);
router.get("/item/category/:categoryId", Item.getItemsByCategory);
router.get("/item/:id", Item.getItemById);
router.post("/item", upload.single("image"), Item.addItem);
router.put("/item/:id", upload.single("image"), Item.editItem);
router.delete("/item/:id", Item.deleteItem);
router.patch("/item/:id/status", Item.updateItemStatus);

// Client (with pagination & search)
router.get("/itemClient", Item.getAllItemsClient);
router.get("/item/categoryClient/:categoryId", Item.getItemsByCategoryClient);

module.exports = router;