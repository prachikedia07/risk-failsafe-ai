import {Router} from 'express';
import {healthCheck} from './health.controller';

const router = Router();

router.get("/db", healthCheck);

export default router;