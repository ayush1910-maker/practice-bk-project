// require('dotenv').config({path: './env'})
// import mongoose from "mongoose";
// import {DB_NAME} from "./constant"


import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
















/*
import express from "express";
const app = express()

// 1 st approach
// function connectDB() {}
// connectDB()

// bhetar approach
;( async () => {
    try {
        // database connect hogya
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
       
       //par kabhi express connect nhi hua ho to
       app.on("error", (error) => {
        console.log("ERR: ", error);
        throw error
       })

       app.listen(process.env.PORT, ()=>{
        console.log(`app is listening on port ${process.env.PORT}`);
       })
    } 
    
    catch (error) {
        console.log("ERROR: ", error);
        throw err
    }
})()

*/