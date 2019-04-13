import Express from 'express';
import axios, { AxiosResponse } from 'axios';
import bodyParser = require('body-parser');
let localClientIpAddress: string | null = null;

const app = Express();
app.use(bodyParser.json());

// Web page
app.get('/', (req, res) => {
    res.sendFile('index.html');
});

// Forward request to device
app.get('/forward/device/:deviceId', forwardRequest('GET'));
app.post('/forward/device/:deviceId', forwardRequest('POST'));
app.put('/forward/device/:deviceId', forwardRequest('PUT'));
app.delete('/forward/device/:deviceId', forwardRequest('DELETE'));
function forwardRequest(method: string) {
    return async (req: Express.Request, res: Express.Response) => {
        if (localClientIpAddress == null) {
            res.status(502); // Bad Gateway
            res.send({
                error: 'Local IP address not cached. Try again in half an hour.',
            });
            return;
        }

        const forwardResponse: AxiosResponse<any> = await axios.request({
            baseURL: `http://${localClientIpAddress}:8000`,
            params: req.params,
            headers: req.headers,
            method,
            url: req.path.replace('/forward', ''),
            data: req.body,
        })
    };
}

// Get all Devices

app.listen(8000, () => console.log(`Example app listening on port 8000!`));