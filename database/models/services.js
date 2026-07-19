import mongoose, { Schema } from "mongoose";

const serviceSchema = new Schema(
  {
    
    serviceName: String,
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
    description: String,
    price: Number,
  },
  { timestamps: true },
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
