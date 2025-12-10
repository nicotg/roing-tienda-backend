import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

export const validateFields = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  // If there are validation errors, respond with 400 and the errors
  if (!errors.isEmpty()) {
    
    console.error('Request validation failed:', errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }
  
  // If there are no validation errors, proceed to the next middleware or controller
  next();
};