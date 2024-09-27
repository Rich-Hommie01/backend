import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    accountNumber: { 
      type: String, 
      unique: true 
    },
    balance: {
      type: Number,
      default: 0, // Set the initial balance to zero
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
    },
    lastName: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    apt: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
      match: [/^\d{5}$/, "Please enter a valid 5-digit zip code"],
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    idNumber: {
      type: String,
      required: true,
    },
    issueState: {
      type: String,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
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
    ssn: {
      type: String,
      required: true,
      match: [/^\d{3}\d{2}\d{4}$/, "SSN must be in the format XXX-XX-XXXX"],
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpireAt: Date,
    verificationToken: String,
    verificationTokenExpireAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ accountNumber: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);
