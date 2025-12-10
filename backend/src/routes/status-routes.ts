import { Router } from 'express';
import { createStatus, updateStatus } from '../controllers/status-controller';
import { allowAdminOrReceptionist } from '../middlewares/validate-jwt';
import { validateFields } from '../middlewares/validate-fields';
import { check } from 'express-validator';

const router = Router();

router.post(
  "/:idOrder/create",
  [
    allowAdminOrReceptionist,
    check('description', 'Description is required').notEmpty(),
    validateFields
  ],
  createStatus
);

router.post(
  "/:idOrder/update",
  [allowAdminOrReceptionist,
  check('description', 'Description is required').notEmpty()],
  updateStatus
  )
export default router;