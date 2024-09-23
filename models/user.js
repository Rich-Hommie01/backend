import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    balance: {
      type: Number,
      default: 0, // Set the initial balance to zero
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    ssn: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    idCardNumber: {
      type: String,
      required: true,
    },
    idExpirationDate: {
      type: Date, 
      required: true,
    },
    stateIdType: {
      type: String,
      enum: ['Driver\'s License', 'State ID', 'Passport'],
      required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpireAt: Date,
    verificationToken: String,
    verificationTokenExpireAt: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
