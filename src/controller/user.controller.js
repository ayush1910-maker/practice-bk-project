import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary} from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
       const user =  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false })

       return {accessToken , refreshToken}


    } catch (error) {
        throw new ApiError(500, "something went wrong while genereating refresh and access token")
    }
}


const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images and avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and referesh token field from response
    // check for user creation
    // retrun res

   const {fullName,email,username,password} = req.body
//    console.log("email: ", email);

//    if(fullname === ""){
//     throw new ApiError(400, "fullname is required")
//    }
//  basic method we apply at all feilds

//  advance methods
if (
    [fullName, email, username, password].some((feild)=>
        feild?.trim() === "")
) {
    throw new ApiError(400, "All feilds are required")
}



const existedUser = await User.findOne({
    $or: [{ username } , { email }]
})

if(existedUser){
    throw new ApiError(409, "user with email or username already exists")
}

console.log(req.files);


const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;
if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
}

if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
}

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)


if(!avatar){
    throw new ApiError(400,"Avatar files is required")
}

 const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
})



 const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
 )

 if(!createdUser){
    throw new ApiError(500,"something went wrong when registering the user")
 }

 return res.status(201).json(
    new Apiresponse(200, createdUser, "User registered successfully")
 )

} )

const loginUser = asyncHandler( async (req , res) => {

    // get data from frontend
    // validation
    // find the user
    // password check
    // access and refresh token
    // send cookie
    // return res

    // 1 
    const {email,username,password} = req.body


    // 2
    if(!username && !email ){
        throw new ApiError(400, "email or  username are required")
    }

    // if only one thing can take so 
    // if(!(username || email )){
        // throw new ApiError(400, "email or  username are required")
    // }

    // 3
    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404 , "User does not exist")
    }

    // 4
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "password are invalid")
    }

    // 5
    const {accessToken , refreshToken} = await
     generateAccessAndRefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id).
     select("-password -refreshToken")
     
    // 6
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new Apiresponse(
            200,
            {
                user: loggedInUser , accessToken,
                refreshToken
            },
            "User logged In successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req , res) => {
  await  User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new Apiresponse(200 , {} , "User logged Out"))


})

const refreshAccessToken = asyncHandler(async (req , res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

   try {
     const decodedToken =  jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user) {
         throw new ApiError(401,"Invalid refresh token")
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401,"refresh token is expired or used")
     }
 
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken , options )
     .cookie("refreshToken" , newrefreshToken , options)
     .json(
         new Apiresponse(
             200,
             {accessToken, refreshToken: newrefreshToken},
             "access token refreshed"
         )
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
   }
    
})

const changeCurrentPassword = asyncHandler(async (req , res) => {
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res 
    .status(200)
    .json(new Apiresponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req , res) => {
    return res 
    .status(200)
    .json(new Apiresponse(
        200,
        req.user,
       "current user fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async (req , res) => {

    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

  const user = await  User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email // inconsistency  
            }
        },
        {new: true }
    ).select("-password")

    return res
    .status(200)
    .json(new Apiresponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req , res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
    {
        $set: {
            avatar: avatar.url
        }
    },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new Apiresponse(200, user, "avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req , res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
    {
        $set: {
            coverImage: coverImage.url
        }
    },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new Apiresponse(200, user, "coverImage updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req , res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    // User.find({username})

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                  from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new ApiError(400, "channel does not exists")
    }


    return res
    .status(200)
    .json(
        new Apiresponse(200, channel[0], "User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
             
            }
        }
    ])

    return res
    .status(200)
    .json(
        new Apiresponse(
            200,
            user[0].watchHistory,
            "watch history fetched successfully"
        )
    )
}) 

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}