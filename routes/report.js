const express = require('express')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const router = express.Router()
const {report_services}=require('../services/report.services')

//get all event report
router.get('/event-stats', [auth, admin],
    report_services.get_all_report
);


//get report for specific event id
router.get("/:event_id", [auth, admin], 
    report_services.get_specific_report_by_id
)



module.exports = router

