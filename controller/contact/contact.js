// Updated controller/contact/contact.js with 10 hours rate limiting
const connection = require("../../connection/connection");

// Rate limiting configuration
const RATE_LIMIT = {
    MAX_SUBMISSIONS: 3, // Maximum submissions per 10 hours
    WINDOW_HOURS: 10,   // Time window in hours (changed to 10)
};

// Helper function to get client IP address
const getClientIP = (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
};

// Helper function to check rate limit by IP
const checkRateLimit = (ip_address, callback) => {
    // 10 hours ago calculation
    const windowAgo = new Date(Date.now() - (RATE_LIMIT.WINDOW_HOURS * 60 * 60 * 1000));
    
    const query = `
        SELECT COUNT(*) as submission_count 
        FROM contacts 
        WHERE ip_address = ? AND created_at > ?
    `;
    
    connection.query(query, [ip_address, windowAgo], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        
        const submissionCount = results[0].submission_count;
        const remainingSubmissions = RATE_LIMIT.MAX_SUBMISSIONS - submissionCount;
        
        callback(null, {
            submissionCount,
            remainingSubmissions,
            isLimitExceeded: submissionCount >= RATE_LIMIT.MAX_SUBMISSIONS
        });
    });
};

const submitContact = (req, res) => {
    const { name, email, phone, subject, message, branch_id } = req.body;
    const ip_address = getClientIP(req);


    // Validate required fields
    if (!name || !email || !subject || !message || !branch_id) {
        return res.status(400).json({
            success: false,
            message: "All required fields must be provided"
        });
    }

    // Additional validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format"
        });
    }

    // Check rate limit by IP address
    checkRateLimit(ip_address, (rateLimitErr, rateLimitData) => {
        if (rateLimitErr) {
            console.error("Error checking rate limit:", rateLimitErr);
            return res.status(500).json({
                success: false,
                message: "Error processing request",
                error: rateLimitErr.message
            });
        }


        if (rateLimitData.isLimitExceeded) {
            return res.status(429).json({
                success: false,
                message: `You have submitted the contact form too many times. Please try again after ${RATE_LIMIT.WINDOW_HOURS} hours.`,
                rateLimitInfo: {
                    maxSubmissions: RATE_LIMIT.MAX_SUBMISSIONS,
                    windowHours: RATE_LIMIT.WINDOW_HOURS,
                    submissionCount: rateLimitData.submissionCount,
                    remainingSubmissions: rateLimitData.remainingSubmissions,
                    isLimitExceeded: true
                }
            });
        }

        // Check if branch_id exists
        const checkBranchQuery = 'SELECT id FROM branches WHERE id = ? AND status = "active"';
        connection.query(checkBranchQuery, [branch_id], (err, results) => {
            if (err) {
                console.error("Error checking branch:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error checking branch",
                    error: err.message
                });
            }
            if (results.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or inactive branch ID"
                });
            }

            // Insert the contact form data
            const query = `
                INSERT INTO contacts 
                (name, email, phone, subject, message, branch_id, ip_address, seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `;
            const values = [name, email, phone, subject, message, branch_id, ip_address];

            connection.query(query, values, (err, results) => {
                if (err) {
                    console.error("Error submitting contact:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error submitting contact form",
                        error: err.message
                    });
                }
                
                
                res.status(201).json({
                    success: true,
                    message: "Contact form submitted successfully",
                    contactId: results.insertId,
                    rateLimitInfo: {
                        submissionCount: rateLimitData.submissionCount + 1,
                        remainingSubmissions: rateLimitData.remainingSubmissions - 1,
                        maxSubmissions: RATE_LIMIT.MAX_SUBMISSIONS,
                        windowHours: RATE_LIMIT.WINDOW_HOURS,
                        isLimitExceeded: (rateLimitData.submissionCount + 1) >= RATE_LIMIT.MAX_SUBMISSIONS
                    }
                });
            });
        });
    });
};

// Get rate limit status for current IP (optional endpoint)
const getRateLimitStatus = (req, res) => {
    const ip_address = getClientIP(req);

    checkRateLimit(ip_address, (err, rateLimitData) => {
        if (err) {
            console.error("Error checking rate limit status:", err);
            return res.status(500).json({
                success: false,
                message: "Error checking rate limit status",
                error: err.message
            });
        }

        res.status(200).json({
            success: true,
            rateLimitInfo: {
                submissionCount: rateLimitData.submissionCount,
                remainingSubmissions: rateLimitData.remainingSubmissions,
                isLimitExceeded: rateLimitData.isLimitExceeded,
                maxSubmissions: RATE_LIMIT.MAX_SUBMISSIONS,
                windowHours: RATE_LIMIT.WINDOW_HOURS
            }
        });
    });
};

const getAllContacts = (req, res) => {
    const query = `
        SELECT id, name, email, phone, subject, message, branch_id, ip_address, created_at, seen
        FROM contacts
        ORDER BY created_at DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching contacts:", err);
            return res.status(500).json({
                success: false,
                message: "Error fetching contacts",
                error: err.message
            });
        }
        res.status(200).json({
            success: true,
            contacts: results
        });
    });
};

const viewContact = (req, res) => {
    const { id } = req.params;

    // First, mark as seen
    const updateQuery = 'UPDATE contacts SET seen = 1 WHERE id = ?';
    connection.query(updateQuery, [id], (updateErr) => {
        if (updateErr) {
            console.error("Error marking contact as seen:", updateErr);
            return res.status(500).json({
                success: false,
                message: "Error marking contact as seen",
                error: updateErr.message
            });
        }

        // Then, fetch the contact details
        const fetchQuery = `
            SELECT id, name, email, phone, subject, message, branch_id, ip_address, created_at, seen
            FROM contacts
            WHERE id = ?
        `;
        connection.query(fetchQuery, [id], (fetchErr, results) => {
            if (fetchErr) {
                console.error("Error fetching contact:", fetchErr);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching contact",
                    error: fetchErr.message
                });
            }
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Contact not found"
                });
            }
            res.status(200).json({
                success: true,
                contact: results[0]
            });
        });
    });
};

const deleteContact = (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM contacts WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error deleting contact:", err);
            return res.status(500).json({
                success: false,
                message: "Error deleting contact",
                error: err.message
            });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Contact deleted successfully"
        });
    });
};

module.exports = { 
    submitContact, 
    getAllContacts, 
    viewContact, 
    deleteContact, 
    getRateLimitStatus 
};