import mongoose, { Schema } from "mongoose";

const contactSchema = new Schema(
  {
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
