import { Router } from "express";
import { uploadImage } from "../controllers/upload-controller";
import { validateJWT } from "../middlewares/validate-jwt";

const router = Router();

router.post("/upload", [validateJWT], uploadImage);

export default router;
