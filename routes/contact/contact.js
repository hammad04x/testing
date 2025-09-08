// Updated routes/contact.js
const express = require('express');
const router = express.Router();
const {
  submitContact,
  getAllContacts,
  viewContact,
  deleteContact,
  getRateLimitStatus
} = require('../../controller/contact/contact');
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.post('/contact/submit', submitContact);        // POST /api/contact/submit
router.get('/contacts', getAllContacts);             // GET /api/contacts - Fetch all contacts
router.get('/contact/:id', viewContact);             // GET /api/contact/:id - View and mark as seen
router.delete('/contact/:id', deleteContact);        // DELETE /api/contact/:id - Delete contact
router.get('/contact/rate-limit/:email', getRateLimitStatus); // GET /api/contact/rate-limit/:email - Check rate limit status

module.exports = router;