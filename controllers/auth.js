import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookies.js";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "../mailtrap/emails.js";
import { User } from "../models/user.js";
import { Transaction } from "../models/Transaction.js";
import { validationResult } from "express-validator";
import { generateUniqueAccountNumber } from '../utils/generateAccountNumber.js';

export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const fixedRoutingNumber = '197298915';
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

  const upperCaseState = state.toUpperCase();

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const message = existingUser.username === username ? 'Username already exists' : 'Email already exists';
      return res.status(400).json({ success: false, message });
    }

    const checkingAccountNumber = await generateUniqueAccountNumber();
    const savingsAccountNumber = await generateUniqueAccountNumber();

    const hashedPassword = await bcryptjs.hash(password, 10);

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
      state: upperCaseState,
      zipCode,
      username,
      phone,
      idNumber,
      issueState,
      expirationDate,
      ssn,
      accounts: {
        checking: checkingAccountNumber,
        savings: savingsAccountNumber,
      },
      routingNumber: fixedRoutingNumber,
      balance: {
        checking: 0,
        savings: 0,
      },
      isApproved: false,
    });

    await user.save();

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
      const duplicatedField = Object.keys(error.keyPattern)[0];
      const message = `${duplicatedField.charAt(0).toUpperCase() + duplicatedField.slice(1)} already exists`;
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const checkUsername = async (req, res) => {
  const { username } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    res.status(200).json({ success: true, message: 'Username is available' });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


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

export const updateBalance = async (req, res) => {
  const { userId, amount, accountType } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (accountType === 'checking') {
      user.balance.checking += amount;
    } else if (accountType === 'savings') {
      user.balance.savings += amount;
    } else {
      return res.status(400).json({ success: false, message: "Invalid account type" });
    }

    await user.save();

    const transaction = new Transaction({
      userId,
      amount,
      description: 'Online scheduled transfer from CHK 4924 Confirmation# xxxxx90304',
      accountType,
    });
    await transaction.save();

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
  const { userId, accountType } = req.params;

  try {
    const filter = { userId };
    if (accountType) {
      filter.accountType = accountType;
    }

    const transactions = await Transaction.find(filter);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;

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

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in checkAuth ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
