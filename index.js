const connection = require("./connection/connection");
const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const dotenv = require("dotenv");

// Load Routes
const GalleryRoute = require("./routes/gallary/gallary");
const CategoryRoute = require("./routes/category/category");
const ItemRoute = require("./routes/category/item");
const GeneralSettingsRoute = require("./routes/settings/generalSetting");
const offerRoutes = require('./routes/offer/offer');
const bannerRoutes = require('./routes/banner/banner');
const authRoutes = require('./routes/login/login');
const BranchRoute = require("./routes/settings/branchSetting");
const PopularProducts = require("./routes/popularProducts/popularProducts");
const contact = require("./routes/contact/contact");
const manage_admin=require('./routes/manage-admin/admin')
const { runTokenCleanup } = require('./utils/tokenCleanup');


dotenv.config();
const port = process.env.PORT || 4500;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyparser.json());
app.use(express.urlencoded({ extended: true }));

// Static upload folder
app.use("/uploads", express.static("uploads"));
// Routes
app.use("/", GeneralSettingsRoute);
app.use("/", CategoryRoute);
app.use("/", ItemRoute);
app.use('/', offerRoutes);
app.use("/", GalleryRoute);
app.use("/", bannerRoutes);
app.use("/api", BranchRoute); 
app.use("/api", contact); 
app.use('/admin', authRoutes);
app.use('/api/popular-products', PopularProducts);
app.use('/', manage_admin);



// Root Route
app.get("/", (req, res) => {
  res.send("🥳 Server is up and running!");
});

setInterval(runTokenCleanup, 5 * 60 * 1000);
runTokenCleanup(); // Run immediately on startup

// MySQL Connection + Server Start
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
