const express = require('express')

const { createComplaint } = require('../controllers/complaintController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.post('/', asyncHandler(createComplaint))

module.exports = router
