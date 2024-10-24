import { User } from '../models/user.js';

export const generateUniqueAccountNumber = async () => {
  const bankCode = '1998';
  let accountNumber;
  let exists = true;

  while (exists) {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000).toString();
    accountNumber = `${bankCode}${randomDigits}`;

    const user = await User.findOne({
      $or: [
        { "accounts.checking": accountNumber },
        { "accounts.savings": accountNumber }
      ]
    });
    
    if (!user) {
      exists = false;
    }
  }

  return accountNumber;
};
