import { Router } from 'express';
import { check } from 'express-validator';
import { createSize, getAllSizes, addSizeToProduct } from '../controllers/size-controller';
import { validateFields } from '../middlewares/validate-fields';
import { validateJWT } from '../middlewares/validate-jwt';

const router = Router();

router.post("/create", [
  validateJWT,
  check('sizeDesc', 'Size description is required').notEmpty(),
  check('gender', 'Gender is required').notEmpty(),
  validateFields
], createSize);

router.get("/all", getAllSizes);

router.post("/:idProduct/add/:idSize", [
  validateJWT
], addSizeToProduct);

export default router;