import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Tenant", tenantSchema);