import { Router } from 'express';

const router = Router();

/**
 * Central route aggregator
 * All feature routes are registered here
 * Note: Auth routes are mounted directly in server.ts
 */

// Debug endpoint to list registered routes (for development only)
router.get('/_routes', (_req, res) => {
	try {
		const routes: string[] = [];
		(router as any).stack.forEach((layer: any) => {
			if (layer.route && layer.route.path) {
				const methods = Object.keys(layer.route.methods).join(',');
				routes.push(`${methods.toUpperCase()} ${layer.route.path}`);
			} else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
				// mounted child router
				layer.handle.stack.forEach((child: any) => {
					if (child.route && child.route.path) {
						const methods = Object.keys(child.route.methods).join(',');
						routes.push(`${methods.toUpperCase()} ${layer.regexp} -> ${child.route.path}`);
					}
				});
			}
		});
		res.json({ routes });
	} catch (err) {
		res.status(500).json({ error: 'Failed to enumerate routes', details: String(err) });
	}
});

export default router;
