import mongoose from "mongoose";
import { DB_NAME } from "../Constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`MongoDb Connected !! DB host: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MongoDb Connection Failed: ",error)
        throw error
    }
}

export default connectDB