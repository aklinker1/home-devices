import Express from 'express';
import axios, { AxiosResponse, AxiosError, AxiosPromise } from 'axios';
import bodyParser = require('body-parser');
import DeviceInfo from '../DeviceInfo';

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
let connectedDevices: ConnectedDeviceMap;
const DEVICE_INFO: DeviceInfo = {
    id: 'device_hub',
    type: 'device_hub',
    endpoints: [
        ['GET', '/devices?refresh=[true]'],
    ]
}
const ROUTES = {
    device: '/device/:deviceId',
    devices: '/devices',
    discover: '/discover',
}
const ALLOWED_PORTS = [
    8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009,
    8080,
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
    const addressesToScan: [number, number][] = [];
    for (let subNet = 1; subNet <= 255; subNet++) for (let port of ALLOWED_PORTS){
        addressesToScan.push([subNet, port]);
    }
    async function scanAddress(subNetAddress: number, port: number): Promise<ConnectedDevice> {
        const device: AxiosResponse<Device> = await axios.get(
            `http://192.168.0.${subNetAddress}:${port}/discover`,
            { timeout: 1000 },
        );
        return { ...device.data, port, subNetAddress };
    }
    const discoverPromises: Array<Promise<ConnectedDevice | void>> = addressesToScan.map(address => {
        return scanAddress(address[0], address[1]).catch(err => { /* Do nothing */ });
    });
    const results = (await Promise.all(discoverPromises)).filter(device => !!device) as ConnectedDevice[];
    const currentDevices: ConnectedDeviceMap = {}
    results.forEach(device => currentDevices[device.id] = device);
    connectedDevices = currentDevices;
}

// Discover Request
app.get(ROUTES.discover, (_, res) => {
    res.status(200);
    res.send(DEVICE_INFO);
})

// Devices Request
app.get(ROUTES.devices, async (req, res) => {
    if (req.query.refresh === 'true') {
        await updateConnectedDevices();
    }
    res.status(200);
    res.send(Object.values(connectedDevices));
});

const port = 8080;
app.listen(port, async () => {
    console.log(`Started on port ${port}\n`);
    process.stdout.write('Updating device list... ');
    await updateConnectedDevices();
    const deviceIds = Object.keys(connectedDevices)
    console.log(deviceIds.length + ' discovered');
    console.log(deviceIds);
});