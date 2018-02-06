var express = require('express');
var async = require('async');
var vogels = require('vogels');
var Joi = require('joi');
var AWS = require('aws-sdk');
var creds = require('./credentials.json');
vogels.AWS.config.update({accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, region: "us-east-1"});
var request = require('request');
var regression = require('regression');

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'sys'
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
 
  console.log('connected as id ' + connection.threadId);
});


// Employee Accounts Table
var Account = vogels.define('Account', {
  hashKey : 'username',

  timestamps : true,

  schema : {
    userID : vogels.types.uuid(),
    username: Joi.string(),
    email   : Joi.string().email(),
    name    : Joi.string(),
    password : Joi.string(),
    value : Joi.number() // Possible ranking of employees?
  }
});

var Job = vogels.define('Job', {
  hashKey : 'JobID',

  timestamps : true,

  schema : {
    JobID : vogels.types.uuid(),
    user : Joi.string(),
    name    : Joi.string(),
    genome : Joi.string(),
    cost : Joi.number(),
    inx : Joi.number(),
    ans : Joi.string(),
    status : Joi.string(),
    user : Joi.string()
  }
});

vogels.createTables({
    'Account' : {readCapacity: 1, writeCapacity: 10},
    'Job' : {readCapacity: 1, writeCapacity: 10}   
}, function (err) {
  if(err) {
    console.log('Error creating tables', err);
    process.exit(1);
  }
});

var blockNum = 0;

/* GET home page. */
var getHome = function(req, res) {

    // Not Signed in 
    if (!req.session.username) {
        res.render('signup.ejs', {error : null, userID : req.session.userID });
    }
    var value = 0
    Account.get(req.session.username, function(err, resp) {
        if (!err) {
            value = resp.get('value');
        }
    });

    console.log(req.query.account);

    var accountNum = req.query.account;
    if (!accountNum) {
        accountNum = 22;
    }

    var queryURL = 'https://api-wufthacks.xlabs.one:8243/td/account/V1.0.0/account/' + accountNum;
    //console.log(queryURL)

    var options = { method: 'GET',
      url: queryURL,
      headers: 
       { 'Postman-Token': 'f0417177-1e0a-c509-2b12-952e6df17102',
         'Cache-Control': 'no-cache',
         Authorization: 'Bearer 00670285-a115-38d5-8b22-f21557b7e17d',
         'X-Api-Key': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkcnV2ZXNoZWVyYW4iLCJleHAiOjE1MTg1NjEyNTR9.kTlsWaJafTDX3KThRyI11xj_LoWsBLavOZXLuajzvQ5VSCiaXZZSTZMpnzsiChxiMnxhPj4l5yy1gSaClxklzA',
        Accept: 'application/json' } };

    var transQ = "SELECT `amount`, balance, transaction_date, longitude, latitude, forename, last_name, sex, title, phone_number, email_id from sys.person " +
        "left join sys.phone_number  on (sys.person.party_id = sys.phone_number.party_id) " +
        "left join sys.email on (sys.email.party_id = sys.person.party_id) " +
        "left join sys.transaction on (sys.transaction.account_id = sys.person.party_id) " + 
        "where sys.person.party_id = " + accountNum + " order by transaction_date desc limit 50";
    var body = {};

    connection.query(transQ, function (error, personal, fields) {
        if (error) throw error;
        //console.log(personal);

        trans = [];
        graph = [];
        training = [];

        graph.push(['Date', 'Balance', 'Model']);

        for(var i = 30; i < 50; i++){
            var loc = {
                'amount' : personal[i].amount,
                'latitude' : personal[i].latitude,
                'longitude' : personal[i].longitude
            }
            trans.push(loc);
        }

        for(var i = 0; i < personal.length; i++){
            var regre = [personal.length - i, personal[i].balance];
            training.push(regre);
        }

        var result = regression.polynomial(training, {order : 4});
        

        for(var i = 0; i < personal.length; i++){
            var points = [personal[i].transaction_date, personal[i].balance, result.predict(personal.length - i)[1]];
            console.log(result.predict(personal.length - i)[1]);
            graph.push(points);
        }


        var stringy = JSON.stringify(trans);
        //console.log(stringy);

        var graphy = JSON.stringify(graph);
        //console.log(graphy);

        request(options, function (error, response, body) {
        if (error) {
            throw new Error(error);
        } else {
            console.log(body);
            Job.scan().loadAll().exec(function(err, resp) { // .where('user').equals(req.session.username)
            var itemValues = [];
            var transValues = [];
            var blocks = []
            if (resp) {
            items = resp.Items;
            var size = Object.keys(items).length;
            for (var i = 0; i < size; i++) {
                itemValues.push(items[i].attrs);
            }

            res.render('index.ejs', {
                name: req.session.username,
                error: req.session.message,
                items : itemValues,
                userID : req.session.userID,
                transactions : transValues,
                accountNum : accountNum,
                data : body,
                customer_name: personal[0].forename + " " + personal[0].last_name,
                email: personal[0].email_id,
                phone: personal[0].phone_number,
                trans: stringy,
                graph: graphy
            });
        }
        })
        }
    }) 
    });
    
}

/* GET about page. */
var getAbout = function(req, res) {
    res.render('about.ejs', { name: 'Bob' , balance: '0', error: null});
}

/* POST account page. */
var postAccount = function(req, res) {
    var username = req.body.inputUsername;
    var email = req.body.inputEmail;
    var name = req.body.inputName;
    var password = req.body.inputPassword;

    req.session.username = username;
    req.session.balance = 0;

    Account.create({
                username : username,
                email : email,
                name : name,
                password : password,
                value : 0
            }, function(err, post) {
                if (err) {
                    req.session.message = err;
                    res.redirect('/')
                } else {
                    res.redirect('/');
                }
    });
}

var postCheck = function(req, res) {
    var username = req.body.loginUsername;
    var password = req.body.loginPassword;

    if (! username || ! password) {
        req.session.message = "One or more fields not filled in";
        res.redirect('/signup');
    } else {
        Account.get(username, function(err, acc) {
            if (err) {
                req.session.message = "Error accessing user database";
                res.redirect('/signup');
            } else if (acc) {
                if (acc.get('password').localeCompare(password) == 0) {
                    req.session.email = acc.get('email');
                    req.session.username = username;
                    req.session.userID = acc.get('userID');
                    req.session.balance = acc.get('value');
                    res.redirect('/');
                } else {
                    req.session.message = "Password incorrect";
                    res.redirect('/signup');
                }
            } else {
                req.session.message = "Account not found";
                res.redirect('/signup');
            }
        });
    }
}

/* GET signup page. */
var getSignup = function(req, res) {
    res.render('signup.ejs', { error: req.session.message });
}

var routes = {
    getHome : getHome,
    getAbout : getAbout,
    postAccount : postAccount,
    getSignup : getSignup,
    postCheck : postCheck,
};

module.exports = routes;
