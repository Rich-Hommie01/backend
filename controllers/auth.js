import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookies.js";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "../mailtrap/emails.js";
import { User } from "../models/user.js";

// Signup Controller
export const signup = async (req, res) => {
  const { email, password, name, username, address, dob, ssn, phone } = req.body;

  try {
    // Check if the user already exists
    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create a new user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      username,
      address,
      dob,
      ssn,
      phone
    });

    // Save the new user to the database
    await user.save();

    // Automatically log in the user by generating a token and setting it as a cookie
    generateTokenAndSetCookie(res, user._id);

    // Send success response
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { ...user._doc, password: undefined },
    });
  } catch (error) {
    console.error("Error during signup: ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Login Controller
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`User not found with username: ${username}`);
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Validate the password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    console.log(`Password validation result for user ${username}: ${isPasswordValid}`);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate token and set it as a cookie
    generateTokenAndSetCookie(res, user._id);

    // Update last login date
    user.lastLogin = new Date();
    await user.save();

    // Send success response
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("Error during login: ", error);
    res.status(400).json({ success: false, message: error.message });
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
    console.error("Error in forgotPassword: ", error);
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
    console.error("Error in resetPassword: ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Check Authentication Controller
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in checkAuth: ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
