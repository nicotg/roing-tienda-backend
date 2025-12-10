import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";




import User from "../models/user-model";

const STAFF_ROLES = ["admin", "receptionist"];

export const createUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { dni, email, name, surname, password, role } = req.body;
    
    let assignedRole = "client";
    let accountStatus = "pending";
    let activationToken: string | null = null;
    let activationTokenExpires: Date | null = null;



    const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : undefined;
    const normalizedDni =
      dni === undefined || dni === null || dni === ""
        ? undefined
        : Number(dni);

    if (normalizedDni !== undefined && Number.isNaN(normalizedDni)) {
      return res.status(400).json({ message: "Invalid DNI value" });
    }


    if (normalizedRole && normalizedRole !== "client") {
      if (!STAFF_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ message: "Invalid role provided" });
      }

      const token = req.header("x-token");
      if (!token) {
        return res.status(403).json({ message: "Admin token required to assign staff roles" });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { userId: string };
        const requestingUser = await User.findByPk(decoded.userId);

        if (!requestingUser || requestingUser.role !== "admin") {
          return res.status(403).json({ message: "Only admin users can assign staff roles" });
        }
      } catch (error: any) {
        return res.status(401).json({ message: "Invalid token", error: error.message });
      }

      assignedRole = normalizedRole;
      accountStatus = "active";
    }

    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    


    if (accountStatus === "pending") {
      activationToken = uuidv4(); 
      activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiration
    }


    const newUser = {
      idUser: uuidv4(),
      dni: normalizedDni,
      email,
      name,
      surname,
      password: hashedPassword,
      role: assignedRole,
      isMember: false,
      registrationDate: new Date(),
      status: accountStatus,
      activationToken,       
      activationTokenExpires,  
    };
    

   
    const userCreated = await User.create(newUser);

   
    if (accountStatus === "pending" && activationToken) {
      try {
        
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
        
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.error('Email credentials not found in environment variables');
          console.error('EMAIL_USER value:', process.env.EMAIL_USER);
          console.error('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');
          return res.status(500).json({
            message: "Email configuration error",
            error: "Missing email credentials",
          });
        }

        console.log('Creating email transporter...');
        const transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        
        await transporter.verify();
        console.log('Email transporter verified successfully');
    
        const activationUrl = `http://localhost:3000/api/users/activate/${activationToken}`;
    
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userCreated.email,
          subject: "Activa tu cuenta",
          html: `<p>Haz click <a href="${activationUrl}">aquí</a> para activar tu cuenta.</p>`,
        });
        
      } catch (error: any) {
          console.error('Email sending error:', error);
          return res.status(500).json({
            message: "Error sending activation email",
            error: error.message,
          });
      }
    }


   

    return res.status(201).json({
      message: "User created successfully",
      userCreated,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};



export const activateUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { activationToken: token } });

    if (!user || !user.activationTokenExpires || user.activationTokenExpires < new Date()) {
      
      return res.redirect(`http://localhost:5173/activate/${token}?error=invalid_token`);
    }

    user.status = "active";
    user.activationToken = null;
    user.activationTokenExpires = null;
    await user.save();


    return res.redirect(`http://localhost:5173/activate/${token}`);

  } catch (error: any) {
    
    return res.redirect(`http://localhost:5173/activate/${req.params.token}?error=server_error`);
  }
};







export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  try {


    
    const userToDelete = await User.findByPk(id);
    if (!userToDelete) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    userToDelete.status = "deleted";
    await userToDelete.save();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error deleting user",
      error: error.message,
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { name, surname, email, dni } = req.body;

  try {
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name !== undefined) userToUpdate.name = name;
    if (surname !== undefined) userToUpdate.surname = surname;
    if (email !== undefined) userToUpdate.email = email;

    if (dni !== undefined) {
      if (dni === "" || dni === null) {
        userToUpdate.dni = undefined;
      } else {
        const dniNumber = Number(dni);
        if (!Number.isNaN(dniNumber)) {
          userToUpdate.dni = dniNumber;
        } else {
          userToUpdate.dni = undefined;
        }
      }
    }

    await userToUpdate.save();

    return res.status(200).json({
      message: "User updated successfully",
      userToUpdate,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
   
    const authReq = req as (Request & { userId?: string });
    const userId = authReq.userId;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different than current password" });
    }
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(newPassword, salt);
    user.password = hashed;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Error updating password", error: error.message });
  }
};







export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
 
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    
    if (!user || user.status !== "active") {
      return res.status(404).json({ message: "User not found" });
    }



    
    const resetToken = uuidv4();
    user.passwordResetTokenHash = resetToken;
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour
    user.passwordResetTokenUsedAt = null;
    await user.save();



    
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    await transporter.verify();

    
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL && process.env.FRONTEND_BASE_URL.trim().length > 0
        ? process.env.FRONTEND_BASE_URL.trim().replace(/\/$/, "")
        : "http://localhost:5173";
    const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Restablecer contraseña",
      html: `<p>Haz click <a href="${resetUrl}">aquí</a> para restablecer tu contraseña.</p>`,
    });



    return res.status(200).json({ message: "Password reset email sent" });
  
  
  } catch (error: any) {
    return res.status(500).json({ message: "Error resetting password", error: error.message });
  }
}




export const updateForgottenPassword = async (req: Request, res: Response): Promise<Response> => {
  
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const user = await User.findOne({ where: { passwordResetTokenHash: token } });

    if (!user || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(newPassword, salt);
    user.password = hashed;
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    user.passwordResetTokenUsedAt = new Date();
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  
  } catch (error: any) {
    return res.status(500).json({ message: "Error updating password", error: error.message });
  }
};

