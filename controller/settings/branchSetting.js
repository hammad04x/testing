// Updated controller/settings/branchSetting.js
const connection = require("../../connection/connection");

// Get all branches for DASHBOARD (active + inactive) with category join
const getAllBranchesForDashboard = (req, res) => {
  const query = `
    SELECT b.*, c.name AS category_name 
    FROM branches b 
    LEFT JOIN category_branch c ON b.category_id = c.id 
    ORDER BY b.status ASC, c.name ASC, b.name ASC
  `;
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching branches for dashboard:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching branches",
        error: err.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Branches fetched successfully",
      branches: results
    });
  });
};

// Get all branches for WEBSITE (only active) with category
const getAllBranchesForWebsite = (req, res) => {
  const query = `
    SELECT b.*, c.name AS category_name 
    FROM branches b 
    LEFT JOIN category_branch c ON b.category_id = c.id 
    WHERE b.status = 'active' 
    ORDER BY c.name ASC, b.name ASC
  `;
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching branches for website:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching branches",
        error: err.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Active branches fetched successfully",
      branches: results
    });
  });
};

// Get single branch by ID with category
const getBranchById = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Branch ID is required"
    });
  }

  const query = `
    SELECT b.*, c.name AS category_name 
    FROM branches b 
    LEFT JOIN category_branch c ON b.category_id = c.id 
    WHERE b.id = ?
  `;
  
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching branch:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching branch data",
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch data fetched successfully",
      branch: results[0]
    });
  });
};

// Update branch by ID (now includes category_id)
const updateBranch = (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    location,
    phone_main,
    phone_orders,
    email_info,
    email_orders,
    opening_hours,
    map_embed
  } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Branch ID is required"
    });
  }

  // Validate required fields
  if (!location || !phone_main || !email_info || !opening_hours) {
    return res.status(400).json({
      success: false,
      message: "Location, main phone, info email, and opening hours are required"
    });
  }

  // Allow category_id to be null or empty for uncategorized
  const effectiveCategoryId = category_id || null;

  const query = `
    UPDATE branches 
    SET 
      category_id = ?,
      location = ?,
      phone_main = ?,
      phone_orders = ?,
      email_info = ?,
      email_orders = ?,
      opening_hours = ?,
      map_embed = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
    effectiveCategoryId,
    location,
    phone_main,
    phone_orders,
    email_info,
    email_orders,
    opening_hours,
    map_embed,
    id
  ];

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error("Error updating branch:", err);
      return res.status(500).json({
        success: false,
        message: "Error updating branch data",
        error: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or no changes made"
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      affectedRows: results.affectedRows
    });
  });
};

// Update branch status (active/inactive)
const updateBranchStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Branch ID is required"
    });
  }

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid status (active/inactive) is required"
    });
  }

  const query = "UPDATE branches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  
  connection.query(query, [status, id], (err, results) => {
    if (err) {
      console.error("Error updating branch status:", err);
      return res.status(500).json({
        success: false,
        message: "Error updating branch status",
        error: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Branch status updated to ${status} successfully`,
      affectedRows: results.affectedRows
    });
  });
};

// Add new branch (now includes category_id)
const addBranch = (req, res) => {
  const {
    name,
    category_id,
    location,
    phone_main,
    phone_orders,
    email_info,
    email_orders,
    opening_hours,
    map_embed
  } = req.body;

  // Validate required fields
  if (!name || !location || !phone_main || !email_info || !opening_hours) {
    return res.status(400).json({
      success: false,
      message: "Name, location, main phone, info email, and opening hours are required"
    });
  }

  // Allow category_id to be empty for uncategorized
  const effectiveCategoryId = category_id || null;

  const query = `
    INSERT INTO branches 
    (name, category_id, location, phone_main, phone_orders, email_info, email_orders, opening_hours, map_embed, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const values = [
    name,
    effectiveCategoryId,
    location,
    phone_main,
    phone_orders,
    email_info,
    email_orders,
    opening_hours,
    map_embed
  ];

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error("Error adding branch:", err);
      return res.status(500).json({
        success: false,
        message: "Error adding new branch",
        error: err.message
      });
    }

    res.status(201).json({
      success: true,
      message: "Branch added successfully",
      branchId: results.insertId
    });
  });
};

// DELETE branch permanently from database
const deleteBranch = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Branch ID is required"
    });
  }

  const query = "DELETE FROM branches WHERE id = ?";
  
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error deleting branch:", err);
      return res.status(500).json({
        success: false,
        message: "Error deleting branch",
        error: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch permanently deleted from database",
      affectedRows: results.affectedRows
    });
  });
};

// Get branch statistics
const getBranchStats = (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_branches,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches,
      COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_branches
    FROM branches
  `;
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching branch statistics:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching branch statistics",
        error: err.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch statistics fetched successfully",
      stats: results[0]
    });
  });
};

// New functions for category_branch management

// Get all categories
const getAllCategories = (req, res) => {
  const query = "SELECT * FROM category_branch ORDER BY status ASC, name ASC";
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: err.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      categories: results
    });
  });
};

// Add new category
const addCategory = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Category name is required"
    });
  }

  const query = `
    INSERT INTO category_branch 
    (name, status, created_at, updated_at)
    VALUES (?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  connection.query(query, [name], (err, results) => {
    if (err) {
      console.error("Error adding category:", err);
      return res.status(500).json({
        success: false,
        message: "Error adding new category",
        error: err.message
      });
    }

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      categoryId: results.insertId
    });
  });
};

// Update category status
const updateCategoryStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Category ID is required"
    });
  }

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid status (active/inactive) is required"
    });
  }

  const query = "UPDATE category_branch SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  
  connection.query(query, [status, id], (err, results) => {
    if (err) {
      console.error("Error updating category status:", err);
      return res.status(500).json({
        success: false,
        message: "Error updating category status",
        error: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Category status updated to ${status} successfully`,
      affectedRows: results.affectedRows
    });
  });
};

// Delete category (set branches category_id to NULL if needed)
const deleteCategory = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Category ID is required"
    });
  }

  // First, set category_id to NULL in branches
  const updateBranchesQuery = "UPDATE branches SET category_id = NULL WHERE category_id = ?";
  
  connection.query(updateBranchesQuery, [id], (err) => {
    if (err) {
      console.error("Error updating branches before category delete:", err);
      return res.status(500).json({
        success: false,
        message: "Error preparing category deletion",
        error: err.message
      });
    }

    // Then delete the category
    const deleteQuery = "DELETE FROM category_branch WHERE id = ?";
    
    connection.query(deleteQuery, [id], (err, results) => {
      if (err) {
        console.error("Error deleting category:", err);
        return res.status(500).json({
          success: false,
          message: "Error deleting category",
          error: err.message
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Category deleted successfully, associated branches updated",
        affectedRows: results.affectedRows
      });
    });
  });
};






module.exports = {
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
};