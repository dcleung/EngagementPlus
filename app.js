var express = require('express');
var session = require('client-sessions');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');



var routes = require('./routes/routes');

var app = express();
app.use(express.bodyParser());
app.use(express.logger("default"));
app.use(express.cookieParser());
app.use(express.session({
    secret : 'secret-token',
    username : null,
    balance : null
}));

// make sure that js files aren't cached by the browser
app.use(function(req, res, next) {
    res.setHeader("Cache-Control", "no-cache must-revalidate");
    next();
});

app.use(express.static(__dirname + '/public'));

app.use('/postnewjob', routes.postJob);
app.use('/about', routes.getAbout);
app.use('/visualizer', routes.getVisualizer);
app.use('/mine', routes.getMine);
app.use('/postnewaccount', routes.postAccount);
app.use('/checkaccount', routes.postCheck);
app.use('/signup', routes.getSignup);
app.use('/getDNA', routes.getDNA);
app.use('/posttransaction', routes.postTransaction);
app.use('/getMining', routes.getMining);


// DEFAULT
app.use('/', routes.getHome);
//app.post('/postanswer', routes.postAnswer);




module.exports = app;
