import Express from 'express';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import axios, { AxiosResponse } from 'axios';
import DeviceInfo from '../DeviceInfo';

interface Pump {
    pin: number;
    mL: number;
}
interface ScheduledPumping {
    pumps: Pump[];
    hour: number;
    min: number;
    sec: number;
}
interface WeekSchedule {
    sunday: ScheduledPumping[];
    monday: ScheduledPumping[];
    tuesday: ScheduledPumping[];
    wednesday: ScheduledPumping[];
    thursday: ScheduledPumping[];
    friday: ScheduledPumping[];
    saturday: ScheduledPumping[];
}

const app = Express();
var globalJobs: cron.ScheduledTask[] = [];
const DEVICE_INFO: DeviceInfo = {
    id: 'watering-system-master',
    name: 'Garden Schedular',
    type: 'garden_master',
    endpoints: [
        ['POST', '/water/:slaveIpAndPort'],
        ['GET', '/schedule/:slaveIpAndPort'],
        ['POST', '/schedule/:slaveIpAndPort'],
    ],
}
const schedules: { [slaveIpAndPort: string]: WeekSchedule} = {};

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

app.post('/water/:slaveIpAndPort', async (req: Express.Request, res: Express.Response) => {
    try {
        const slaveIpAndPort = req.params.slaveIpAndPort;
        const response: AxiosResponse = await axios.post(`http://${slaveIpAndPort}/water`, req.body);
        res.status(200).send(response.data);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/schedule/:slaveIpAndPort', (req: Express.Request, res: Express.Response) => {
    const slaveIpAndPort = req.params.slaveIpAndPort;
    const schedule = schedules[slaveIpAndPort];
    if (!schedule) {
        res.status(400).send({ error: slaveIpAndPort + ' does not have a schedule' });
        return;
    }
    res.status(200).send(schedule);
});
app.post('/schedule/:slaveIpAndPort', (req: Express.Request, res: Express.Response) => {
    const slaveIpAndPort = req.params.slaveIpAndPort;
    console.log('     - Canceling current jobs...');
    globalJobs.forEach(job => job.stop());
    console.log('     - Starting new jobs...');
    let jobs = convertScheduleToJobs(req.body, slaveIpAndPort);
    jobs.forEach(job => {
        let scheduled = cron.schedule(job.job, () => {
            axios
                .post('http://192.168.0.22:80/water', job.pumps)
                .catch(err => {
                    console.log('Error:', err);
                });
        });
        scheduled.start();
        globalJobs.push(scheduled);
    });
    schedules[slaveIpAndPort] = req.body;
    console.log('     - Scheduling done');
    res.sendStatus(200);
});

// Start
const port = 8081;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

// Helpers
type ScheduledJobs = Array<{
    pumps: Pump[];
    slaveIpAndPort: string;
    job: string;
}>;
function convertScheduleToJobs(days: WeekSchedule, slaveIpAndPort: string): ScheduledJobs {
    let numeric = [
        days.sunday,
        days.monday,
        days.tuesday,
        days.wednesday,
        days.thursday,
        days.friday,
        days.saturday,
    ];

    let jobs: ScheduledJobs = [];
    for (let day = 0; day < numeric.length; day++) {
        if (numeric[day] !== undefined) {
            for (let scheduledIndex = 0; scheduledIndex < numeric[day].length; scheduledIndex++) {
                let dayOfWeek = day;
                let hour = numeric[day][scheduledIndex].hour;
                let minute = numeric[day][scheduledIndex].min;
                let second = numeric[day][scheduledIndex].sec;
                let jobString = `${second} ${minute} ${hour} * * ${dayOfWeek}`;
                jobs.push({
                    pumps: numeric[day][scheduledIndex].pumps,
                    job: jobString,
                    slaveIpAndPort,
                });
            }
        }
    }

    return jobs;
}
