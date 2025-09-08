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

const getAllGallery = (req, res) => {
  const sql = "SELECT * FROM gallery ORDER BY id DESC";
  connection.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send("Error fetching gallery items");
    }
    res.json(result);
  });
};

const getAllGalleryClient = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 11;
  const offset = (page - 1) * limit;

  const sql = "SELECT * FROM gallery ORDER BY id DESC LIMIT ? OFFSET ?";
  connection.query(sql, [limit, offset], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching gallery items" });
    }

    const countSql = "SELECT COUNT(*) as total FROM gallery";
    connection.query(countSql, (countErr, countResult) => {
      if (countErr) {
        return res.status(500).json({ error: "Error fetching total count" });
      }
      const totalItems = countResult[0].total;
      res.json({
        galleryItems: result,
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      });
    });
  });
};

const getGalleryById = (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM gallery WHERE id = ?";
  connection.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send("Error fetching gallery item");
    }
    res.json(result[0]);
  });
};

const addGallery = (req, res) => {
  try {
    const { title } = req.body;
    const imgPath = req.file ? req.file.filename : null;

    if (!title || !imgPath) {
      return res.status(400).send("Missing title or image");
    }

    const sql = "INSERT INTO gallery (title, img) VALUES (?, ?)";
    connection.query(sql, [title, imgPath], (error) => {
      if (error) {
        return res.status(500).send("Error adding gallery item");
      }
      res.sendStatus(200);
    });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

// Edit gallery (delete old image if new uploaded)
const editGallery = (req, res) => {
  try {
    const id = req.params.id;
    const { title } = req.body;
    const imgPath = req.file ? req.file.filename : null;

    if (imgPath) {
      // first get old image
      const selectSql = "SELECT img FROM gallery WHERE id=?";
      connection.query(selectSql, [id], (err, result) => {
        if (err) return res.status(500).send("Error fetching gallery item");
        const oldImage = result[0]?.img;

        const sql = "UPDATE gallery SET title=?, img=? WHERE id=?";
        const data = [title, imgPath, id];
        connection.query(sql, data, (error) => {
          if (error) {
            return res.status(500).send("Error updating gallery item");
          }

          if (oldImage) {
            const filePath = path.join(__dirname, "..", "..", "uploads", oldImage);
            safeUnlink(filePath);
          }

          res.sendStatus(200);
        });
      });
    } else {
      const sql = "UPDATE gallery SET title=? WHERE id=?";
      connection.query(sql, [title, id], (error) => {
        if (error) {
          return res.status(500).send("Error updating gallery item");
        }
        res.sendStatus(200);
      });
    }
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

// Delete gallery (also remove image)
const deleteGallery = (req, res) => {
  try {
    const id = req.params.id;

    const selectSql = "SELECT img FROM gallery WHERE id=?";
    connection.query(selectSql, [id], (err, result) => {
      if (err) return res.status(500).send("Error fetching gallery item");
      if (result.length === 0) return res.status(404).send("Gallery item not found");

      const imageName = result[0].img;

      const deleteSql = "DELETE FROM gallery WHERE id = ?";
      connection.query(deleteSql, [id], (error) => {
        if (error) {
          return res.status(500).send("Error deleting gallery item");
        }

        if (imageName) {
          const filePath = path.join(__dirname, "..", "..", "uploads", imageName);
          safeUnlink(filePath);
        }

        res.sendStatus(200);
      });
    });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  getAllGallery,
  getAllGalleryClient,
  getGalleryById,
  addGallery,
  editGallery,
  deleteGallery,
};
