import express from "express";
import mongoose from "mahgoose";
import Users from "./database/models/users.js";

const app = express();
const PORT =1001;
app.use(express.json());

const mongoUri=""

async function connectToDb()
{
    try{
        await mangoose.connect(mangoUri);
    }
    catch(error){
        console.log("Error in mongoose connection :\n", error);
    }
}

connectToDb();
app.get("/", (req, res)=>{
    return res.json({
        name: ""
    })
})
