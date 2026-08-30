const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("Email already in use");
  }

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user._id);

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

module.exports = { registerUser, loginUser };
