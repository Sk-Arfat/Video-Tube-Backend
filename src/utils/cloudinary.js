import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import ApiError from "./ApiError.js";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfull
    console.log("File is Successfully Uploaded on Cloudinary", response.url);
    
    fs.unlinkSync(localFilePath); 

    return response;

  } catch (error) {
    fs.unlinkSync(localFilePath);//Remove the locally saved temporary file as the upload operation got failed 
    return null;
  }
};

export default uploadOnCloudinary;
