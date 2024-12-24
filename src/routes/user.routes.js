import { Router } from "express";
import {registerUser, loginUser, logoutUser, refreshAccessToken, updateUserAvatar} from "../controllers/user.controller.js";
import { upload } from "./../middlewares/multer.middleware.js";
import VerifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },{
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/update").post(VerifyJwt,updateUserAvatar);

router.route("/logout").post(VerifyJwt, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

export default router;
