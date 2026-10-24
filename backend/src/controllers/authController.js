const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { sendError, handleError, isEmail, isNonEmptyString } = require('../utils/errors');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!isNonEmptyString(name))  return sendError(res, 400, 'Please enter your name.');
    if (!isNonEmptyString(email)) return sendError(res, 400, 'Please enter your email address.');
    if (!isEmail(email))          return sendError(res, 400, 'That email address does not look valid (example: name@example.com).');
    if (typeof password !== 'string' || password.length === 0) {
      return sendError(res, 400, 'Please choose a password.');
    }
    if (password.length < 6)      return sendError(res, 400, 'Password must be at least 6 characters long.');
    if (name.trim().length > 60)  return sendError(res, 400, 'Name must be 60 characters or fewer.');

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      return sendError(res, 409, 'An account with this email already exists. Try signing in instead.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ id, name: name.trim(), email: cleanEmail, password: hashedPassword }])
      .select('id, name, email, created_at')
      .single();

    if (error) throw error;

    const token = generateToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return handleError(res, err, 'register');
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email))    return sendError(res, 400, 'Please enter your email address.');
    if (typeof password !== 'string' || !password) return sendError(res, 400, 'Please enter your password.');

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    // A real database failure is NOT a wrong password — report it honestly.
    if (error) throw error;

    // Same message for "no such user" and "wrong password" (don't reveal which emails exist)
    if (!user) return sendError(res, 401, 'Incorrect email or password.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, 401, 'Incorrect email or password.');

    const token = generateToken(user);
    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err) {
    return handleError(res, err, 'login');
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return sendError(res, 401, 'Your account no longer exists. Please sign in again.');

    return res.json({ user });
  } catch (err) {
    return handleError(res, err, 'getMe');
  }
};

module.exports = { register, login, getMe };
