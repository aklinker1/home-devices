import Express, { response } from 'express';
import axios, { AxiosResponse, AxiosError, AxiosPromise } from 'axios';
import bodyParser = require('body-parser');
import ServiceInfo from '../ServiceInfo';
import externalip from 'externalip';
import request from 'request';

type DeviceType = '' | '';
interface Device {
    id: string;
    type: DeviceType;
    endpoints: Array<['GET' | 'POST' | 'PUT' | 'DELETE', string]>
    data: any;
}
interface ConnectedDevice extends Device {
    /**
     * The final digit in the device's local network IP address: `127.0.0.???`
     */
    subNetAddress: number;
    /**
     * The port the device is running on.
     */
    port: number;
}
type ConnectedDeviceMap = { [id: string]: ConnectedDevice };

// Variables
let connectedDevices: ConnectedDeviceMap = {};
let remoteClientUrl = process.env.NODE_ENV === 'dev' ? 'http://localhost:8000' : 'https://home.aklinker1.io/api';
const DEVICE_INFO: ServiceInfo = {
    id: 'device_hub',
    device: 'klinker-server',
    type: 'device_hub',
    endpoints: [
        ['GET', '/devices?refresh=[true]'],
        ['GET', '/devices/:deviceId'],

        ['GET', '/devices/:deviceId/*'],
        ['POST', '/devices/:deviceId/*'],
        ['PUT', '/devices/:deviceId/*'],
        ['DELETE', '/devices/:deviceId/*'],
    ]
}
const ROUTES = {
    device: '/devices/:deviceId',
    deviceForward: '/devices/:deviceId/*',
    devices: '/devices',
    discover: '/discover',
}
const ALLOWED_PORTS = [
    8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089,
]

// Setup application
const app = Express();
app.use(bodyParser.json());

// Helper functions
function forwardRequest(req: Express.Request, res: Express.Response) {
    const device = connectedDevices[req.params.deviceId];
    req.pipe(request({
        baseUrl: `http://192.168.0.${device.subNetAddress}:${device.port}`,
        url: req.path.replace(`/devices/${device.id}`, ''),
        qs: req.query
    })).pipe(res)
    // return async (req: Express.Request, res: Express.Response) => {
    //     const device = connectedDevices[req.params.deviceId];
    //     if (device == null) {
    //         res.status(502); // Bad Gateway
    //         res.send({
    //             error: 'Device not connected, try refreshing your device list',
    //         });
    //         return;
    //     }

    //     try {
    //         const forwardResponse: AxiosResponse<any> = await axios.request({
    //             baseURL: `http://192.168.0.${device.subNetAddress}:${device.port}`,
    //             params: req.query,
    //             headers: req.headers,
    //             method,
    //             url: req.path.replace(`/devices/${device.id}`, ''),
    //             data: req.body,
    //         });
    //         for (const header in forwardResponse.headers) {
    //             res.setHeader(header, forwardResponse.headers[header]);
    //         }
    //         res.status(forwardResponse.status).send(forwardResponse.data);
    //     } catch (err) {
    //         const axiosError = err as AxiosError;
    //         if (!axiosError.response) {
    //             res.status(500).send({ error: 'Unknown error', stack: axiosError.stack });
    //         } else {
    //             res.status(axiosError.response.status).send(axiosError.response.data);
    //         }
    //     }
    // };
}

function logger(req: Express.Request, _: Express.Response, next: Express.NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
}

async function getReferenceIpAddress(): Promise<string> {
    if (process.env.NODE_ENV === 'dev') {
        return 'localhost';
    }
    return new Promise((resolve: (value: string) => void, reject: (err: any) => void) => {
        externalip((err: any, ip: string) => {
            if (err) reject(err);
            else resolve(ip);
        });
    });
}

// Discover Request
app.get(ROUTES.discover, logger, (_, res) => {
    res.status(200).send(DEVICE_INFO);
})

// Devices Request
app.get(ROUTES.devices, logger, async (req, res) => {
    if (req.query.refresh === 'true') {
        await updateConnectedDevices(true);
    }
    res.status(200).send(Object.values(connectedDevices));
});

app.get(ROUTES.device, logger, async (req, res) => {
    const device = connectedDevices[req.params.deviceId];
    if (device) {
        res.status(200).send(device);
    } else {
        res.status(400).send({ error: `Device with id=${req.params.deviceId} not found` });
    }
});

// Device forward request
app.get(ROUTES.deviceForward, logger, forwardRequest('GET'));
app.post(ROUTES.deviceForward, logger, forwardRequest('POST'));
app.put(ROUTES.deviceForward, logger, forwardRequest('PUT'));
app.delete(ROUTES.deviceForward, logger, forwardRequest('DELETE'));

// All Other endpoints
const unknownEndpoint = (req: Express.Request, res: Express.Response) => res.status(404).send({ error: req.method + ' ' + req.path + ' not found' })
app.get(/.*/, logger, unknownEndpoint);
app.post(/.*/, logger, unknownEndpoint);
app.put(/.*/, logger, unknownEndpoint);
app.delete(/.*/, logger, unknownEndpoint);

// Repeating Tasks
async function postExternalIpAddressToRemote() {
    console.log('Updating client-remote\'s client-local IP address');
    try {
        const ipAddress = await getReferenceIpAddress();
        console.log('IP Address: ' + ipAddress);
        await axios.post(`${remoteClientUrl}/local-client-ip`, undefined, { params: { ipAddress } });
        console.log('Success');
    } catch (err) {
        console.log('Failed to update client-remote with the current IP address');
    }
    setTimeout(postExternalIpAddressToRemote, 1 * 1000*60*60); // 1 hour
}

async function updateConnectedDevices(skipTimeout: boolean = false): Promise<void> {
    console.log('Updating device list... ');
    const addressesToScan: [number, number][] = [];
    for (let subNet = 1; subNet <= 255; subNet++) for (let port of ALLOWED_PORTS) {
        addressesToScan.push([subNet, port]);
    }
    async function scanAddress(subNetAddress: number, port: number): Promise<ConnectedDevice> {
        const device: AxiosResponse<Device> = await axios.get(
            `http://192.168.0.${subNetAddress}:${port}/discover`,
            { timeout: 10000 },
        );
        return { ...device.data, port, subNetAddress };
    }
    const discoverPromises: Array<Promise<ConnectedDevice | void>> = addressesToScan.map(address => {
        return scanAddress(address[0], address[1]).catch(_ => { /* Do nothing */ });
    });
    const results = (await Promise.all(discoverPromises)).filter(device => !!device) as ConnectedDevice[];
    const currentDevices: ConnectedDeviceMap = {}
    results.forEach(device => currentDevices[device.id] = device);
    connectedDevices = currentDevices;

    const deviceIds = Object.keys(connectedDevices)
    console.log(deviceIds.length + ' discovered');
    console.log(deviceIds);

    if (skipTimeout) {
        setTimeout(updateConnectedDevices, 30 * 1000 * 60); // 30 minutes
    }
}

const port = 8080;
app.listen(port, async () => {
    console.log(`Started on port ${port}\n`);
    await updateConnectedDevices();
    await postExternalIpAddressToRemote();
});
