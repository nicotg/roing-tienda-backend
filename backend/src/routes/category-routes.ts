import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category-controller';
import { validateJWT } from '../middlewares/validate-jwt'; 

const router = Router();


router.get('/', getCategories);


router.get('/:id', getCategoryById);


router.post('/', validateJWT, createCategory);
router.put('/:id', validateJWT, updateCategory);
router.delete('/:id', validateJWT, deleteCategory);

export default router;