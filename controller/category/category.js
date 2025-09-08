const fs = require("fs");
const path = require("path");
const connection = require("../../connection/connection");

// helper: safe delete (app crash se bachaata hai)
function safeUnlink(filePath) {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Image delete error:", err);
    }
  });
}




// Get all categories
const getAllCategories = (req, res) => {
  const sql = "SELECT * FROM category";
  connection.query(sql, (err, result) => {
    if (err) return res.status(500).send("Error fetching categories");
    res.json(result);
  });
};

// Get category by ID
const getCategoryById = (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM category WHERE id = ?";
  connection.query(sql, [id], (err, result) => {
    if (err) return res.status(500).send("Error fetching category");
    if (result.length === 0) return res.status(404).send("Category not found");
    res.json(result[0]);
  });
};

// Add new category
const addCategory = (req, res) => {
  try {
    const { title, description, status } = req.body;
    const imgPath = req.file ? req.file.filename : null;

    if (!title || !imgPath || typeof status === "undefined") {
      return res.status(400).send("Missing title or image");
    }

    const sql =
      "INSERT INTO category (title, description, status, image) VALUES (?, ?, ?, ?)";
    connection.query(
      sql,
      [title, description || "", status, imgPath],
      (error) => {
        if (error) {
          console.error("DB Error:", error);
          return res.status(500).send("Error adding category");
        }
        res.sendStatus(200);
      }
    );
  } catch (error) {
    console.error("Catch Error:", error);
    res.status(500).send("Internal server error");
  }
};

// Edit existing category (replace image -> delete old file)
const editCategory = (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, status } = req.body;
    const newImage = req.file ? req.file.filename : null;

    if (!title || typeof status === "undefined") {
      return res
        .status(400)
        .send("Category title and status are required");
    }

    // agar nayi image aayi hai, pehle purani image ka naam lao
    if (newImage) {
      const q1 = "SELECT image FROM category WHERE id = ?";
      connection.query(q1, [id], (selErr, rows) => {
        if (selErr) {
          console.error(selErr);
          return res.status(500).send("Error fetching old image");
        }
        if (rows.length === 0) {
          return res.status(404).send("Category not found");
        }

        const oldImage = rows[0]?.image;

        const q2 =
          "UPDATE category SET title=?, description=?, image=?, status=? WHERE id=?";
        const data = [title, description || "", newImage, status, id];

        connection.query(q2, data, (updErr) => {
          if (updErr) {
            console.error(updErr);
            return res.status(500).send("Error updating category");
          }

          // DB update ho gaya -> ab purani file delete
          if (oldImage && oldImage !== newImage) {
            const oldPath = path.join(
              __dirname,
              "..",
              "..",
              "uploads",
              oldImage
            );
            safeUnlink(oldPath);
          }

          res.sendStatus(200);
        });
      });
    } else {
      // koi nayi image nahi -> normal update
      const q =
        "UPDATE category SET title=?, description=?, status=? WHERE id=?";
      const data = [title, description || "", status, id];
      connection.query(q, data, (err) => {
        if (err) return res.status(500).send("Error updating category");
        res.sendStatus(200);
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

// PATCH /category/:id/status
const updateCategoryStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const sql = "UPDATE category SET status=? WHERE id=?";
  connection.query(sql, [status, id], (error) => {
    if (error) return res.status(500).send("Error updating category status");
    res.sendStatus(200);
  });
};

// Delete category by ID (and its image)
const deleteCategory = (req, res) => {
  try {
    const id = req.params.id;

    // 1) check items exist in category
    const qItems = "SELECT COUNT(*) AS itemCount FROM items WHERE category_id = ?";
    connection.query(qItems, [id], (itemErr, itemRows) => {
      if (itemErr) {
        console.error(itemErr);
        return res.status(500).send("Error checking category items");
      }

      const itemCount = itemRows[0]?.itemCount || 0;

      if (itemCount > 0) {
        // agar items exist karte hai to category delete nahi karni
        return res.status(400).send("Delete all items before deleting category");
      }

      // 2) get category image
      const q1 = "SELECT image FROM category WHERE id = ?";
      connection.query(q1, [id], (selErr, rows) => {
        if (selErr) {
          console.error(selErr);
          return res.status(500).send("Error fetching category image");
        }
        if (rows.length === 0) return res.status(404).send("Category not found");

        const imageName = rows[0]?.image;

        // 3) delete category
        const q2 = "DELETE FROM category WHERE id = ?";
        connection.query(q2, [id], (delErr) => {
          if (delErr) {
            console.error(delErr);
            return res.status(500).send("Error deleting category");
          }

          // 4) delete file (best-effort)
          if (imageName) {
            const imgPath = path.join(
              __dirname,
              "..",
              "..",
              "uploads",
              imageName
            );
            safeUnlink(imgPath);
          }

          res.sendStatus(200);
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};


module.exports = {
  getAllCategories,
  getCategoryById,
  addCategory,
  editCategory,
  deleteCategory,
  updateCategoryStatus,
};
