import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler(async (req,res)=>{
   /// get user details 
//    validation - not empty 
// check if user already exists : check using username or email or both 
// check for images , check for avatar 
// upload them to cloudinary 
    // create user object - create entry in db 
    // check for null creation 
    // return res 

    const {fullName, email, username ,password } = req.body
    console.log("email", email)

    if(
        [fullName, email, username, password].some((field) => field?.trim()=== "")  // alternate way to check if for each field
    ){
        throw new ApiError(400, "all fields are required")
    }

    // check for user exists
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409,"user with email or username already exists")
    }

    // image handle
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is required")
    }

    // cloudinary par upload karne k liye
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user_.id).select(
        // .select main pass hota hai ek string aur waha de select karna hota hai kyuki intially sb selected hote hai
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering a user")
    }
    
    
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Succesfully")
    )
})

export {registerUser}