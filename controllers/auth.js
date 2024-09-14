// controllers/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js'; // Assuming you have a User model
const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

// Login function
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with the token and user details
    res.json({
      message: 'Login successful',
      token,
      user: {
        name: user.name,
        lastLogin: user.lastLogin,
      },
    });

    // Optionally, update lastLogin field in the database
    user.lastLogin = Date.now();
    await user.save();

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Signup function
export const signup = async (req, res) => {
  const { username, password, name } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ username, password: hashedPassword, name });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check JWT token
export const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication failed: No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Authentication failed: Invalid token.' });
  }
};

// Logout function (optional)
export const logout = (req, res) => {
  // Optionally, handle logout by deleting session or token client-side
  res.status(200).json({ message: 'Logged out successfully' });
};
