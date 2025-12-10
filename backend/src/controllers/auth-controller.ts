import { Request, Response } from "express";
import bcrypt from "bcryptjs";


import User from "../models/user-model";
import { generateJWT } from "../helpers/generate-jwt-helper";
import { googleVerify } from "../helpers/google-verify-helper";
import { ok } from "assert";


export const loginUser = async (req: Request, res: Response): Promise<Response> => {

  const { email, password } = req.body;

  try {
    
    const userFound = await User.findOne({ where: { email } });
    if (!userFound) {
      return res.status(400).json({
        message: 'No existe una cuenta con este correo electrónico'
      });
    }

    
    if (userFound.status !== 'active') {
      return res.status(400).json({
        message: 'Tu cuenta no está activada. Revisa tu correo para activarla'
      });
    }

    
    const validPassword = bcrypt.compareSync(password, userFound.password);
    if (!validPassword) {
      return res.status(400).json({
        message: 'La contraseña es incorrecta'
      });
    }

    
    const token = await generateJWT(userFound.idUser);

    return res.json({
      msg: 'Login successful - User authenticated',
      userFound,
      token
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Error del servidor. Por favor intenta nuevamente'
    });
  }
};



export const googleSignIn = async (req: Request, res: Response): Promise<Response> => {


  const { id_token } = req.body; //Expect to receive a google id_token from the client through a POST request

  try {
    
    const {email, name, surname} = await googleVerify(id_token);


    let user = await User.findOne({ where: { email } });

    if (!user) {

      const data = {
        dni: null,
        name,
        surname,
        email,
        password: ':P', 
        isMember: false, 
        registrationDate: new Date(),
        status: 'active' 
      }

      user = await User.create(data);
      await user.save();


    }


    if (user.status !== 'active') {
      return res.status(401).json({
        message: 'Tu cuenta no está activada. Contacta al administrador'
      });
    }


  
    const token = await generateJWT(user.idUser);



    return res.json({
      user,
      token
    });



  } catch (error) {
    
    console.log(error);
    return res.status(400).json({
      message: 'Token de Google inválido. Por favor intenta nuevamente'
    });

  }



};