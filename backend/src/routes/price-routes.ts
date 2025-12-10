import { Router } from 'express';
import { check } from 'express-validator';
import { createPrice, getProductPrices, updatePrice } from '../controllers/price-controller';
import { validateFields } from '../middlewares/validate-fields';
import { validateJWT } from '../middlewares/validate-jwt';

const router = Router();

router.post("/:idProduct/create", [
  validateJWT,
  check('value', 'Value must be a positive integer').isInt({ min: 0 }),
  validateFields
], createPrice);

router.get("/:idProduct/prices", getProductPrices);

router.put("/:idProduct/update/:updateDate", [
  validateJWT,
  check('value', 'Value must be a positive integer').isInt({ min: 0 }),
  validateFields
], updatePrice);

export default router;