import express from "express";
import { login, updateBalance, getTransactions, logout, signup, checkUsername, forgotPassword, resetPassword, checkAuth } from "../controllers/auth.js";
import { signupValidationRules, validateSignup, loginValidationRules, validateLogin } from "../validators/auth.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/check-auth", verifyToken, checkAuth);
router.post("/signup", signupValidationRules(), validateSignup, signup);
router.post("/login", loginValidationRules(), validateLogin, login);
router.put("/balance", updateBalance); 
router.get("/transactions/:userId", getTransactions); 
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/check-username", checkUsername);

export default router;
