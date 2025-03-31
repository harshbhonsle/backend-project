import {Router} from "express"
import {loginUser, logoutUser, registerUser,refreshAccessToken} from "../controllers/user.controllers.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// router.route("/register").post(registerUser)
// new syntax 
// router.get('/register',(req,res)=>{
//     res.json({message:'ok'})
// })
// upload aaya hai multer and it gives us many options
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

    router.route("/login").post(loginUser)

    // secured routes
    router.route("/loggout").post(verifyJWT, logoutUser,)
    router.route("/refresh-token").post(refreshAccessToken)
export default router

