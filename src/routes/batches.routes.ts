import { Router, type IRouter } from 'express';
import * as batchesController from '../controllers/batches.controller.js';

const router: IRouter = Router();

/**
 * @swagger
 * /api/batches:
 *   get:
 *     summary: Get all batch metadata with status information
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Successfully retrieved batches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BatchMetadata'
 *       500:
 *         description: Internal server error
 */
router.get('/', batchesController.getAllBatchesHandler);

export default router;

