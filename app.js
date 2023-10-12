/*
Author      : Nandhitha Ulaganathan
Description : This is the main application file (app.js).It sets up an Express server for user authentication and other routes.
Date        : 12-10-2023
*/

const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();
const path       = require('path');
const fs         = require('fs');

app.use(bodyParser.urlencoded({extended:false}));
// parse application/json
app.use(bodyParser.json());

const routes     = require('./routes.js');
const port       = 7025;
const logDir     = 'logs';

routes.apiRoutes(app);

// Create the log directory if it doesn't exist.
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Middleware to log operations and create log files.
app.use((req, res, next) => {
    const user = req.header('user'); // You can customize this based on your authentication system
    const operation = req.originalUrl;
    const logFilename = path.join(logDir, `log_${Date.now()}.txt`);

    fs.appendFile(logFilename, `${user}: ${operation}\n`, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });

    next();
});

// API endpoint to retrieve recent logs
app.get('/logs', (req, res) => {
    const files = fs.readdirSync(logDir);
    const currentTimestamp = Date.now();

    const recentLogs = files
        .filter(file => {
            const filePath = path.join(logDir, file);
            const fileStat = fs.statSync(filePath);
            return currentTimestamp - fileStat.ctime.getTime() <= 300000; // 5 minutes in milliseconds
        })
        .map(file => {
            const filePath = path.join(logDir, file);
            return fs.readFileSync(filePath, 'utf8');
        });

    res.json(recentLogs);
});

// Automatic deletion of log files older than 30 minutes
setInterval(() => {
    const files = fs.readdirSync(logDir);
    const currentTimestamp = Date.now();

    files.forEach(file => {
        const filePath = path.join(logDir, file);
        const fileStat = fs.statSync(filePath);

        if (currentTimestamp - fileStat.ctime.getTime() > 1800000) { // 30 minutes in milliseconds
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting log file:', err);
                }
            });
        }
    });
}, 60000); // Run every minute
app.listen(port, function() {
  console.log(`The server runs at port : ${port}`);
})