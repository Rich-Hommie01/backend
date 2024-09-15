import { check } from "express-validator";

export const signupValidationRules = () => {
  return [
    check("username", "Username is required").notEmpty(),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
    check("name", "Name is required").notEmpty(),
    // Optional email check if needed
    // check("email", "Please enter a valid email").optional().isEmail(),
  ];
};

export const validateSignup = [
  check("username", "Username is required").notEmpty(),
  check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
  check("name", "Name is required").notEmpty(),
  // Optional email check if needed
  // check("email", "Please enter a valid email").optional().isEmail(),
];

export const loginValidationRules = () => {
  return [
    check("username", "Username is required").notEmpty(),
    check("password", "Password is required").notEmpty(),
  ];
};

export const validateLogin = [
  check("username", "Username is required").notEmpty(),
  check("password", "Password is required").notEmpty(),
];
