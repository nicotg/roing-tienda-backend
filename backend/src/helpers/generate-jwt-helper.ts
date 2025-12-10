import jwt from 'jsonwebtoken';

export const generateJWT = (userId: string | number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload = { userId };
    
    // Sign the JWT
    jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'default_secret', 
      {
        expiresIn: '4h' // Token expires in 4 hours
      }, 
      (err, token) => {
        if (err) {
          console.error(err);
          reject('Error generating JWT');
        } else {
          resolve(token as string);
        }
      }
    );
  });
};