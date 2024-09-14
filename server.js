import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import speakeasy from "speakeasy"; // Use ES6 imports
import qrcode from "qrcode"; // Use ES6 imports

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

// Route to generate MFA secret and return QR code
app.post('/generate-mfa', async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: 'YourAppName',
    length: 20
  });

  // Save the secret to the user's database (assuming userId is passed in request body)
  try {
    // Replace with actual database logic
    // Example: await User.findByIdAndUpdate(req.body.userId, { mfaSecret: secret.base32 });

    qrcode.toDataURL(secret.otpauth_url, (err, data) => {
      if (err) return res.status(500).send('Error generating QR code');
      res.json({ qrCode: data, secret: secret.base32 });
    });
  } catch (err) {
    res.status(500).send('Error saving MFA secret');
  }
});

// Connect to database first, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}).catch((error) => {
  console.log("Failed to connect to the database:", error);
});
