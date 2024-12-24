import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./App.js";

dotenv.config({
  path: "./env",
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️  Server is listening on Port ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log('MongoDB Connection Error', err)
})

// import express from 'express';

// const app = express();

// ( async () => {
//     try {  // database connection using async await, and try catch to catch errors
//       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//       app.on("error", (error) => {
//         console.log("ERROR: ",error);
//         throw error
//       })

//       app.listen(process.env.PORT, () => {
//         console.log(`App is listening on Port ${process.env.PORT}`)
//       })

//     } catch (error) {
//        console.error("ERROR: ",error);
//        throw error
//     }
// })()
