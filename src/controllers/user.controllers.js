import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import cookieParser from "cookie-parser"


// method to generate access and refesh tokens 
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // add refesh and access token to db 
        user.refeshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    /// get user details 
    //    validation - not empty 
    // check if user already exists : check using username or email or both 
    // check for images , check for avatar 
    // upload them to cloudinary 
    // create user object - create entry in db 
    // check for null creation 
    // return res 

    const { fullName, email, username, password } = req.body
    console.log("email", email) // comment this at the end 

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")  // alternate way to check if for each field yeh har field ko trim krege aur agar empty nikla to true hoga aur error throw hoga uss case main 
    ) {
        throw new ApiError(400, "all fields are required")
    }

    // check for user exists : findOne find krta hai ek ko return kr deta hai 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
        // $or use hota hai check krne k liye hum more than one k liye bi check kr shkte hai 
    })

    if (existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }

    // image handle
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }

    // cloudinary par upload karne k liye
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        // .select main pass hota hai ek string aur waha de select karna hota hai kyuki intially sb selected hote hai
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering a user")
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Succesfully")
    )
})

// making login user controller 
const loginUser = asyncHandler(async (req, res) => {
    //  check whether user exist or not 
    // full name and password req 
    // take data from body 
    // access and refresh token 
    // send cookie

    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // find user if it exists from database 
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user does not exist, Error 404")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            }, "User loggedIn successfully !")
        )

})

// log out method 

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies 
    // reset refresh token 
    await User.findByIdAndUpdate(
        req.user_.id, {
        $set: {
            refreshToken: undefined
        },

    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true

    }
    return res.status(200).clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        )
})

// refresh access token controller 
const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookie.refeshToken || req.body.refeshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorised request")
    }

    // verify both incoming refresh token and the request accesss token that we have 
    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token ")
        }
        if (incomingRefreshToken !== user?.refreshAccessToken) {
            throw new ApiError(401, "Refresh token is expired or used ")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token ")
    }
})


// Change password controller 
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password")
    }

    // setting new password 
    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed successfully"))

})

// current user fetching 
const currentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current user fetched succesfully")
})

// Update user details 
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,

        {
            $set: {
                fullName,
                email: email // both ways are correct 
            }
        },
        { new: true }
    ).select("-password")

    res.
        status(200)
        .json(200, user, "User details updated")
})

// update user avatar

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing ")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error file uploading")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(200, user, "Avatar image update successfully")

})


// update cover Image 


const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path
    if (!coverImagePath) {
        throw new ApiError(400, "Cover Image is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImagePath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error file uploading")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }

        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image Updated")
        )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    currentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage
}