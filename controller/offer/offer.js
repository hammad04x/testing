

const connection = require("../../connection/connection");

// ✅ Get all offers with their categories
const getAllOffers = (req, res) => {
  const sql = `
    SELECT 
      o.id,
      o.title,
      o.description,
      o.start_date,
      o.end_date,
      o.status,
      GROUP_CONCAT(CONCAT(c.title, ' (', oc.discount_value, ' ', oc.discount_type, ')')) AS category_discounts
    FROM offers o
    LEFT JOIN offer_categories oc ON o.id = oc.offer_id
    LEFT JOIN category c ON oc.category_id = c.id
    GROUP BY o.id, o.title, o.description, o.start_date, o.end_date, o.status
    ORDER BY o.created_at DESC
  `;
  
  connection.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching offers:", err);
      return res.status(500).json({ message: "Error fetching offers" });
    }
    res.json(result);
  });
};

// ✅ Get only active offers with their categories (for frontend display)
const getActiveOffers = (req, res) => {
  const sql = `
    SELECT 
      o.id,
      o.title,
      o.description,
      o.start_date,
      o.end_date,
      o.status,
      GROUP_CONCAT(CONCAT(c.title, ' (', oc.discount_value, ' ', oc.discount_type, ')')) AS category_discounts
    FROM offers o
    LEFT JOIN offer_categories oc ON o.id = oc.offer_id
    LEFT JOIN category c ON oc.category_id = c.id
    WHERE o.status = 'active'
    GROUP BY o.id, o.title, o.description, o.start_date, o.end_date, o.status
    ORDER BY o.created_at DESC
  `;
  
  connection.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching active offers:", err);
      return res.status(500).json({ message: "Error fetching active offers" });
    }
    res.json(result);
  });
};

// ✅ Get single offer by ID with category discounts INCLUDING IMAGES
const getOfferById = (req, res) => {
  const id = req.params.id;

  const offerSql = "SELECT * FROM offers WHERE id = ?";
  connection.query(offerSql, [id], (err, offerResult) => {
    if (err) return res.status(500).json({ message: "Error fetching offer" });
    if (!offerResult.length) return res.status(404).json({ message: "Offer not found" });

    const categorySql = `
      SELECT 
        c.id, 
        c.title, 
        c.image,           -- NOW INCLUDING IMAGE
        c.description,     -- ALSO INCLUDING DESCRIPTION IF NEEDED
        oc.discount_type, 
        oc.discount_value
      FROM category c
      JOIN offer_categories oc ON c.id = oc.category_id
      WHERE oc.offer_id = ?
    `;
    connection.query(categorySql, [id], (catErr, categoryResult) => {
      if (catErr) return res.status(500).json({ message: "Error fetching offer categories" });

      res.json({
        ...offerResult[0],
        categories: categoryResult
      });
    });
  });
};

// ✅ Add a new offer
const addOffer = (req, res) => {
  const { title, description, start_date, end_date, status = 'active', categories } = req.body;

  if (!title || !start_date || !end_date || !categories || !categories.length) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Database transaction error" });

    const offerSql = `
      INSERT INTO offers (title, description, start_date, end_date, status) 
      VALUES (?, ?, ?, ?, ?)
    `;
    connection.query(offerSql, [title, description, start_date, end_date, status], (offerErr, offerResult) => {
      if (offerErr) {
        return connection.rollback(() => res.status(500).json({ message: "Error adding offer" }));
      }

      const offerId = offerResult.insertId;
      const categoryValues = categories.map(cat => [offerId, cat.category_id, cat.discount_type, cat.discount_value]);

      const categorySql = `
        INSERT INTO offer_categories (offer_id, category_id, discount_type, discount_value)
        VALUES ?
      `;
      connection.query(categorySql, [categoryValues], (catErr) => {
        if (catErr) {
          return connection.rollback(() => res.status(500).json({ message: "Error adding offer categories" }));
        }

        connection.commit(commitErr => {
          if (commitErr) {
            return connection.rollback(() => res.status(500).json({ message: "Transaction commit error" }));
          }
          res.status(201).json({ message: "Offer added successfully", id: offerId });
        });
      });
    });
  });
};

// ✅ Edit existing offer
const editOffer = (req, res) => {
  const id = req.params.id;
  const { title, description, start_date, end_date, status = 'active', categories } = req.body;

  if (!title || !start_date || !end_date || !categories?.length) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  connection.getConnection((err, conn) => {
    if (err) return res.status(500).json({ message: "Database connection error" });

    conn.beginTransaction(txErr => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: "Transaction error" });
      }

      const offerSql = `
        UPDATE offers SET title=?, description=?, start_date=?, end_date=?, status=? WHERE id=?
      `;
      conn.query(offerSql, [title, description, start_date, end_date, status, id], (offerErr) => {
        if (offerErr) {
          return conn.rollback(() => {
            conn.release();
            res.status(500).json({ message: "Error updating offer" });
          });
        }

        conn.query("DELETE FROM offer_categories WHERE offer_id=?", [id], (deleteErr) => {
          if (deleteErr) {
            return conn.rollback(() => {
              conn.release();
              res.status(500).json({ message: "Error clearing old categories" });
            });
          }

          const categoryValues = categories.map(cat => [id, cat.category_id, cat.discount_type, cat.discount_value]);
          const categorySql = `
            INSERT INTO offer_categories (offer_id, category_id, discount_type, discount_value)
            VALUES ?
          `;

          conn.query(categorySql, [categoryValues], (catErr) => {
            if (catErr) {
              return conn.rollback(() => {
                conn.release();
                res.status(500).json({ message: "Error adding new categories" });
              });
            }

            conn.commit(commitErr => {
              if (commitErr) {
                return conn.rollback(() => {
                  conn.release();
                  res.status(500).json({ message: "Transaction commit error" });
                });
              }
              conn.release();
              res.json({ message: "Offer updated successfully" });
            });
          });
        });
      });
    });
  });
};


// ✅ Update offer status only
const updateOfferStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Must be 'active' or 'inactive'" });
  }

  const sql = "UPDATE offers SET status = ? WHERE id = ?";
  connection.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating offer status:", err);
      return res.status(500).json({ message: "Error updating offer status" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    res.json({ message: `Offer ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
  });
};

// ✅ Delete offer
const deleteOffer = (req, res) => {
  const id = req.params.id;

  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Database transaction error" });

    connection.query("DELETE FROM offer_categories WHERE offer_id=?", [id], (catErr) => {
      if (catErr) {
        return connection.rollback(() => res.status(500).json({ message: "Error deleting categories" }));
      }

      connection.query("DELETE FROM offers WHERE id=?", [id], (offerErr) => {
        if (offerErr) {
          return connection.rollback(() => res.status(500).json({ message: "Error deleting offer" }));
        }

        connection.commit(commitErr => {
          if (commitErr) {
            return connection.rollback(() => res.status(500).json({ message: "Transaction commit error" }));
          }
          res.json({ message: "Offer deleted successfully" });
        });
      });
    });
  });
};

// ✅ Get offers by category ID (only active ones for frontend)
const getOffersByCategoryId = (req, res) => {
  const categoryId = req.params.categoryId;

  const sql = `
    SELECT 
      o.id, 
      o.title, 
      o.description,
      o.status,
      oc.discount_type,
      oc.discount_value
    FROM offers o
    JOIN offer_categories oc ON o.id = oc.offer_id
    WHERE oc.category_id = ? AND o.status = 'active'
    AND o.start_date <= CURDATE() AND o.end_date >= CURDATE()
  `;
  connection.query(sql, [categoryId], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching offers" });
    res.json(result);
  });
};

module.exports = {
  getAllOffers,
  getActiveOffers,
  getOfferById,
  addOffer,
  editOffer,
  updateOfferStatus,
  deleteOffer,
  getOffersByCategoryId
};