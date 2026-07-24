import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import Tenant from "./database/models/tenant.js";
import User from "./database/models/user.js";
import Lead from "./database/models/lead.js";
import Services from "./database/models/services.js";
import Contact from "./database/models/contact.js";

const app = express();
const PORT = process.env.PORT || 1001;
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";

app.use(cors());
app.use(express.json());

// === JWT AUTHENTICATION MIDDLEWARE ===
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ status: "error", message: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.tenantId = decoded.tenantId; 

        // If tenantId is missing from token, retrieve or create dedicated user workspace
        if (!req.tenantId) {
            const user = await User.findById(req.userId);
            if (user && user.tenantId) {
                req.tenantId = user.tenantId;
            } else {
                const personalTenant = await Tenant.create({
                    name: `User-${req.userId}'s Workspace`,
                    slug: `workspace-${req.userId}-${Date.now()}`
                });
                req.tenantId = personalTenant._id;
                if (user) {
                    user.tenantId = personalTenant._id;
                    await user.save();
                }
            }
        }

        next();
    } catch (err) {
        return res.status(401).json({ status: "error", message: "Unauthorized: Invalid or expired token" });
    }
}

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/lms";

async function connectToDb() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error in Mongoose connection:\n", error);
    }
}
connectToDb();

app.get("/", (req, res) => {
    return res.json({ message: "LMS API Server Running", name: "Rojit" });
});

// === REGISTER ROUTE ===
app.post("/api/register", async (req, res) => {
    try {
        const { username, password, fullname, companyName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ status: "error", message: "Username and password are required" });
        }

        const existingUser = await User.findOne({ username: username.trim() });
        if (existingUser) {
            return res.status(400).json({ status: "error", message: "Username already exists" });
        }

        let tenant;
        if (companyName && companyName.trim() !== "") {
            const trimmedCompany = companyName.trim();
            const existingTenant = await Tenant.findOne({ name: trimmedCompany });
            if (existingTenant) {
                return res.status(400).json({ status: "error", message: "Company name already registered" });
            }
            
            const slug = trimmedCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            tenant = await Tenant.create({ name: trimmedCompany, slug: `${slug}-${Date.now()}` });
        } else {
            // Unique dedicated workspace per user (prevents data sharing)
            const userSlug = `workspace-${username.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
            tenant = await Tenant.create({
                name: `${fullname || username}'s Workspace`,
                slug: userSlug
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username: username.trim(),
            passwordHash: hashedPassword,
            fullname: fullname || "",
            tenantId: tenant._id
        });

        return res.status(201).json({
            status: "success",
            message: "User registered successfully",
            user: { username: newUser.username, fullname: newUser.fullname }
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// === LOGIN ROUTE ===
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.trim() });

        if (!user) {
            return res.status(401).json({ status: "error", message: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash || user.password || "");
        if (!isMatch && user.passwordHash !== password && user.password !== password) {
            return res.status(401).json({ status: "error", message: "Invalid username or password" });
        }

        // Migrate users currently sharing the legacy "default" tenant into isolated workspaces
        let tenantId = user.tenantId;
        const defaultTenant = await Tenant.findOne({ slug: "default" });

        if (!tenantId || (defaultTenant && tenantId.toString() === defaultTenant._id.toString())) {
            const userSlug = `workspace-${user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
            const personalTenant = await Tenant.create({
                name: `${user.fullname || user.username}'s Workspace`,
                slug: userSlug
            });
            tenantId = personalTenant._id;
            user.tenantId = tenantId;
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id, tenantId: user.tenantId },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            status: "success",
            message: "Login successful",
            token,
            user: { username: user.username, fullname: user.fullname }
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// === GOOGLE LOGIN ROUTE ===
app.post("/api/google-login", async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ status: "error", message: "Google ID Token is required" });
        }

        const decodedToken = jwt.decode(idToken);
        if (!decodedToken || !decodedToken.email) {
            return res.status(400).json({ status: "error", message: "Invalid Google token payload" });
        }

        const email = decodedToken.email;
        const fullname = decodedToken.name || email.split("@")[0];

        let user = await User.findOne({ username: email });

        if (!user) {
            const userSlug = `workspace-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
            const personalTenant = await Tenant.create({
                name: `${fullname}'s Workspace`,
                slug: userSlug
            });

            user = await User.create({
                username: email,
                fullname: fullname,
                tenantId: personalTenant._id
            });
        } else {
            const defaultTenant = await Tenant.findOne({ slug: "default" });
            if (!user.tenantId || (defaultTenant && user.tenantId.toString() === defaultTenant._id.toString())) {
                const userSlug = `workspace-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
                const personalTenant = await Tenant.create({
                    name: `${fullname}'s Workspace`,
                    slug: userSlug
                });
                user.tenantId = personalTenant._id;
                await user.save();
            }
        }

        const token = jwt.sign(
            { userId: user._id, tenantId: user.tenantId },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            status: "success",
            message: "Google login successful",
            token,
            user: { username: user.username, fullname: user.fullname }
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/api/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-passwordHash -password");
        const tenant = await Tenant.findById(req.tenantId);
        return res.json({ status: "success", user, tenant });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// === LEADS ROUTES (Tenant Scoped) ===
app.get("/api/leads", requireAuth, async (req, res) => {
    try {
        const leads = await Lead.find({ tenantId: req.tenantId });
        return res.json({ status: "success", leads });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/api/leads/:id", requireAuth, async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!lead) {
            return res.status(404).json({ status: "error", message: "Lead not found" });
        }

        const services = await Services.find({ lead: lead._id, tenantId: req.tenantId });
        const contacts = await Contact.find({ lead: lead._id, tenantId: req.tenantId });

        return res.json({ status: "success", lead, services, contacts });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/api/leads", requireAuth, async (req, res) => {
    try {
        const { businessName, location, status, demoDate, followupDate, notes, contactPhone } = req.body;

        const newLead = await Lead.create({
            tenantId: req.tenantId,
            businessName,
            location,
            status,
            demoDate,
            followupDate,
            notes
        });

        if (contactPhone && contactPhone.trim() !== "") {
            await Contact.create({
                tenantId: req.tenantId,
                name: businessName,
                phoneno: contactPhone,
                role: "Primary Contact",
                lead: newLead._id
            });
        }

        return res.json({ status: "success", lead: newLead });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.put("/api/leads/:id", requireAuth, async (req, res) => {
    try {
        delete req.body.tenantId; // Prevent changing tenant ownership
        const updatedLead = await Lead.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );

        if (!updatedLead) {
            return res.status(404).json({ status: "error", message: "Lead not found or unauthorized" });
        }

        return res.json({ status: "success", lead: updatedLead });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    try {
        const deletedLead = await Lead.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
        if (!deletedLead) {
            return res.status(404).json({ status: "error", message: "Lead not found or unauthorized" });
        }

        await Services.deleteMany({ lead: req.params.id, tenantId: req.tenantId });
        await Contact.deleteMany({ lead: req.params.id, tenantId: req.tenantId });

        return res.json({ status: "success", message: "Lead and related records deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// === SERVICES ROUTES (Tenant Scoped) ===
app.get("/api/services", requireAuth, async (req, res) => {
    try {
        const services = await Services.find({ tenantId: req.tenantId }).populate("lead");
        return res.json({ status: "success", services });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/api/services", requireAuth, async (req, res) => {
    try {
        const { serviceName, lead, description, price } = req.body;

        if (lead && lead.trim() !== "") {
            const leadExists = await Lead.findOne({ _id: lead, tenantId: req.tenantId });
            if (!leadExists) {
                return res.status(400).json({ status: "error", message: "Invalid lead ID for this tenant" });
            }
        }

        const newService = await Services.create({
            tenantId: req.tenantId,
            serviceName,
            description,
            price: price ? Number(price) : 0,
            lead: lead && lead.trim() !== "" ? lead : null
        });

        return res.json({ status: "success", service: newService });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.put("/api/services/:id", requireAuth, async (req, res) => {
    try {
        delete req.body.tenantId;
        const updatedService = await Services.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );

        if (!updatedService) {
            return res.status(404).json({ status: "error", message: "Service not found or unauthorized" });
        }

        return res.json({ status: "success", service: updatedService });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
        const deletedService = await Services.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
        if (!deletedService) {
            return res.status(404).json({ status: "error", message: "Service not found or unauthorized" });
        }
        return res.json({ status: "success", message: "Service deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

// === CONTACTS ROUTES (Tenant Scoped) ===
app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
        const contacts = await Contact.find({ tenantId: req.tenantId }).populate("lead");
        return res.json({ status: "success", contacts });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
        const { name, phoneno, role, lead } = req.body;

        if (lead && lead.trim() !== "") {
            const leadExists = await Lead.findOne({ _id: lead, tenantId: req.tenantId });
            if (!leadExists) {
                return res.status(400).json({ status: "error", message: "Invalid lead ID for this tenant" });
            }
        }

        const newContact = await Contact.create({
            tenantId: req.tenantId,
            name,
            phoneno,
            role,
            lead: lead && lead.trim() !== "" ? lead : null
        });

        return res.json({ status: "success", contact: newContact });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.put("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
        delete req.body.tenantId;
        const updatedContact = await Contact.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({ status: "error", message: "Contact not found or unauthorized" });
        }

        return res.json({ status: "success", contact: updatedContact });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
        const deletedContact = await Contact.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
        if (!deletedContact) {
            return res.status(404).json({ status: "error", message: "Contact not found or unauthorized" });
        }
        return res.json({ status: "success", message: "Contact deleted" });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});