import mongoose, { Schema } from "mongoose";

const leadSchema = new Schema(
  {
   businessName:String,
   location:String,
   status:String,
   notes:String,
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
