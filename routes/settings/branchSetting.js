// Updated routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllBranchesForDashboard,
  getAllBranchesForWebsite,
  getBranchById,
  updateBranch,
  updateBranchStatus,
  addBranch,
  deleteBranch,
  getBranchStats,
  getAllCategories,
  addCategory,
  updateCategoryStatus,
  deleteCategory,
} = require('../../controller/settings/branchSetting');
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

// Branch routes
router.get('/branches/dashboard', getAllBranchesForDashboard);  // GET /api/branches/dashboard
router.get('/branches/website', getAllBranchesForWebsite);      // GET /api/branches/website
router.get('/branches/stats', getBranchStats);                  // GET /api/branches/stats

// Single branch operations
router.get('/branch/:id', getBranchById);                       // GET /api/branch/:id
router.put('/branch/:id', updateBranch);                        // PUT /api/branch/:id
router.put('/branch/:id/status', updateBranchStatus);           // PUT /api/branch/:id/status
router.delete('/branch/:id', deleteBranch);                     // DELETE /api/branch/:id

// Add new branch
router.post('/branch', addBranch);                              // POST /api/branch

// Category routes
router.get('/category-branch', getAllCategories);               // GET /api/category-branch
router.post('/category-branch', addCategory);                   // POST /api/category-branch
router.put('/category-branch/:id/status', updateCategoryStatus);// PUT /api/category-branch/:id/status
router.delete('/category-branch/:id', deleteCategory);          // DELETE /api/category-branch/:id



module.exports = router;