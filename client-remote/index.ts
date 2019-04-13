import Express from 'express';
import axios, { AxiosResponse, AxiosError } from 'axios';
import bodyParser = require('body-parser');

// Variables
let localClientIpAddress: string | null = null;
const ROUTES = {
    forward: /\/forward\/.+$/,
    localClientIp: '/local-client-ip',
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
                params: req.params,
                headers: req.headers,
                method,
                url: req.path.replace('/forward', ''),
                data: req.body,
            });
            res.status(forwardResponse.status);
            res.send(forwardResponse.data);
        } catch (err) {
            const axiosError = err as AxiosError;
            if (!axiosError.response) {
                res.status(500);
                res.send({ error: 'Unknown error' });
            } else {
                res.status(axiosError.response.status);
                res.send(axiosError.response.data);
            }
        }
    };
}

function auth(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    next();
}

function logger(req: Express.Request, _: Express.Response, next: Express.NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
}

// Web page
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Forward request to client-local
app.get(ROUTES.forward, auth, logger, forwardRequest('GET'));
app.post(ROUTES.forward, auth, logger, forwardRequest('POST'));
app.put(ROUTES.forward, auth, logger, forwardRequest('PUT'));
app.delete(ROUTES.forward, auth, logger, forwardRequest('DELETE'));

// Local client IP address
app.post(ROUTES.localClientIp, auth, logger, (req, res) => {
    localClientIpAddress = req.query.ipAddress || null;
    res.status(200);
    res.send({ ipAddress: localClientIpAddress });
});
app.get(ROUTES.localClientIp, auth, logger, (_, res) => {
    res.status(200);
    res.send({ ipAddress: localClientIpAddress });
})

const port = 8000;
app.listen(port, () => console.log(`Started on port ${port}`));
