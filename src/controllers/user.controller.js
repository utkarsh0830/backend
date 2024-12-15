import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User}  from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";



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

  const existedUser = User.findOne({
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

export { registerUser };
