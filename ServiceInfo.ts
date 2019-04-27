export default interface ServiceInfo {
    id: string;
    device: 'klinker-server' | 'Node MCU #1' | 'RPi Zero W #1';
    type: 'device_hub' | 'garden_master' | 'garden_slave';

    endpoints: ['GET'|'POST'|'PUT'|'DELETE', string][];
    data?: any;
}
