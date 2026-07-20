import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import User from "./database/models/user.js";
import Lead from "./database/models/lead.js";
import Services from "./database/models/services.js";
import Contact from "./database/models/contact.js";

const app = express();
const PORT = process.env.PORT || 1001;

app.use(cors());
app.use(express.json());


const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/lms";

async function connectToDb() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected ");
    } catch (error) {
        console.error("Error in Mongoose connection:\n", error);
    }
}
connectToDb();

app.get("/", (req, res) => {
    return res.json({ message: "LMS API Server Running", name: "Rojit" });
});


app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                status: "error",
                message: "Invalid username or password"
            });
        }

        
        const storedPassword = user.passwordHash || user.password;
        if (storedPassword !== password) {
            return res.status(401).json({
                status: "error",
                message: "Invalid username or password"
            });
        }

        return res.json({
            status: "success",
            message: "Login successful",
            user: { username: user.username, fullname: user.fullname }
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.get("/api/leads", async (req, res) => {
    try {
        const leads = await Lead.find();
        return res.json({ status: "success", leads });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/api/services", async (req, res) => {
    try {
        const services = await Services.find().populate("lead");
        return res.json({ status: "success", services });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/api/contacts", async (req, res) => {
    try {
        const contacts = await Contact.find().populate("lead");
        return res.json({ status: "success", contacts });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.post("/api/leads", async (req, res) => {
    try {
        const newLead = await Lead.create(req.body);
        return res.json({ status: "success", lead: newLead });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/api/services", async (req, res) => {
    try {
        const { serviceName, lead, description, price } = req.body;
        const serviceData = {
            serviceName,
            description,
            price: price ? Number(price) : 0,
            lead: lead && lead.trim() !== "" ? lead : null
        };
        const newService = await Services.create(serviceData);
        return res.json({ status: "success", service: newService });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/api/contacts", async (req, res) => {
    try {
        const { name, phoneno, role, lead } = req.body;
        const contactData = {
            name,
            phoneno,
            role,
            lead: lead && lead.trim() !== "" ? lead : null
        };
        const newContact = await Contact.create(contactData);
        return res.json({ status: "success", contact: newContact });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.put("/api/leads/:id", async (req, res) => {
    try {
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        return res.json({ status: "success", lead: updatedLead });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.delete("/api/leads/:id", async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        await Services.deleteMany({ lead: req.params.id });
        await Contact.deleteMany({ lead: req.params.id });
        return res.json({ status: "success", message: "Lead deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.delete("/api/services/:id", async (req, res) => {
    try {
        await Services.findByIdAndDelete(req.params.id);
        return res.json({ status: "success", message: "Service deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.delete("/api/contacts/:id", async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        return res.json({ status: "success", message: "Contact deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});