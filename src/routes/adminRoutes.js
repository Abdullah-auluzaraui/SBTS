const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/dashboard',
  authMiddleware,
  roleMiddleware('admin'),
  (req, res) => {
    res.json({
      success: true,
      message: `Welcome Admin ${req.user.name}`
    });
  }
);

module.exports = router;