

export const updateBalance = async (req, res) => {
  const { userId, amount } = req.body; // We will send userId and amount from the frontend

  try {
    const user = await User.findById(userId); // Find the user by their ID
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update the user's balance by adding the amount
    user.balance += amount;

    // Save the updated user object in the database
    await user.save();

    res.status(200).json({
      success: true,
      message: "Balance updated successfully",
      balance: user.balance, // Return the updated balance to the frontend
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
