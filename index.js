import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import "dotenv/config"; 

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import Users from "./database/models/user.js";
import Lead from "./database/models/lead.js";
import Services from  "./database/models/services.js";
import  Contact from "./database/models/contact.js";

const app = express();
const PORT = 1001;
 
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI;

async function connectToDb() {
    try {
        await mongoose.connect(mongoUri);
        console.log("connected");
    }
    catch(error) {
        console.log("Error in mongoose connection :\n", error);
    }
}

connectToDb()
// 1. GET ALL LEADS (Main Dashboard Table)
app.get("/api/leads", async (req, res) => {
    try {
        // Fetches leads and populates related contact/service fields automatically
        const leads = await Lead.find();
        return res.json({ status: "success", leads });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// 2. PUT UPDATE LEAD STATUS
app.put("/api/leads/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, { status }, { new: true });
        return res.json({ status: "success", lead: updatedLead });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// 3. GET ALL CONTACTS (Linked via Lead ID)
app.get("/api/contacts", async (req, res) => {
    try {
        const contacts = await Contact.find().populate("lead");
        return res.json({ status: "success", contacts });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// 4. GET ALL SERVICES
app.get("/api/services", async (req, res) => {
    try {
        const services = await Service.find().populate("lead");
        return res.json({ status: "success", services });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/", (req, res) => {
    return res.json({
        name: "Rojit",
    });
});

app.get("/users", async (req, res) => {
    const allUsers = await Users.find();

    return res.json({
        status: "success",
        users: allUsers,
    });
});

app.post("/users", async (req, res) => {
    const formData = req.body;
    const newuser = await Users.create(formData);

    return res.json({
        status: "success",
        user: newuser,
    });
});

app.listen(PORT, () => {
    console.log(`Server is on port ${PORT}`);
});