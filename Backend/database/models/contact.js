import mongoose, { Schema } from "mongoose";

const contactSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
     lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
    name:String,
    role:String,
    phoneno:String,
  },
  { timestamps: true },
);

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
