import { Router, type IRouter } from 'express';
import weatherRoutes from './weather.routes.js';
import batchesRoutes from './batches.routes.js';

const router: IRouter = Router();

router.use('/weather', weatherRoutes);
router.use('/batches', batchesRoutes);

export default router;

