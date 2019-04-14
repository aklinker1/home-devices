export default interface DeviceInfo {
    id: string;
    name: string;
    type: 'device_hub' | 'watering_system_master' | 'watering_system_slave';

    endpoints: ['GET'|'POST'|'PUT'|'DELETE', string][];
    data?: any;
}
