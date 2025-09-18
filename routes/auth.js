const express = require('express');
const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.send('Auth route works');
});

module.exports = router;
