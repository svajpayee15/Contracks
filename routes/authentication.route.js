const express = require("express")
const router = express.Router()

const uploadContract = require("../controllers/uploadContract.controller.js")

router.post("/upload-contract",uploadContract)

module.exports = router