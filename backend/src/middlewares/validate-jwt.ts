import { Request, Response, NextFunction } from "express";

// Local request type that includes authenticated user id
interface AuthRequest extends Request {
  userId?: string;
}
import jwt from "jsonwebtoken";
import User from "../models/user-model";

// Basic auth: verifies JWT and attaches userId to request. Accepts 'x-token' or 'Authorization: Bearer ...'
export const requireAuth = (req: Request,res: Response,next: NextFunction): void => {
  try {
    
    const token = req.header("x-token"); 
    

    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    ) as { userId: string };
    
  (req as AuthRequest).userId = decoded.userId;
    next();
  
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }

};


export const validateJWT = async (req: Request,res: Response,next: NextFunction): Promise<void> => {
  const token = req.header("x-token"); 
  if (!token) {
    res.status(401).json({
      message: "No token provided",
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    ) as { userId: string };
    const { userId } = decoded;
    const idToDelete = req.params.id;

    const userToValidate = await User.findByPk(userId);
    if (!userToValidate) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    
    if (userToValidate.role !== "admin") {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      
      return;
    }

    if (userToValidate.status === "deleted") {
      res.status(404).json({
        message: "User not found or already deleted",
      });
      
      return;

    }

    if (userId !== idToDelete && userToValidate.role !== "admin") {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      message: "Invalid token",
    });

    return;

  }
};

export const allowAdminOrReceptionist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.header("x-token");
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    ) as { userId: string };
    const { userId } = decoded;
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.role !== "admin" && user.role !== "receptionist") {
      res.status(403).json({
        message: "You do not have permission to update products",
      });
      return;
    }
    if (user.status === "deleted") {
      res.status(404).json({ message: "User not found or already deleted" });
      return;
    }
 
  (req as AuthRequest).userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
