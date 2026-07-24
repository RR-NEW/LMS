import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    username: String,
    passwordHash: String,
    fullname: String,
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
