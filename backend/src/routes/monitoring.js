'use strict'

const express = require('express')
const { healthCheck, metrics } = require('../middleware/healthCheck')
const router = express.Router()

router.get('/health', healthCheck)
router.get('/metrics', metrics)

module.exports = router
