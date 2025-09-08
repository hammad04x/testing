
const express = require("express");
const router = express.Router();
const Offer = require("../../controller/offer/offer");
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

// GET Routes
router.get("/offers", Offer.getAllOffers);                    // Get all offers (for admin)
router.get("/offers/active", Offer.getActiveOffers);          // Get only active offers (for frontend)
router.get("/offers/category/:categoryId", Offer.getOffersByCategoryId); // Get offers by category
router.get("/offers/:id", Offer.getOfferById);                // Get single offer with categories

// POST Routes
router.post("/offers", Offer.addOffer);                       // Add new offer

// PUT Routes
router.put("/offers/:id", Offer.editOffer);                   // Edit existing offer
router.put("/offers/:id/status", Offer.updateOfferStatus);    // Update only offer status

// DELETE Routes
router.delete("/offers/:id", Offer.deleteOffer);              // Delete offer

module.exports = router;