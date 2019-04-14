const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
var globalJobs = [];

// Middleware
app.use(logger);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Endpoints
app.get('/', (req, res) => {
    res.status(200).send({
        api: 'Klinker Garden',
        time: Date.now(),
        version: '0.1.0'
    });
});

app.post('/water', (req, res) => {
    axios.post('http://192.168.0.22:80/water', req.body).then(axiosRes => {
        console.log(axiosRes.data);
        res.status(200).send(axiosRes.data);
    }).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
});

app.post('/schedule', (req, res) => {
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
