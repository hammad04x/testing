const connection = require("../../connection/connection");

const getBanner = (req, res) => {
  const sql = "SELECT * FROM banner WHERE id = 1";
  connection.query(sql, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Error fetching banner" });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Banner not found" });
    }
    
    // Map database fields to frontend expected fields
    const bannerData = {
      id: result[0].id,
      title: result[0].heading,
      description: result[0].subheading,
      background_image: result[0].img,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at
    };
    
    res.json(bannerData);
  });
};

const updateBanner = (req, res) => {
  try {
    // Map frontend fields to database fields
    const { title, description } = req.body;
    const imgPath = req.file ? req.file.filename : null;

    let sql, data;
    if (imgPath) {
      sql = "UPDATE banner SET heading=?, subheading=?, img=? WHERE id=1";
      data = [title, description, imgPath];
    } else {
      sql = "UPDATE banner SET heading=?, subheading=? WHERE id=1";
      data = [title, description];
    }

    connection.query(sql, data, (error) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Error updating banner" });
      }
      res.status(200).json({ message: "Banner updated successfully" });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getBanner, updateBanner };