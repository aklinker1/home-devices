import Express from 'express';
import axios, { AxiosResponse, AxiosError, AxiosPromise } from 'axios';
import bodyParser = require('body-parser');
import os from 'os';

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

// Variables
let connectedDevices: { [id: string]: ConnectedDevice };
const ROUTES = {
    device: '/device/:deviceId',
    devices: '/devices',
}
const ALLOWED_PORTS = [
    8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009,
]

// Setup application
const app = Express();
app.use(bodyParser.json());

// Helper functions
function forwardRequest(method: string) {
    return async (req: Express.Request, res: Express.Response) => {

    };
}

async function getExternalIpAddress(): Promise<string> {
    return '';
}

async function updateConnectedDevices(): Promise<void> {
    for (let i = 1; i <= 255; i++) {
        for (let p of ALLOWED_PORTS) {
            try {
                const device: AxiosPromise<Device> = await axios.get(`http://192.168.0.${i}:${p}/discover`);
                const connectedDevice: ConnectedDevice = {
                    ...device,
                    port: p,
                    subNetAddress: i
                }
            } catch (err) {

            }
        }
    }
}

// Devices Request
app.get(ROUTES.devices, (req, res) => {
    
});

const port = 8080;
app.listen(port, () => console.log(`Started on port ${port}`));
