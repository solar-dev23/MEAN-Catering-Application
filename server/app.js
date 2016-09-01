/**
 * Main application file
 */

'use strict';

import express from 'express';
import mongoose from 'mongoose';
import async from 'async';
mongoose.Promise = require('bluebird');
import config from './config/environment';
import http from 'http';
var bodyParser = require("body-parser");
var mailer = require('./api/mailer/mailer');
var schedule = require('node-schedule');

const stripeController = require('./api/payments/stripe.controller');

var rule = new schedule.RecurrenceRule();
rule.minute = 0;
rule.hour = 23;

// Connect to MongoDB
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function(err) {
  console.error('MongoDB connection error: ' + err);
  process.exit(-1);
});

// Populate databases with sample data
if (config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var server = http.createServer(app);
var socketio = require('socket.io')(server, {
  serveClient: config.env !== 'production',
  path: '/socket.io-client'
});
require('./config/socketio').default(socketio);
require('./config/express').default(app);
require('./routes').default(app);

var j = schedule.scheduleJob(rule, function(){
  mailer.report();
});

var paymentJobs = schedule.scheduleJob('*/30 * * * *', function() {
  var moment = +Date.now();
  var next72h = new Date(moment + 72 * 60 * 60 * 1000);
  var next24h = new Date(moment + 24 * 60 * 60 * 1000);
  var promises = [];

  console.log('job started', moment);

  promises.push(mongoose.model('Event').find({
    status: 'confirmed',
    paymentStatus: {
      $nin: ['hold', 'paid']
    },
    date: {
      $lte: next72h
    }
  }).then(function(events) {
    return events.map(event => {
      return mongoose.model('Offer').find({
        status: 'confirmed',
        eventId: event._id
      }).then(function(offers) {
        return offers.map(offer => stripeController.$auth(offer._id).then(response => console.log('JOB', response)));
      });
    })
  }));
  promises.push(mongoose.model('Event').find({
    status: 'confirmed',
    paymentStatus: {
      $in: ['hold']
    },
    date: {
      $lte: next24h
    }
  })
  .then(function(events) {
    _.each(events, (event) => {
      event.blocked = true;
      event.save();
    });
    return events;
  })
  .then(function(events) {
    return events.map(event => {
      console.log('block by job', event.name, event.blocked);
      return mongoose.model('Offer').find({
        status: 'confirmed',
        eventId: event._id
      }).then(function(offers) {
        return offers.map(offer => stripeController.$capture(offer._id).then(response => console.log('JOB2', response)));
      });
    })
  }));
  return Promise.all(promises);
});

function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
  });
}

setImmediate(startServer);

// Expose app
exports = module.exports = app;
