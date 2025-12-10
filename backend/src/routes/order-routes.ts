import { Router } from 'express';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-fields';
import { allowAdminOrReceptionist, requireAuth, validateJWT } from '../middlewares/validate-jwt';
import { createOrderFromSession, getUserOrders, getOrders, getMonthlyWorth, getSportsStats, getStatusStats, buttonOfRegret } from '../controllers/order-controller';

const router = Router();


router.post(
    '/create-from-session',
    [
        check('session_id', 'session_id es requerido').notEmpty(),
        validateFields
    ],
    createOrderFromSession
);


router.get(
    '/user/:userId',
    getUserOrders
);


router.get(
    '/',
    
    (req, res, next) => next(),
   
    getOrders
);



router.get(
    '/worth',
    [validateJWT],
    getMonthlyWorth
);



router.get(
    '/sports',
    [validateJWT],
    getSportsStats
)



router.get(
    '/status',
    [validateJWT],
    getStatusStats
)

router.put(
    '/regret/:idOrder',
    [requireAuth],
    buttonOfRegret
);

export default router;
