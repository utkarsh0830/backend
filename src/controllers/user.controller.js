import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User}  from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessAndRefreshToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false}); // this is because before saving do not need passsword

    return {accessToken, refreshToken};

  }catch(error){
    throw new ApiError(500,"Something Went Wrong while generating refresh and access token")
  }
}


const registerUser = asyncHandler(async (req, res) => {

  // get user details from frontend
  // validation - not Empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary
  // create use objects - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const {fullName, email, username, password} = req.body
  
  // if(fullName === ""){
  //   throw new ApiError(400,"fullname is required")
  // }

  if(
    [fullName,email,username,password].some((field) => field?.trim() === "")
  ){
      throw new ApiError(400,"All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ username },{ email }]  // operator to find with multiple params
  })

  if(existedUser){
    throw new ApiError(409, "User already exists")
  }


  const avatarLocalPath = req.files?.avatar[0]?.path; // multer gives files in req
  console.log("File Req from Multer: ",req.files);

  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400,"Avatar file ise required")
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // Jo nhi chhiye wo likhna hai
  );

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering a user")
  }



  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  );
});

const loginUser = asyncHandler(async (req,res) => {
  //req body -> data
  //username or email
  // find the user
  //password check
  //access and refresh token
  //send cookie


  const { email,username,password } = req.body;

  if(!username || !email){
    throw new ApiError(400, "Username or Email is required")
  }

  const user = await User.findOne({ 
    $or: [{ email }, { username: email }]
  });

  if(!user){
    throw new ApiError(404, " User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid Credentials");
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true, //due to this cookies are only modifiable from server side not client side
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken, options).cookie()
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(200,
      {
        user:loggedInUser,accessToken,
        refreshToken
      },
      "User logged in Successfully"
    )
  )
});

const loggedOutUser = asyncHandler(async(req,res) => {
  
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId,
    {
      $set: {
        refreshTokens: undefined,
      },
    },
    {
      new: true,
    }
  )

  const options = {
    httpOnly: true, //due to this cookies are only modifiable from server side not client side
    secure: true
  }

  return res.status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(
    new ApiResponse(200,{},"User Logged Out")
  )

});

export { registerUser,loginUser,loggedOutUser };
