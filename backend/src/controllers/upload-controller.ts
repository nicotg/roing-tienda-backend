
import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";


const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// ✅ CORREGIDO: Exportar la función correctamente
export const uploadImage = (req: Request, res: Response): void => {
  // Middleware de multer para manejar la subida
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ 
        message: "Error subiendo imagen", 
        error: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó imagen" });
    }

    // Retornar la URL de la imagen (accesible desde el frontend)
    const imageUrl = `/uploads/${req.file.filename}`;
    
    return res.status(200).json({
      message: "Imagen subida exitosamente",
      url: imageUrl,
      filename: req.file.filename
    });
  });
};