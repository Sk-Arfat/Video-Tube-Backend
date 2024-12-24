import { v2 as cloudinary } from 'cloudinary';
import ApiError from './ApiError.js';
import fs from 'fs';


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const deleteOldFromCloudinaryAfterUpdate = async(localFilePath) => {
    try {
        if(!localFilePath) return null
    
        const response = await cloudinary.uploader.destroy(localFilePath,{
            resource_type: auto
        })
    
        return response
      }
     catch (error) {
        throw new ApiError(400, "Failed to delete old file after update", error);
        return null
    }
}

    export {deleteOldFromCloudinaryAfterUpdate};