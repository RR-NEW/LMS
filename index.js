import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import mongoose from "mongoose";
import Users from "./database/models/user.js";

const app = express();
const PORT =1001;
app.use(express.json());

const mongoUri="mongodb+srv://<db_username>:qdMW2eBZUPiH90MD@lead.izrjkec.mongodb.net/";

async function connectToDb()
{
    try{
        await mangoose.connect(mongoUri);
        console.log("connected");
    }
    catch(error){
        console.log("Error in mongoose connection :\n", error);
    }
}

connectToDb();
app.get("/", (req, res)=>{
    return res.json({
        name: "Rojit",
    });
});

app.get("/users", async  (req, res) => {
    const allUsers= await User.find();

    return res.json({
        status:"success",
        users: allUsers,
    });
});
app.post("/users",async (req, res)=> {
    const formdata= req.body;
    const newuser = await User.create(formData);

    return res.json({
        status: "success",
        user: newuser,
    

    });
});
app.listen(PORT, () => {
    console.log(`Serever is on port ${PORT}`);
});
