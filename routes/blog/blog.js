const express = require("express");
const router = express.Router();
const Blog = require("../../controller/blog/blog");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

// Route definitions
router.get("/blog", Blog.getAllBlogs);           // All blogs
router.get("/blog/:id", Blog.getBlogById);       // Single blog
router.post("/blog", Blog.addBlog);              // New blog
router.put("/blog/:id", Blog.editBlog);          // Edit blog
router.delete("/blog/:id", Blog.deleteBlog);     // Delete blog

module.exports = router;
