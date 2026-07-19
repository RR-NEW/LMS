import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
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
