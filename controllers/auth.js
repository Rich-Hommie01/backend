import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookies.js";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "../mailtrap/emails.js";
import { User } from "../models/user.js";
import { Transaction } from "../models/Transaction.js";
import { validationResult } from "express-validator";
import { generateUniqueAccountNumber } from '../utils/generateAccountNumber.js';

// Signup Controller
export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    email,
    password,
    firstName,
    middleName,
    lastName,
    dob,
    street,
    apt,
    city,
    state,
    zipCode,
    username,
    phone,
    idNumber,
    issueState,
    expirationDate,
    ssn,
  } = req.body;

  try {
    // Check if the username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const message = existingUser.username === username ? 'Username already exists' : 'Email already exists';
      return res.status(400).json({ success: false, message });
    }

    // Attempt to generate a unique account number
    const accountNumber = await generateUniqueAccountNumber();

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create a new user instance
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      middleName,
      lastName,
      dob,
      street,
      apt,
      city,
      state,
      zipCode,
      username,
      phone,
      idNumber,
      issueState,
      expirationDate,
      ssn,
      accountNumber,
      balance: 0, // Initialize balance to zero or any default value
      isApproved: false,
    });

    // Save the user to the database
    await user.save();

    // Generate and set authentication token
    generateTokenAndSetCookie(res, user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user._doc,
        password: undefined,
        ssn: undefined,
      },
    });
  } catch (error) {
    console.error('Error in signup:', error);
    if (error.code === 11000) {
      // Handle duplicate key error (e.g., accountNumber or username/email already exists)
      const duplicatedField = Object.keys(error.keyPattern)[0];
      const message = `${duplicatedField.charAt(0).toUpperCase() + duplicatedField.slice(1)} already exists`;
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login Controller
export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: "Account is pending approval" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    generateTokenAndSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user._id,   
        ...user._doc,    
        password: undefined,
        ssn: undefined,
      },
    });
  } catch (error) {
    console.log("Error in login ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Balance Controller
export const updateBalance = async (req, res) => {
  const { id, amount } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update user balance
    user.balance += amount;
    await user.save();

    // Create a new transaction with default description
    const transaction = new Transaction({
      id,
      amount,
      description: 'Online scheduled transfer from CHK 4924 Confirmation# xxxxx90304', // Default description
    });
    await transaction.save(); // Save the transaction to the database

    res.status(200).json({
      success: true,
      message: "Balance updated successfully",
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTransactions = async (req, res) => {
  const { id } = req.params;

  try {
    const transactions = await Transaction.find({ id });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Logout Controller
export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Forgot Password Controller
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    await sendPasswordResetEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    );

    res.status(200).json({ success: true, message: "Password reset link sent to your email" });
  } catch (error) {
    console.log("Error in forgotPassword ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Reset Password Controller
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log("Error in resetPassword ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Check Authentication Controller
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.id).select("-password");
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in checkAuth ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
