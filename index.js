import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import mongoose from "mongoose";
import Users from "./database/models/user.js";

const app = express();
const PORT =1001;
app.use(express.json());

const mongoUri="mongodb+srv://mangooestry_db_user:qdMW2eBZUPiH90MD@mangooestry_db_user.izrjkec.mongodb.net/?appName=Lead";

async function connectToDb()
{
    try{
        await mongoose.connect(mongoUri);
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
    const formData= req.body;
    const newuser = await User.create(formData);

    return res.json({
        status: "success",
        user: newuser,
    

    });
});
app.listen(PORT, () => {
    console.log(`Server is on port ${PORT}`);
});
