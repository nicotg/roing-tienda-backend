import { Router } from 'express';
import { check } from 'express-validator';
import { googleSignIn, loginUser } from '../controllers/auth-controller';
import { validateFields } from '../middlewares/validate-fields';

const router = Router();

router.post("/login", [
  check('email', 'Email must be a valid one').isEmail(),
  check('password', 'Password is required').notEmpty(),
  validateFields
], loginUser);



router.post("/google-login", [
  check('id_token', 'ID token is required').notEmpty(),
  validateFields
], googleSignIn);


export default router;