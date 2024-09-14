import bcryptjs from "bcryptjs";
import crypto from "crypto";
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookies.js";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "../mailtrap/emails.js";
import { User } from "../models/user.js";

// Signup function
export const signup = async (req, res) => {
  const { email, password, name, username, address, dob, ssn, phone } = req.body;

  try {
    // Check if all required fields are provided
    if (!email || !password || !name || !username || !address || !dob || !ssn || !phone) {
      throw new Error("All fields are required");
    }

    // Check if the user already exists
    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generate a random 6-digit OTP
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a new user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      username,
      address,
      dob,
      ssn,
      phone,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 10 * 60 * 1000, // OTP expires in 10 minutes
    });

    // Save the user to the database
    await user.save();

    // Generate JWT and set cookie
    generateTokenAndSetCookie(res, user._id);

    // Return success response
    res.status(201).json({
      success: true,
      message: "User created successfully, OTP sent",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    // Handle errors
    console.error("Signup error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Login function
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Compare the password
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // If MFA is enabled, ask for the OTP
      return res.status(200).json({ mfaRequired: true, userId: user._id });
    }

    // If MFA is not enabled, prompt the user to set up MFA
    if (!user.mfaEnabled) {
      // Generate MFA secret for first-time MFA setup
      const secret = speakeasy.generateSecret({ name: 'YourAppName', length: 20 });
      user.mfaSecret = secret.base32; // Save the secret to the user
      await user.save();

      // Generate the QR code for the user to scan
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // Return response with the QR code to set up MFA
      return res.status(200).json({
        mfaSetupRequired: true,
        userId: user._id,
        qrCode: qrCodeUrl,
      });
    }

    // If MFA is not required and already enabled, log the user in
    generateTokenAndSetCookie(res, user._id);
    return res.status(200).json({ success: true, message: "Login successful" });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Verify MFA function
export const verifyMfa = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Verify the OTP
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: otp,
      window: 5,  // Adjust the window to allow time drift
    });

    if (!verified) {
      console.log(`Invalid OTP. Expected: ${speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32' })}, Received: ${otp}`);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // MFA verified, log the user in
    generateTokenAndSetCookie(res, user._id);
    res.status(200).json({ success: true, message: "MFA verified, logged in successfully", user: { ...user._doc, password: undefined } });
  } catch (error) {
    console.error("MFA verification error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Logout function
export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Forgot password function
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;
    await user.save();

    // Send email
    await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

    res.status(200).json({ success: true, message: "Password reset link sent to your email" });
  } catch (error) {
    console.log("Error in forgotPassword ", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Reset password function
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

    // Update password
    const hashedPassword = await bcryptjs.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log("Error in resetPassword ", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Check authentication function
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in checkAuth ", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
