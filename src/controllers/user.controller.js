import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User}  from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    //console.log("Generating tokens for user:", userId);  // Log userId to verify it's correct
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found with the provided userId");
      throw new ApiError(404, "User not found");
    }

    //console.log("User found:", user);  // Log the user object to ensure it's correct
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    console.log("Generated accessToken:", accessToken);
    console.log("Generated refreshToken:", refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);  // Log the error details
    throw new ApiError(500, "Something Went Wrong while generating refresh and access token");
  }
};



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

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  console.log(req.body);

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  //const loggedInUser = await User.findById(user._id).select("-password -refreshToken").lean(); 
  // Manually create a plain user object, excluding sensitive information
  const loggedInUser = {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    coverImage: user.coverImage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const options = {
    httpOnly: true, // Cookies are only modifiable from server-side
    secure: true
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in Successfully"
      )
    );
});


const loggedOutUser = asyncHandler(async(req,res) => {
  
  const userId = req.user._id;
  await User.findByIdAndUpdate(userId,
    {
      $unset: {
        refreshTokens: 1,
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

const refreshAccessToken = asyncHandler(async (req,res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized Access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = User.findById(decodedToken?._id);
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token");
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Invalid refresh token");
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newrefreshToken} =await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",newrefreshToken, options)
    .json(
      new ApiResponse(200,
        {accessToken,newrefreshToken},
        "Access Token Refreshed")
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Refresh Token")
    
  }
})


const changeCurrentPassword = asyncHandler(async(req,res) => {
  const {oldPassword, newPassword} = req.body;

  const userId = req.user?._id;
  const user = await User.findById(userId);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid Old Password");
  }

  user.password = newPassword;

  await user.save({
    validateBeforeSave: false
  });

  return res.status(200)
  .json(
    new ApiResponse(200,"Password Changed Successfully")
  )
});


const getCurrentUser = asyncHandler(async (req,res) => {
  return res
  .status(200)
  .json(200,req.user,"Current User Fetched Successfully");
});


const updateAccountDetails = asyncHandler(async (req,res) => {

  const {fullName, email,} = req.body;

  if(!fullName || !email) {
    throw new ApiError(400, "All fields are Required")
  }
  const userId = req.user?._id;

  const user = User.findByIdAndUpdate(
    userId,
    {
      $set: {
        fullName,
        email
      }
    },
    {
      new: true
    }
  ).select("-password")


  return res
  .status(200)
  .json(200,req.user,"Account details Updated Successfully");

});

const updateUserAvatar = asyncHandler(async (req,res) => {

  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400,"Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {
      new: true
    }
  )

  return res
  .status(200)
  .json(
    new ApiResponse(200, "Avatar updated successfully")
  )
});

const updateUserCoverImage = asyncHandler(async (req,res) => {

  const coverLocalPath = req.file?.path;

  if(!coverLocalPath){
    throw new ApiError(400,"Avatar is missing");
  }

  const cover = await uploadOnCloudinary(coverLocalPath)

  if(!cover.url){
    throw new ApiError(400,"Cover image upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, "CoverImage updated successfully")
  )
});

const getUserChannelProfile = asyncHandler(async (req,res) => {
  const {username} = req.params;

  if(!username){
    throw new ApiError(400,"Username is missing")
  }

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
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName:1,
        username:1,
        subscribersCount:1,
        isSubscribed:1,
        channelsSubscribedToCount:1,
        avatar:1,
        coverImage:1,
        email:1,
      }
    }
  ]); // aggregation pipelies are written [{},{},{}]
  console.log("Channel: ",channel);

  if(!channel?.length){
    throw new ApiError(404, "Channel does not exists");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,channel[0],"User channel Fetched Successfully"));

});

const getWatchHistory = asyncHandler(async (req,res) =>{
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
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
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0].getWatchHistory,"Watch History Fetched Successfully")
  );

});


export { registerUser,loginUser,loggedOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory };
