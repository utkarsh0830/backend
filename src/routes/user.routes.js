import { Router } from "express";
import {loginUser,loggedOutUser, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// Ensure this route matches the POST method
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]), //Reads array 
    registerUser
);

router.route('/login').post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT, loggedOutUser);




export default router;
