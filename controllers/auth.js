import bcryptjs from "bcryptjs";
import crypto from "crypto";
import speakeasy from 'speakeasy';


import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookies.js";
import { sendPasswordResetEmail, sendResetSuccessEmail, } from "../mailtrap/emails.js";
import { User } from "../models/user.js";

export const signup = async (req, res) => {
  const { email, password, name, username, address, dob, ssn, phone } = req.body;

  try {
    // Check if all required fields are provided
    if (!email || !password || !name || !username || !address || !dob || !ssn || !phone) {
      throw new Error("All fields are required");
    }

    // Check if the user already exists
    const userAlreadyExists = await User.findOne({ email });
    console.log("userAlreadyExists", userAlreadyExists);

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

export const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  // Check if user has MFA enabled
  if (user.isMfaEnabled) {
    return res.json({ mfaRequired: true, userId: user._id });
  }

  // If MFA is not enabled, prompt to enable it after login
  const secret = speakeasy.generateSecret({ name: 'YourAppName', length: 20 });
  user.mfaSecret = secret.base32;
  await user.save();

  qrcode.toDataURL(secret.otpauth_url, (err, data) => {
    if (err) return res.status(500).send('Error generating QR code');
    
    res.json({
      success: true,
      message: "Login successful, enable MFA by scanning QR code",
      qrCode: data,
      userId: user._id
    });
  });
};


export const verifyMfa = async (req, res) => {
  const { userId, token } = req.body;
  const user = await User.findById(userId);

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: token,
  });

  if (!verified) {
    return res.status(400).json({ success: false, message: "Invalid MFA token" });
  }

  // MFA successful, proceed with login
  generateTokenAndSetCookie(res, user._id);
  
  res.status(200).json({
    success: true,
    message: "MFA verified, logged in successfully",
    user: { ...user._doc, password: undefined },
  });
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
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    // send email
    await sendPasswordResetEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    );

    res
      .status(200)
      .json({
        success: true,
        message: "Password reset link sent to your email",
      });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    // update password
    const hashedPassword = await bcryptjs.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log("Error in resetPassword ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in checkAuth ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
