import express from "express"
import cookieParser from "cookie-parser" 
import cors from "cors"
const app = express();

//Cors is used to accept request from which we want to get (here - frontend)
app.use(cors({
    origin: "*", // Allow all origins for testing
    credentials: true,
  })); // app.use is used for middleware or configurations

//How much want to accept json data from form (This is configuration)
app.use(express.json({
    limit: "16kb"
}))

//extended is to get more nested objects
app.use(express.urlencoded({extended:true, limit:"16kb"}))

//static configuration is used to store some assets
//app.use(express.static);

// cookies-parser is to access user cookies from our server
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js"


app.use("/api/v1/users", userRouter) //Because routes is separated so middle is needed

export {app}
