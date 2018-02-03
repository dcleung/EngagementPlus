var express = require('express');
var async = require('async');
var vogels = require('vogels');
var Joi = require('joi');
var AWS = require('aws-sdk');
var creds = require('./credentials.json');
vogels.AWS.config.update({accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, region: "us-east-1"});

var Account = vogels.define('Account', {
  hashKey : 'username',

  timestamps : true,

  schema : {
    userID : vogels.types.uuid(),
    username: Joi.string(),
    email   : Joi.string().email(),
    name    : Joi.string(),
    password : Joi.string(),
    value : Joi.number()
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

var Block = vogels.define('Block', {
  hashKey : 'hash',

  timestamps : true,

  schema : {
    hash : Joi.number(),
    previousHash : Joi.number(),
    start      : Joi.number(),
    transactions : Joi.number()
  }
});

var Transaction = vogels.define('Transaction', {
  hashKey : 'transID',

  timestamps : true,

  schema : {
    transID : vogels.types.uuid(),
    block : Joi.string(),
    confirmed : Joi.string(),
    timestamp : Joi.number(),
    sender : Joi.string(),
    receiver : Joi.string(),
    amount : Joi.number()
  }
});

vogels.createTables({
    'Account' : {readCapacity: 1, writeCapacity: 10},
    'Job' : {readCapacity: 1, writeCapacity: 10},
    'Block' : {readCapacity: 1, writeCapacity: 10},
    'Transaction' : {readCapacity: 1, writeCapacity: 10},    
}, function (err) {
  if(err) {
    console.log('Error creating tables', err);
    process.exit(1);
  }
});

var blockNum = 0;

/* GET home page. */
var getHome = function(req, res) {
    console.log(req.body)
    console.log(req.param('id'))
    if (!req.session.username) {
        res.render('signup.ejs', {error : null, userID : req.session.userID });
    }
    var value = 0
    Account.get(req.session.username, function(err, resp) {
        if (!err) {
            value = resp.get('value');
        }
    });

    Job.scan().loadAll().exec(function(err, resp) { // .where('user').equals(req.session.username)
        var itemValues = [];
        var transValues = [];
        var blocks = []
        if (resp) {
            Transaction.scan().loadAll().exec(function(err2, resp2) {
                if (resp2) {                   
                    Block.scan().loadAll().exec(function(err3, resp3) {
                        if (resp3) {
                            items = resp.Items;
                            var size = Object.keys(items).length;
                            for (var i = 0; i < size; i++) {
                                itemValues.push(items[i].attrs);
                            }

                            items2 = resp2.Items;
                            items2.sort(function(a, b) {
                                return parseFloat(b.attrs.block) - parseFloat(a.attrs.block);
                            });
                            var size2 = Object.keys(items2).length;
                            for (var j = 0; j < size2; j++) {
                                transValues.push(items2[j].attrs);
                            }

                            items3 = resp3.Items;
                            items3.sort(function(a, b) {
                                return parseFloat(b.attrs.hash) - parseFloat(a.attrs.hash);
                            });
                            var size3 = Object.keys(items3).length;
                            for (var k = 0; k < size3; k++) {
                                blocks.push(items3[k].attrs);
                            }
                        }
                        res.render('index.ejs', {
                            name: req.session.username , blocks : blocks, balance: value , error: req.session.message, items : itemValues, userID : req.session.userID, transactions : transValues
                        });
                    })
                }
                
            });
        }
    })
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
