const express = require('express')

const { login, getUsers, getEmployees, getCitizens } = require('../controllers/userController')
const { asyncHandler } = require('../utils/asyncHandler')

const router = express.Router()

router.post('/login', asyncHandler(login))
router.get('/', asyncHandler(getUsers))        
router.get('/employees', asyncHandler(getEmployees))
router.get('/citizens', asyncHandler(getCitizens))

module.exports = router