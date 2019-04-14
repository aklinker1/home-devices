import Express from 'express';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import axios, { AxiosResponse } from 'axios';
import DeviceInfo from '../DeviceInfo';

const app = Express();
var globalJobs: cron.ScheduledTask[] = [];
const DEVICE_INFO: DeviceInfo = {
    id: 'watering-system-master',
    name: 'Watering System Schedular',
    type: 'watering_system_master',
    endpoints: [
    ]
}

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
        const response: AxiosResponse = await axios.post(`http://${req.params.slaveIpAndPort}/water`, req.body);
        res.status(200).send(response.data);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/schedule', (req: Express.Request, res: Express.Response) => {
    console.log('canceling current jobs...');
    globalJobs.forEach(job => {
        job.stop();
    })
    console.log('starting new jobs...');
    let jobs = convertScheduleToJobs(req.body);
    jobs.forEach(job => {
        let scheduled = cron.schedule(job.job, () => {
            axios
                .post('http://192.168.0.22:80/water', job.pumps)
                .then(_ => {
                    console.log('Success!');
                })
                .catch(err => {
                    console.log('Error:', err);
                });
        });
        scheduled.start();
        globalJobs.push(scheduled);
    });
    console.log('scheduled!');
    res.sendStatus(200);
});

// Start
const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

// Helpers
function convertScheduleToJobs(days) {
    let numeric = [
        days.sunday,
        days.monday,
        days.tuesday,
        days.wednesday,
        days.thursday,
        days.friday,
        days.saturday,
    ];

    let jobs = [];
    for (let day = 0; day < numeric.length; day++) {
        if (numeric[day] !== undefined) {
            for (let time = 0; time < numeric[day].length; time++) {
                let dayOfWeek = day;
                let hour = numeric[day][time].hour;
                let minute = numeric[day][time].min;
                let second = numeric[day][time].sec;
                let jobString = `${second} ${minute} ${hour} * * ${dayOfWeek}`;
                jobs.push({
                    pumps: numeric[day][time].pumps,
                    job: jobString
                });
            }
        }
    }

    return jobs;
}
