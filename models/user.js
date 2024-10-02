import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    routingNumber: { 
      type: String, 
      default: '197298915' 
    },
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
      minlength: [5, "Street address must be at least 5 characters long"],
    },
    apt: {
      type: String,
    },
    city: {
      type: String,
      required: true,
      minlength: [2, "City name must be at least 2 characters long"],
    },
    state: {
      type: String,
      required: true,
      match: [/^[A-Z]{2}$/, "Please enter a valid 2-letter state code (e.g., 'NY')"],
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
      minlength: [4, "Username must be at least 4 characters long"],
      maxlength: [15, "Username cannot exceed 15 characters"],
      match: [/^[a-zA-Z0-9]+$/, "Username can only contain alphanumeric characters"],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
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
      match: [/^\d{3}\d{2}\d{4}$/, "SSN must be in the format XXXXXXXXX"],
    },
    isApproved: { 
      type: Boolean, 
      default: false 
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
