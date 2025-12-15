import { app } from '../src/index';

// Vercel Serverless Function wrapper for Fastify
export default async function handler(req: any, res: any) {
    await app.ready();
    app.server.emit('request', req, res);
}
