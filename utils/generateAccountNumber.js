import { User } from '../models/user.js';

/**
 * Generates a unique account number.
 * Format: [BankCode][Random 7 digits]
 * Example: "19981234567"
 */
export const generateUniqueAccountNumber = async () => {
  const bankCode = '1998'; // Replace with your actual bank code or prefix
  let accountNumber;
  let exists = true;

  while (exists) {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7-digit random number
    accountNumber = `${bankCode}${randomDigits}`;

    // Check if the account number already exists
    const user = await User.findOne({ accountNumber });
    if (!user) {
      exists = false;
    }
  }

  return accountNumber;
};
