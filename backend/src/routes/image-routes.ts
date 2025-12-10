import { Router } from 'express';
import { check } from 'express-validator';
import { addImage, getProductImages, deleteImage } from '../controllers/image-controller';
import { validateFields } from '../middlewares/validate-fields';
import { validateJWT } from '../middlewares/validate-jwt';

const router = Router();

router.post("/:idProduct/add", [
  validateJWT,
  check('url', 'Image URL is required').notEmpty(),
  check('description', 'Description must be at most 255 characters').optional().isLength({ max: 255 }),
  validateFields
], addImage);

router.get("/:idProduct/images", getProductImages);

router.delete("/:idProduct/delete/:url", [
  validateJWT
], deleteImage);

export default router;