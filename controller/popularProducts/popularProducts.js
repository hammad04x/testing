const connection = require("../../connection/connection");

const getPopularProducts = (req, res) => {
  connection.query(`
    SELECT pp.*, i.title, i.image
    FROM popular_products pp 
    JOIN items i ON pp.item_id = i.id 
    ORDER BY pp.priority ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};



const getActivePopularProducts = (req, res) => {
  connection.query(`
    SELECT pp.*, i.title, i.image
    FROM popular_products pp 
    JOIN items i ON pp.item_id = i.id 
    WHERE i.status = 1
    ORDER BY pp.priority ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

const addPopularProduct = (req, res) => {
  const { item_id, priority, status } = req.body;
  connection.query(
    'INSERT INTO popular_products (item_id, priority, status) VALUES (?, ?, ?)',
    [item_id, priority || 0, status || 1],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: result.insertId, message: 'Popular product added' });
    }
  );
};

const updatePopularProduct = (req, res) => {
  const { id } = req.params;
  const { priority, status } = req.body;
  connection.query(
    'UPDATE popular_products SET priority = ?, status = ? WHERE id = ?',
    [priority, status, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Popular product updated' });
    }
  );
};

const deletePopularProduct = (req, res) => {
  const { id } = req.params;
  connection.query(
    'DELETE FROM popular_products WHERE id = ?',
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Popular product deleted' });
    }
  );
};

module.exports = { getPopularProducts,getActivePopularProducts, addPopularProduct, updatePopularProduct, deletePopularProduct };