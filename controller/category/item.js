const fs = require("fs");
const path = require("path");
const connection = require("../../connection/connection");

// helper: safe delete
function safeUnlink(filePath) {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Image delete error:", err);
    }
  });
}
// Get all items (admin/basic) - only active status
const getAllItems = (req, res) => {
  const { category_id } = req.query;
  let sql = "SELECT * FROM items";
  const values = [];

  if (category_id) {
    sql += " WHERE category_id = ? AND status = 1";
    values.push(category_id);
  } else {
    sql += " WHERE status = 1";
  }

  sql += " ORDER BY id DESC";

  connection.query(sql, values, (err, result) => {
    if (err) return res.status(500).send("Error fetching items");
    res.json(result);
  });
};


// Get items by category (admin/basic) - only active status
const getItemsByCategory = (req, res) => {
  const categoryId = req.params.categoryId;
  const sql = "SELECT * FROM items WHERE category_id = ? AND status = 1 ORDER BY id DESC";
  connection.query(sql, [categoryId], (err, result) => {
    if (err) return res.status(500).send("Error fetching items");
    res.json(result);
  });
};


// Add item
const addItem = (req, res) => {
  const { title, status, category_id } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!title || !category_id || !image)
    return res.status(400).send("Required fields missing");

  const sql = `
    INSERT INTO items (category_id, title, image, status)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(sql, [category_id, title || "", image, status || 1], (err) => {
    if (err) return res.status(500).send("Error adding item");
    res.sendStatus(200);
  });
};


// Edit item (delete old image if new uploaded)
const editItem = (req, res) => {
  const id = req.params.id;
  const { title, status, category_id } = req.body;
  const image = req.file ? req.file.filename : null;

  if (image) {
    // first fetch old image
    const selectSql = "SELECT image FROM items WHERE id=?";
    connection.query(selectSql, [id], (err, result) => {
      if (err) return res.status(500).send("Error fetching item image");

      const oldImage = result[0]?.image;
      const sql = `UPDATE items SET category_id=?, title=?, image=?, status=? WHERE id=?`;
      const data = [category_id, title, image, status, id];

      connection.query(sql, data, (err2) => {
        if (err2) return res.status(500).send("Error updating item");

        // delete old image if exists
        if (oldImage) {
          const filePath = path.join(__dirname, "..", "..", "uploads", oldImage);
          safeUnlink(filePath);
        }

        res.sendStatus(200);
      });
    });
  } else {
    const sql = `UPDATE items SET category_id=?, title=?, status=? WHERE id=?`;
    const data = [category_id, title, status, id];

    connection.query(sql, data, (err) => {
      if (err) return res.status(500).send("Error updating item");
      res.sendStatus(200);
    });
  }
};



// Get item by ID - only active status
const getItemById = (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM items WHERE id = ? AND status = 1";
  connection.query(sql, [id], (err, result) => {
    if (err) return res.status(500).send("Error fetching item");
    if (result.length === 0) return res.status(404).send("Item not found");
    res.json(result[0]);
  });
};


// Delete item with image
const deleteItem = (req, res) => {
  const id = req.params.id;

  // first get image
  const selectSql = "SELECT image FROM items WHERE id=?";
  connection.query(selectSql, [id], (err, result) => {
    if (err) return res.status(500).send("Error fetching item image");
    if (result.length === 0) return res.status(404).send("Item not found");

    const imageName = result[0].image;

    // delete record
    const deleteSql = "DELETE FROM items WHERE id=?";
    connection.query(deleteSql, [id], (err2) => {
      if (err2) return res.status(500).send("Error deleting item");

      if (imageName) {
        const filePath = path.join(__dirname, "..", "..", "uploads", imageName);
        safeUnlink(filePath);
      }

      res.sendStatus(200);
    });
  });
};

// Client: get all items with pagination & search - only active status
const getAllItemsClient = (req, res) => {
  try {
    const { category_id, page = 1, limit = 15, search = "" } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const offset = (pageNum - 1) * limitNum;

    if (!search || search.trim() === "") {
      // No search -> normal pagination
      let sql = `SELECT items.*, category.title as category_title
                 FROM items
                 LEFT JOIN category ON items.category_id = category.id`;
      let countSql = `SELECT COUNT(*) as total 
                      FROM items
                      LEFT JOIN category ON items.category_id = category.id`;
      let values = [];

      if (category_id) {
        sql += " WHERE items.category_id = ? AND items.status = 1";
        countSql += " WHERE items.category_id = ? AND items.status = 1";
        values.push(category_id);
      } else {
        sql += " WHERE items.status = 1";
        countSql += " WHERE items.status = 1";
      }

      sql += " ORDER BY items.id DESC LIMIT ?, ?";
      const dataValues = [...values, offset, limitNum];

      connection.query(countSql, values, (err, countResult) => {
        if (err) {
          console.error("Count query error:", err);
          return res.status(500).json({ error: "Error fetching count", items: [], total: 0 });
        }

        const total = countResult[0]?.total || 0;

        connection.query(sql, dataValues, (err2, items) => {
          if (err2) {
            console.error("Data query error:", err2);
            return res.status(500).json({ error: "Error fetching items", items: [], total: 0 });
          }

          res.json({ items: items || [], total });
        });
      });
    } else {
      // Search in both item name & category name
      const searchTerm = `%${search.trim()}%`;
      let sql = `SELECT items.*, category.title as category_title
                 FROM items
                 LEFT JOIN category ON items.category_id = category.id
                 WHERE (items.title LIKE ? OR category.title LIKE ?) AND items.status = 1`;
      let countSql = `SELECT COUNT(*) as total
                      FROM items
                      LEFT JOIN category ON items.category_id = category.id
                      WHERE (items.title LIKE ? OR category.title LIKE ?) AND items.status = 1`;

      let values = [searchTerm, searchTerm];

      if (category_id) {
        sql += " AND items.category_id = ?";
        countSql += " AND items.category_id = ?";
        values.push(category_id);
      }

      sql += " ORDER BY items.id DESC LIMIT ?, ?";

      const dataValues = [...values, offset, limitNum];
      connection.query(countSql, values, (err, countResult) => {
        if (err) {
          console.error("Search count query error:", err);
          return res.status(500).json({ error: "Error fetching count", items: [], total: 0 });
        }

        const total = countResult[0]?.total || 0;

        connection.query(sql, dataValues, (err2, items) => {
          if (err2) {
            console.error("Search data query error:", err2);
            return res.status(500).json({ error: "Error fetching items", items: [], total: 0 });
          }

          res.json({ items: items || [], total });
        });
      });
    }
  } catch (error) {
    console.error("getAllItemsClient catch error:", error);
    res.status(500).json({ error: "Server error", items: [], total: 0 });
  }
};


// Client: by category with pagination & optional search - only active status
const getItemsByCategoryClient = (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { page = 1, limit = 15, search = "" } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const offset = (pageNum - 1) * limitNum;

    if (!search || search.trim() === "") {
      // No search - simple category filter
      let sql = "SELECT * FROM items WHERE category_id = ? AND status = 1";
      let countSql = "SELECT COUNT(*) as total FROM items WHERE category_id = ? AND status = 1";
      let values = [categoryId];

      sql += " ORDER BY id DESC LIMIT ?, ?";

      connection.query(countSql, values, (err, countResult) => {
        if (err) {
          console.error("Category count query error:", err);
          return res.status(500).json({ error: "Error fetching count", items: [], total: 0 });
        }

        const total = countResult[0]?.total || 0;

        const dataValues = [...values, offset, limitNum];
        connection.query(sql, dataValues, (err2, items) => {
          if (err2) {
            console.error("Category data query error:", err2);
            return res.status(500).json({ error: "Error fetching items", items: [], total: 0 });
          }

          res.json({
            items: items || [],
            total: total
          });
        });
      });
    } else {
      // Search within category - search both item title and category title
      const searchTerm = `%${search.trim()}%`;

      let sql = `SELECT items.*, categories.title as category_title 
                 FROM items 
                 LEFT JOIN categories ON items.category_id = categories.id 
                 WHERE items.category_id = ? AND items.status = 1 AND (items.title LIKE ? OR categories.title LIKE ?)`;

      let countSql = `SELECT COUNT(*) as total 
                      FROM items 
                      LEFT JOIN categories ON items.category_id = categories.id 
                      WHERE items.category_id = ? AND items.status = 1 AND (items.title LIKE ? OR categories.title LIKE ?)`;

      let values = [categoryId, searchTerm, searchTerm];

      sql += " ORDER BY items.id DESC LIMIT ?, ?";

      const dataValues = [...values, offset, limitNum];

      connection.query(countSql, values, (err, countResult) => {
        if (err) {
          console.error("Category search count query error:", err);
          return res.status(500).json({ error: "Error fetching count", items: [], total: 0 });
        }

        const total = countResult[0]?.total || 0;

        connection.query(sql, dataValues, (err2, items) => {
          if (err2) {
            console.error("Category search data query error:", err2);
            return res.status(500).json({ error: "Error fetching items", items: [], total: 0 });
          }

          res.json({
            items: items || [],
            total: total
          });
        });
      });
    }
  } catch (error) {
    console.error("getItemsByCategoryClient catch error:", error);
    res.status(500).json({ error: "Server error", items: [], total: 0 });
  }
};


// Update item status (active/inactive)
const updateItemStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (typeof status === "undefined") {
    return res.status(400).send("Status is required");
  }

  const sql = "UPDATE items SET status = ? WHERE id = ?";

  connection.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).send("Error updating item status");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Item not found");
    }

    res.sendStatus(200);
  });
};


module.exports = {
  getAllItems,
  getItemsByCategory,
  getAllItemsClient,
  getItemsByCategoryClient,
  getItemById,
  addItem,
  editItem,
  deleteItem,
  updateItemStatus,
};
