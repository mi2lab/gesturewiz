'use strict';

const express = require('express'),
      expressApp = express(),
      bodyParser = require('body-parser'),
      serveStatic = require('serve-static'),
      http = require('http').Server(expressApp),
      io = require('socket.io')(http),
      ip = require('ip'),
      os = require('os'),
      path = require('path');

/*************
 * Cron Jobs *
 *************/

const CronJob = require('cron').CronJob;

const job = new CronJob('00 00 00 * * *', function() {
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

io.on('connection', function(socket) {
    socket.on('room', function(room) {
        
        // TODO do something
        console.log('New socket connection in room "' + room + '"');
        
    });
});

/***********/
/* Express */
/***********/

expressApp.set('port', 8080);
expressApp.use(serveStatic(path.join(__dirname, '../public')));
expressApp.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
expressApp.use(bodyParser.json({ limit: '50mb' }));

http.listen(expressApp.get('port'), function() {
    console.log('Express server listening on port ' + expressApp.get('port'));
});

/*****************/
/* IP & Hostname */
/*****************/

console.log('IP = ' + ip.address());
console.log('hostname = ' + os.hostname());
