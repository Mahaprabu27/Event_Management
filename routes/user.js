const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const {user_services}=require('../services/user.services')

//registration for manager,user
router.post('/', 
    user_services.user_creation
)

//get the current details of the user by auth token
router.get('/me', auth,
     user_services.current_details_of_user
    )

//get all users and managers
router.get('/', [auth, admin], 
    user_services.get_all_users_and_mangers
)

//view all maanger details
router.get('/managers', [auth, admin],
    user_services.view_all_managers
)

//view all users details
router.get('/users', [auth, admin],
     user_services.view_all_users
    )

//delete the user
router.delete('/:id', [auth, admin],
    user_services.delete_user
)

router.put("/:id", [auth, admin], 

    user_services.update_user    
)


module.exports = router





