import asyncHandler from "./../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { deleteOldFromCloudinaryAfterUpdate } from "../utils/deleteFromCloudinary.js";
import mongoose from "mongoose";
import fs from "fs";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    console.log(accessToken, refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token",
      error
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  // console.log("username:", username);

  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const userExisted = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExisted) {
    throw new ApiError(409, "User with Username or Email already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is Required");
  }

  const uploadedavatar = await uploadOnCloudinary(avatarLocalPath);
  const uploadedcoverImage = await uploadOnCloudinary(coverImageLocalPath);

  // console.log(uploadedavatar);

  if (!uploadedavatar) {
    throw new ApiError(400, "Avatar Image Upload Failed");
  }
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    email,
    password,
    avatar: uploadedavatar?.url,
    coverImage: uploadedcoverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError("Something went wrong while registering the user");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully 👍"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or Username is Required");
  }

  const logUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!logUser) {
    throw new ApiError(404, "User with Email or Username does not exist");
  }

  const isPasswordValid = await logUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(logUser._id);

  const loggedInUser = await User.findById(logUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  const response = new ApiResponse(
    200,
    { user: loggedInUser, accessToken, refreshToken },
    "User Logged In Successfully"
  );
  {
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(response);
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshtoken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshtoken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshtoken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "invalid refresh token");
  }

  if (incomingRefreshtoken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh Token is Expired");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, newRefreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const response = new ApiResponse(
    200,
    { accessToken, newRefreshToken },
    "Access Token and Refresh Token generated successfully"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(response);
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse("Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  console.log("request -> ", req.body)
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  console.log("detail -> ", user);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const deleteUser = await User.findById(req.user._id);

  const deletedResponse = deleteOldFromCloudinaryAfterUpdate(
    deleteUser.avatar?.url
  );

  console.log("delete :", deleteUser);

  if (!deletedResponse.result === "ok") {
    throw new ApiError(403, "Error deleting the avatar ");
  }

  const avatarLocalPath = req.files?.path;

  console.log("avatar :", avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  user.avatar = avatar;
  user.save();

  if (!avatar.url) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "cover image upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

//Aggregation pipeline start
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(403, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?.id, "$subscribedTo.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
});
//Aggregation pipeline End

//Subaggreagation pipeline start
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "Video",
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
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  console.log("user :", user);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory || [],
        "Watch history fetched successfully"
      )
    );
});
//Subaggregation pipeline End

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
  getWatchHistory,
};
