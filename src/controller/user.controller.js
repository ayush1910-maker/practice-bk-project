import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary} from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/ApiResponse.js";

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
    if(!username || !email ){
        throw new ApiError(400, "email or  username are required")
    }

    // 3
    const user = User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404 , "User does not exist")
    }

    // 4
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(400, "password are required")
    }

    // 5
    const {accessToken , refreshToken} = await
     generateAccessAndRefreshTokens(user._id)

    // 6
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

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


export { 
    registerUser,
    loginUser 
}