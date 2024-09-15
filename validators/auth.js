import { body, validationResult } from "express-validator";

// Signup validation rules
export const signupValidationRules = () => [
  body("username").notEmpty().withMessage("Username is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  // If you don't require email, remove or make it optional
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
];

// Login validation rules
export const loginValidationRules = () => [
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Validation handler
export const validateSignup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
