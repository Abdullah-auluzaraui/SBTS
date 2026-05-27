import jwt from 'jsonwebtoken';

const generateToken = (user: any): string => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRE || '30d') as jwt.SignOptions['expiresIn'] }
  );
};

export default generateToken;
