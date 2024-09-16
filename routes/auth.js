import express from "express";
import { login, updateBalance, logout, signup, forgotPassword, resetPassword, checkAuth } from "../controllers/auth.js";
import { signupValidationRules, validateSignup, loginValidationRules, validateLogin } from "../validators/auth.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/check-auth", verifyToken, checkAuth);

router.post("/signup", signupValidationRules(), validateSignup, signup);
router.post("/login", loginValidationRules(), validateLogin, login);
router.put("/balance", updateBalance); // Endpoint to update the balance
router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
