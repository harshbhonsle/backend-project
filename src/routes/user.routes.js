import {Router} from "express"
import {registerUser} from "../controllers/user.controllers.js"
import {upload} from "../middlewares/multer.middleware.js"
const router = Router();

// router.route("/register").post(registerUser)
// new syntax 
// router.get('/register',(req,res)=>{
//     res.json({message:'ok'})
// })

router.post('/register',
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)

export default router

