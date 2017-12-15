'use strict';

const express = require('express'),
    expressApp = express(),
    bodyParser = require('body-parser'),
    serveStatic = require('serve-static'),
    http = require('http').Server(expressApp),
    io = require('socket.io')(http),
    ip = require('ip'),
    os = require('os'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),

    // routes
    analysis = require('./routes/analysis'),
    gestures = require('./routes/gestures'),
    mturk = require('./routes/mturk');

/*************
 * Cron Jobs *
 *************/

const CronJob = require('cron').CronJob;

const job = new CronJob('00 00 00 * * *', function () {
        /* Runs every day at 12am. */

        // TODO do something
        console.log('Cron job executed.');

    }, function () {
        /* This function is executed when the job stops */
    },
    true, /* Start the job right now */
    'US/Michigan' /* Time zone of this job. */
);

/*************/
/* Socket IO */
/*************/

var gestures = {};
var lastRecognitionActive = {};
var numWorkers = {};

io.on('connection', function (socket) {
    socket.on('room', function (room) {
        if (!numWorkers[room]) {
            console.log('New room: ' + room);
        }

        socket.join(room);

        if (!numWorkers[room]) {
            numWorkers[room] = 0;
        }
        else {
            io.sockets.in(room).emit('mturk', {
                event: 'numWorkers',
                numWorkers: numWorkers[room]
            });
        }

        socket.on('mturk', function (msg) {
            io.sockets.in(room).emit('mturk', msg);

            if (msg.event) {
                switch (msg.event) {
                case 'newWorker':
                    numWorkers[room]++;

                    io.sockets.in(room).emit('mturk', {
                        event: 'numWorkers',
                        numWorkers: numWorkers[room]
                    });

                    socket.on('disconnect', function () {
                        numWorkers[room]--;

                        io.sockets.in(room).emit('mturk', {
                            event: 'numWorkers',
                            numWorkers: numWorkers[room]
                        });

                        io.sockets.in(room).emit('mturk', {
                            event: 'workerLost',
                            workerId: msg.workerId
                        });
                    });

                    break;
                }
            }
        });

        socket.on('real$1', function (msg) {
            io.sockets.in(room).emit('real$1', msg);

            if (msg.event) {
                switch (msg.event) {
                case 'gesture':
                    gestures[room] = msg.gesture;
                    break;
                case 'newWorker':
                    if (gestures[room]) {
                        io.sockets.in(room).emit('real$1', {
                            event: 'gesture',
                            gesture: gestures[room]
                        });
                    }

                    if (lastRecognitionActive[room]) {
                        io.sockets.in(room).emit('real$1', {
                            event: 'recognitionActive',
                            status: lastRecognitionActive[room]
                        });
                    }

                    numWorkers[room] = room in numWorkers ? numWorkers[room] + 1 : 1;

                    io.sockets.in(room).emit('real$1', {
                        event: 'workersChanged',
                        numWorkers: numWorkers[room]
                    });

                    socket.on('disconnect', function () {
                        io.sockets.in(room).emit('real$1', {
                            event: 'workerLost',
                            workerId: msg.workerId,
                            gesture: msg.gesture
                        });

                        numWorkers[room]--;
                        io.sockets.in(room).emit('real$1', {
                            event: 'workersChanged',
                            numWorkers: numWorkers[room]
                        });
                    });
                    break;
                case 'recognitionActive':
                    lastRecognitionActive[room] = msg.status;
                    break;
                }
            }
        });

        socket.on('webRTC', function (msg) {
            io.sockets.in(room).emit('webRTC', msg);
        });
    });

    socket.on('client', function (client) {
        console.log('New client: ' + client);
        socket.join(client);

        socket.on('real$1', function (msg) {
            io.sockets.in(client).emit('real$1', msg);
        });
    });
});

/***********/
/* Express */
/***********/

expressApp.set('port', 8080);
expressApp.use(serveStatic(path.join(__dirname, '../public')));
expressApp.use(bodyParser.urlencoded({
    extended: false,
    limit: '50mb'
}));
expressApp.use(bodyParser.json({
    limit: '50mb'
}));

http.listen(expressApp.get('port'), function () {
    console.log('Express server listening on port ' + expressApp.get('port'));
});

/*************
 * Endpoints *
 *************/

expressApp.get('/list', function (req, res) {
    var response = "";

    fs.readdir(__dirname + '/../public', function (err, files) {
        if (err) {
            throw err;
        }

        files.forEach(function (file) {
            response += (file + '\r\n');
        });

        res.contentType("text/plain");
        res.send(response);
    });
});

expressApp.get('/save', function (req, res) {
    var filePath;

    if (req.query && req.query.f) {
        filePath = __dirname + '/../public/study2_' + _.escape(req.query.f) + '.txt';
    }
    else {
        filePath = __dirname + '/../public/data.txt'; // make sure we point to the right dir!!!
    }

    if (req.query && req.query.gestures) {
        fs.appendFile(filePath, req.query.gestures + ',\r\n', function (err) {
            if (err) {
                res.send('{ success: false, err: ' + JSON.stringify(err) + ' }');
                return console.log(err);
            }

            console.log('New data written to: ' + filePath);
            res.send('{ success: true }');
        });
    }
});

var saveImgTmp = function (dataUrl) {
    // one-time set-up of "imgtmp" directory
    if (!fs.existsSync(imgTmpDir)) {
        fs.mkdirSync(imgTmpDir);
    }

    var ext = dataUrl.startsWith('data:image/png') ? '.png' : '.gif';

    var fileNameImg = Date.now() + '_' + Math.round(Math.random() * 9999) + ext;
    var filePathImg = imgTmpDir + '/' + fileNameImg;

    fs.writeFileSync(filePathImg, new Buffer(dataUrl.substring('data:image/png;base64,'.length), 'base64'));

    return '/temp/imgtmp/' + fileNameImg;
};

expressApp.post('/saveImgTmp', function (req, res) {
    if (!req.body.dataUrl) {
        res.send(JSON.stringify({
            error: 'No data URL provided.'
        }));

        return;
    }

    var fileName = saveImgTmp(req.body.dataUrl);

    res.send(JSON.stringify({
        fileName: fileName
    }));
});

expressApp.get('/analysis.csv', analysis.csv);
expressApp.get('/1vs1.csv', analysis.onevsone);
expressApp.get('/realtime.csv', analysis.realtime);

expressApp.get('/gestures/get', gestures.get);
expressApp.post('/gestures/delete', gestures.delete);
expressApp.post('/gestures/save', gestures.save);
expressApp.post('/gestures/saveBulk', gestures.saveBulk);

expressApp.post('/mturk/balance', mturk.balance);
expressApp.post('/mturk/grantBonus', mturk.grantBonus);
expressApp.post('/mturk/simpleQuestion', mturk.simpleQuestion);
expressApp.post('/mturk/externalQuestion', mturk.externalQuestion);
expressApp.post('/mturk/deleteHITs', mturk.deleteHITs);

/*****************/
/* IP & Hostname */
/*****************/

console.log('IP = ' + ip.address());
console.log('hostname = ' + os.hostname());