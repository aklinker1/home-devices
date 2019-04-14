export default interface DeviceInfo {
    id: string;
    name: string;
    type: 'device_hub' | 'garden_master' | 'garden_slave';

    endpoints: ['GET'|'POST'|'PUT'|'DELETE', string][];
    data?: any;
}
