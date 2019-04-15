import Express from 'express';
import axios, { AxiosResponse, AxiosError } from 'axios';
import bodyParser = require('body-parser');

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
function forwardRequest(method: string) {
    return async (req: Express.Request, res: Express.Response) => {
        if (localClientIpAddress == null) {
            res.status(502); // Bad Gateway
            res.send({
                error: 'Local IP address not cached',
            });
            return;
        }

        try {
            const forwardResponse: AxiosResponse<any> = await axios.request({
                baseURL: `http://${localClientIpAddress}:8080`,
                params: req.query,
                headers: req.headers,
                method,
                url: req.path.replace('/forward', '').replace('/api', ''),
                data: req.body,
            });
            res.status(forwardResponse.status);
            res.send(forwardResponse.data);
        } catch (err) {
            const axiosError = err as AxiosError;
            if (!axiosError.response) {
                res.status(500).send({ error: 'Unknown error' });
            } else {
                res.status(axiosError.response.status).send(axiosError.response.data);
            }
        }
    };
}

function logger(req: Express.Request, _: Express.Response, next: Express.NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
}

// Forward request to client-local
app.get(ROUTES.forward, logger, forwardRequest('GET'));
app.post(ROUTES.forward, logger, forwardRequest('POST'));
app.put(ROUTES.forward, logger, forwardRequest('PUT'));
app.delete(ROUTES.forward, logger, forwardRequest('DELETE'));

// Local client IP address
app.post(ROUTES.localClientIp, logger, (req, res) => {
    localClientIpAddress = req.query.ipAddress || null;
    res.status(200).send({ ipAddress: localClientIpAddress });
});
app.get(ROUTES.localClientIp, logger, (_, res) => {
    res.status(200).send({ ipAddress: localClientIpAddress });
});

// All Other endpoints
app.get(/.*/, logger, (req, res) => res.status(404).send({ error: req.path + ' not found' }));

const port = 8000;
app.listen(port, () => console.log(`Started on port ${port}`));
