import mongoose, { Schema } from "mongoose";

const leadSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true, 
    },
    businessName: String,
    location: String,
    status: String,
    demoDate: Date,
    followupDate: Date,
    notes: String,
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;