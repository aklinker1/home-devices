import Express from 'express';
import axios, { AxiosResponse, AxiosError } from 'axios';
import bodyParser = require('body-parser');
import request from 'request';

// Variables
let localClientIpAddress: string | null = null;
const ROUTES = {
    forward: /\/api\/forward\/.+$/,
    localClientIp: '/api/local-client-ip',
}

// Setup application
const app = Express();
app.use(bodyParser.json());

// Helper functions
function forwardRequest(req: Express.Request, res: Express.Response) {
    req.pipe(request({
        baseUrl: `http://${localClientIpAddress}:8080`,
        url: req.path.replace('/api', '').replace('/forward', ''),
        qs: req.query
    })).pipe(res)
}

function logger(req: Express.Request, _: Express.Response, next: Express.NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
}

// Forward request to client-local
app.get(ROUTES.forward, logger, forwardRequest);
app.post(ROUTES.forward, logger, forwardRequest);
app.put(ROUTES.forward, logger, forwardRequest);
app.delete(ROUTES.forward, logger, forwardRequest);

// Local client IP address
app.post(ROUTES.localClientIp, logger, (req, res) => {
    localClientIpAddress = req.query.ipAddress || null;
    res.status(200).send({ ipAddress: localClientIpAddress });
});
app.get(ROUTES.localClientIp, logger, (_, res) => {
    res.status(200).send({ ipAddress: localClientIpAddress });
});

// All Other endpoints
const unknownEndpoint = (req: Express.Request, res: Express.Response) => res.status(404).send({ error: req.method + ' ' + req.path + ' not found' })
app.get(/.*/, logger, unknownEndpoint);
app.post(/.*/, logger, unknownEndpoint);
app.put(/.*/, logger, unknownEndpoint);
app.delete(/.*/, logger, unknownEndpoint);

const port = 8000;
app.listen(port, () => console.log(`Started on port ${port}`));
