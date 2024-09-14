const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Mock user database
let users = [
  { id: 1, username: 'john_doe', password: 'password123', mfaEnabled: false, mfaSecret: null }
];

// Route to login user (initial)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  // Check if MFA is enabled for the user
  if (user.mfaEnabled) {
    return res.json({ mfaRequired: true, userId: user.id });
  } else {
    // If MFA is not enabled, set up MFA
    return res.json({ mfaSetupRequired: true, userId: user.id });
  }
});

// Route to set up MFA for first-time users
app.post('/api/auth/setup-mfa', (req, res) => {
  const { userId } = req.body;
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({ length: 20 });
  user.mfaSecret = secret.base32; // Store the base32 secret

  // Generate QR code for TOTP setup
  qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
    res.json({ success: true, qrCode: dataUrl });
  });
});

// Route to verify MFA setup with OTP
app.post('/api/auth/verify-mfa-setup', (req, res) => {
  const { userId, otp } = req.body;
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }

  // Verify the OTP using speakeasy
  const isVerified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: otp,
  });

  if (isVerified) {
    user.mfaEnabled = true; // Mark the user as MFA-enabled
    return res.json({ success: true, message: 'MFA setup complete' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

// Route to verify MFA during login
app.post('/api/auth/verify-mfa', (req, res) => {
  const { userId, otp } = req.body;
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }

  // Verify OTP using the stored secret
  const isVerified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: otp,
  });

  if (isVerified) {
    return res.json({ success: true, message: 'Login successful', user });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
