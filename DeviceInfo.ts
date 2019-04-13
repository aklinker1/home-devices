export default interface DeviceInfo {
    id: string;
    type: 'device_hub' | 'watering_system';

    endpoints: ['GET'|'POST'|'PUT'|'DELETE', string][];
    data?: any;
}