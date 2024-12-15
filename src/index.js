//require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import connectDB from "./db/index.js";

import {app} from "./app.js"

// function connectDB(){}
// connectDB

/*

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        // If for some reason we could not connect with database then give error
        app.on("error",(error) => {
            console.log("ERR: ",error);
            throw error
        })

        //Listen for app when connected with database
        app.listen(process.env.PORT,() => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    }catch (error){
        console.log("ERROR: ", error);
        throw err
    }
})() //this is efies function

*/

dotenv.config({
    path: './env'
})
connectDB()
.then(() => {
    app.listen(process.env.PORT || 5010, () => {
        console.log(`Server is running... ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed!",err);
})
