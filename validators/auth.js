import { body, validationResult } from "express-validator";

// Signup validation rules
export const signupValidationRules = () => {
  return [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("name").notEmpty().withMessage("Name is required"),
    body("username").notEmpty().withMessage("Username is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("dob").isDate().withMessage("Date of birth must be a valid date"),
    body("ssn")
      .matches(/^\d{3}-\d{2}-\d{4}$/)
      .withMessage("SSN must be in the format XXX-XX-XXXX"),
    body("phone")
      .matches(/^\+?\d{10,15}$/)
      .withMessage("Phone number must be valid"),
  ];
};

// Login validation rules
export const loginValidationRules = () => {
  return [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

// Middleware to handle validation results for signup
export const validateSignup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Middleware to handle validation results for login
export const validateLogin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
