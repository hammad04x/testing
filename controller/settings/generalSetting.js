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

// GET general settings (always ID = 1)
const getGeneralSettings = (req, res) => {
  connection.query("SELECT * FROM general_settings WHERE id = 1", (err, results) => {
    if (err) {
      console.error("Error fetching general settings:", err);
      return res.status(500).send("Error fetching settings");
    }
    res.json(results[0] || {});
  });
};

// UPDATE general settings (ID always 1)
const updateGeneralSettings = (req, res) => {
  const {
    site_name,
    website_status,
    facebook_link,
    instagram_link,
    pinterest_link,
    youtube_link,
    whatsapp_number,
    email,
    address,
  } = req.body;

  const logo = req.files?.logo?.[0]?.filename;
  const favicon = req.files?.favicon?.[0]?.filename;

  // First fetch old settings (to delete old logo/fav if replaced)
  connection.query("SELECT logo, favicon FROM general_settings WHERE id=1", (err, results) => {
    if (err) {
      console.error("Error fetching old settings:", err);
      return res.status(500).send("Error fetching old settings");
    }
    const oldSettings = results[0] || {};

    const fields = [
      "site_name = ?",
      "website_status = ?",
      "facebook_link = ?",
      "instagram_link = ?",
      "pinterest_link = ?",
      "youtube_link = ?",
      "whatsapp_number = ?",
      "email = ?",
      "address = ?",
    ];

    const params = [
      site_name,
      website_status,
      facebook_link,
      instagram_link,
      pinterest_link,
      youtube_link,
      whatsapp_number,
      email,
      address,
    ];

    if (logo) {
      fields.push("logo = ?");
      params.push(logo);
    }
    if (favicon) {
      fields.push("favicon = ?");
      params.push(favicon);
    }

    const sql = `UPDATE general_settings SET ${fields.join(", ")} WHERE id = 1`;
    connection.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error updating general settings:", err);
        return res.status(500).send("Error updating settings");
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Settings record not found");
      }

      // ✅ Delete old logo if replaced
      if (logo && oldSettings.logo) {
        const oldLogoPath = path.join(__dirname, "..", "..", "uploads", oldSettings.logo);
        safeUnlink(oldLogoPath);
      }

      // ✅ Delete old favicon if replaced
      if (favicon && oldSettings.favicon) {
        const oldFaviconPath = path.join(__dirname, "..", "..", "uploads", oldSettings.favicon);
        safeUnlink(oldFaviconPath);
      }

      return res.sendStatus(200);
    });
  });
};

module.exports = {
  getGeneralSettings,
  updateGeneralSettings,
};
