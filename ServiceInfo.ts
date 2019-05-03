export default interface ServiceInfo {
    id: string;
    device: 'klinker-server' | 'parking-camera' | 'Node MCU #1' | 'RPi Zero W #1';
    type: 'device_hub' | 'garden_master' | 'garden_slave' | 'still_camera';

    endpoints: ['GET'|'POST'|'PUT'|'DELETE', string][];
    data?: any;
}
