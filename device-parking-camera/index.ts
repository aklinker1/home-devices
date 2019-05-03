import Express from 'express';
import bodyParser from 'body-parser';
import ServiceInfo from '../ServiceInfo';
import { spawnSync } from 'child_process';

const app = Express();

const DEVICE_INFO: ServiceInfo = {
    id: 'parking-camera',
    device: 'parking-camera',
    type: 'still_camera',
    endpoints: [
        // https://www.raspberrypi.org/documentation/raspbian/applications/camera.md
        ['GET', '/image?flipX=[boolean|false]&flipY=[boolean|false]&width=[0-2592|2592]&quality[0-100|75]&exposure=[auto,night,snow,verylong|auto]'],
    ],
}
const MIN_WIDTH = 1,   MAX_WIDTH = 2592,  DEFAULT_WIDTH = 2592;
const MIN_HEIGHT = 1,  MAX_HEIGHT = 1944, DEFAULT_HEIGHT = 1944;
const MIN_QUALITY = 1, MAX_QUALITY = 100, DEFAULT_QUALITY = 75;
const VALID_EXPOSURE = ['auto', 'night', 'snow', 'verylong'];

// Middleware
app.use(logger);
app.use(bodyParser.json());

function logger(req: Express.Request, _: Express.Response, next: Express.NextFunction) {
    console.log(`${req.method} ${req.path}`);
    next();
}

// Endpoints
app.get('/discover', (req: Express.Request, res: Express.Response) => {
    res.status(200).send(DEVICE_INFO);
});

app.get('/image', (req: Express.Request, res: Express.Response) => {
    const flipX = req.query.flipX === 'true';
    const flipY = req.query.flipY === 'true';
    const width =   getIntQuery(req.query.width,   MIN_WIDTH,   MAX_WIDTH,   DEFAULT_WIDTH);
    const height =  getIntQuery(req.query.height,  MIN_HEIGHT,  MAX_HEIGHT,  DEFAULT_HEIGHT);
    const quality = getIntQuery(req.query.quality, MIN_QUALITY, MAX_QUALITY, DEFAULT_QUALITY);
    const exposure = VALID_EXPOSURE.includes(req.query.exposure) ? req.query.exposure : null;
    
    const args = ['-o', `${__dirname}/image.jpg`];
    if (flipX) args.push('-fx');
    if (flipY) args.push('-fy');
    args.push(`-w ${width}`);
    args.push(`-h ${height}`);
    args.push(`-q ${quality}`);
    if (exposure) args.push(`-ex ${exposure}`);

    spawnSync('raspistill', args, {
        cwd: __dirname
    });
    res.sendFile(`${__dirname}/image.jpg`);
});

// Utilties
function getIntQuery(value: string, min: number, max: number, defaultInt: number): number {
    const parsed = value ? parseInt(value) : NaN;
    return isNaN(parsed) ? defaultInt : Math.min(min, Math.max(max, parsed));
}

const port = 8080;
app.listen(port, async () => {
    console.log(`Started on port ${port}\n`);
});
