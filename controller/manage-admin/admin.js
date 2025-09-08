
const connection = require("../../connection/connection");
const bcrypt = require("bcrypt");




const getadmin = (req, res) => {
  const sqlQuery = "SELECT * FROM admin";
  connection.query(sqlQuery, (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Database query failed" });
    }
    return res.json(data);
  });
};

const getadminbyid = (req, res) => {
  const { id } = req.params;
  const sqlQuery = "SELECT * FROM admin WHERE id = ?";
  connection.query(sqlQuery, [id], (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Database query failed" });
    }
    if (data.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    return res.json(data[0]);
  });
};


const addadmin = async (req, res) => {
  try {
    const { name, email, number, password, status } = req.body;

    // ✅ 1. Basic validations
    if (!name || !email || !number || !password) {
      return res.status(400).json({ error: "All fields (name, email, number, password) are required" });
    }

    // ✅ 2. Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // ✅ 3. Number format check (10 digit mobile)
    const numberRegex = /^[0-9]{10}$/;
    if (!numberRegex.test(number)) {
      return res.status(400).json({ error: "Invalid number format. Must be 10 digits" });
    }

    // ✅ 4. Password validation (at least 6 chars)
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // ✅ 5. Check duplicate name/email/number
    const checkQuery = "SELECT name, email, number FROM admin WHERE email = ? OR number = ? OR name = ?";
    connection.query(checkQuery, [email, number, name], async (err, results) => {
      if (err) {
        console.error("SQL Error:", err); // debug ke liye
        return res.status(500).json({ error: "Database query failed. Check your SQL syntax." });
      }

      const conflicts = [];
      results.forEach((item) => {
        if (item.email === email && !conflicts.includes("Email")) conflicts.push("Email");
        if (item.number === number && !conflicts.includes("Number")) conflicts.push("Number");
        if (item.name === name && !conflicts.includes("Name")) conflicts.push("Name");
      });

      if (conflicts.length > 0) {
        return res.status(400).json({ error: `${conflicts.join(", ")} already exists` });
      }

      // ✅ 6. Insert new admin
      const hashedPassword = await bcrypt.hash(password, 10);
      const statusValue = status?.toLowerCase() === "blocked" ? "blocked" : "active";

      const insertQuery = "INSERT INTO admin (name, email, number, password, status) VALUES (?, ?, ?, ?, ?)";
      const data = [name, email, number, hashedPassword, statusValue];

      connection.query(insertQuery, data, (err, result) => {
        if (err) {
          console.error("Insert Error:", err); // debug ke liye
          return res.status(500).json({ error: "Failed to insert admin. Please check your SQL query." });
        }
        return res.status(200).json({ message: "Admin added successfully", data: result });
      });
    });
  } catch (error) {
    console.error("Catch Error:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
};



const adminstatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const checkQuery = "SELECT * FROM admin WHERE id = ?";
    connection.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error while checking admin" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (!["active", "blocked"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Allowed: 'active' or 'blocked'" });
      }

      const updateQuery = "UPDATE admin SET status=? WHERE id=?";
      connection.query(updateQuery, [status, id], (err, updateResults) => {
        if (err) {
          console.error("Status Update Error:", err);
          return res.status(500).json({ error: "Error updating admin status" });
        }

        res.status(200).json({
          message: "Admin status updated successfully",
          admin: { ...results[0], status },
        });
      });
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// Update Admin

// Update Admin (short & simple)

const updateadmin = async (req, res) => {
  const id = req.params.id;
  let data = { ...req.body };

  try {
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      data.password = hashedPassword;
    } else {
      delete data.password; // blank bheja toh ignore kar
    }

    // jo bheja wahi save kar
    const sql = "UPDATE admin SET ? WHERE id = ?";
    connection.query(sql, [data, id], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }

      res.status(200).json({ message: "Admin updated successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};





// Delete Admin
const deleteAdmin = (req, res) => {
  const { id } = req.params;

  // Pehle related tokens delete karo
  const deleteTokens = "DELETE FROM active_tokens WHERE admin_id = ?";
  connection.query(deleteTokens, [id], (err) => {
    if (err) {
      console.error("Error deleting tokens:", err);
      return res.status(500).json({ error: "Failed to delete related tokens" });
    }

    // Fir admin delete karo
    const deleteAdminQuery = "DELETE FROM admin WHERE id = ?";
    connection.query(deleteAdminQuery, [id], (err) => {
      if (err) {
        console.error("Error deleting admin:", err);
        return res.status(500).json({ error: "Failed to delete admin" });
      }

      res.status(200).json({ message: "Admin deleted successfully" });
    });
  });
};



module.exports = {
  getadmin,
  getadminbyid,
  addadmin,
  updateadmin,
  deleteAdmin,
  adminstatus
};


