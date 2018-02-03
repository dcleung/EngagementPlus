var express = require('express');
var async = require('async');
var vogels = require('vogels');
var Joi = require('joi');
var AWS = require('aws-sdk');
var creds = require('./credentials.json');
vogels.AWS.config.update({accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, region: "us-east-1"});

// Establish the "healthy" patient
var test = ['AA', 'CG', 'TG', 'AC', 'AC', 'AA', 'TC', 'GC', 'TT', 'CT', 'AC', 'AG', 'AT'];

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

/* GET mining page. */
var getMine = function(req, res) {
    res.render('mine.ejs', { name: 'Bob' , balance: '0', error: null});
}

/* GET visualizer page. */
var getVisualizer = function(req, res) {
    res.render('visualizer.ejs', { name: 'Bob' , balance: '0', error: null});
}

/* GET about page. */
var getAbout = function(req, res) {
    res.render('about.ejs', { name: 'Bob' , balance: '0', error: null});
}

/* GET DNA problem */
var getDNA = function(req, res) {
    // Put the database call here
    var dnaObj = new Object();
    dnaObj.genome = "blahblahblahtacoblah";
    dnaObj.targetGene = "blah"
    res.send(JSON.stringify(dnaObj));
}

/* POST job page. */
var postJob = function(req, res) {
    var cost = req.body.inputCost;
    var name = req.body.inputName;
    var genome = req.body.inputGenome;

    // Replace white spaces
    genome = genome.replace(/\s/g, "");
    var arr = genome.split(",");

    var testEntries = [];
    var inx = 0;

    // Simple looping to verify solutions
    for (j = 0; j < arr.length - 1; j++) {
        if (arr[j] === test[j] && arr[j + 1] === test[j + 1]) {
            inx = j;
        }
    }
    for (i = 0; i < arr.length; i++) {
        if (arr[i] != test[i]) {
            testEntries.push(i);
        }
    }

    if (!cost || !name) {
        req.session.message = "missing inputs";
        console.log("YOU ARE MISSING INPUTS");
        res.redirect('/');
    } else {
        Job.create({
                    cost : cost,
                    name : name,
                    genome : genome,
                    status : 'Incomplete',
                    inx : inx,
                    ans : testEntries.toString(),
                    user : req.session.username
                }, function(err, post) {
                    if (err) {

                        res.render('index.ejs', { error: 'Error accessing database' , balance: '0'});
                    } else {
                        Account.update({username : req.session.username, value : {$add : -1 * cost}}, function (err, acc) {
                          console.log('incremented age by 1', acc.get('value'));
                        });
                        req.session.message = null;
                        res.redirect('/');
                    };
        });
    }
}

/* POST job page. */
var postTransaction = function(req, res) {
    var recipient = req.body.inputWallet;
    var amount = req.body.inputAmount;

    if (!recipient || !amount) {
        console.log("missing inputs")
        req.session.message = "missing inputs";
        res.redirect('/');
    } else {
        Transaction.create({
                    block : 'Unconfirmed',
                    confirmed : 'Unconfirmed',
                    sender : req.session.username,
                    receiver : recipient,
                    amount : amount
                }, function(err, post) {
                    if (err) {
                        res.render('index.ejs', { error: 'Error accessing database' , balance: '0'});
                    } else {
                        req.session.message = null;
                        res.redirect('/');
                    };
        });
    }
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

/* receive the answer */
var postanswer = function(req, res) {
    var answer = req.body;
    // Do something with the answer and thus block
}

var getDNA = function(req, res) {
    res.send(JSON.stringify(req.app.jobObject));
}

var getMining = function(req, res) {
    var numTransactions = 0;
    var matches = [];
    var inx = 0;
    Transaction.scan().loadAll().exec(function(err, resp) {
        if (resp) {
            items = resp.Items;
            var size = Object.keys(items).length;
            var block = blockNum; // Assign to correct block
            for (var i = 0; i < size; i++) {
                console.log(items[i]);
                if (items[i].attrs.confirmed === "Unconfirmed") {
                    numTransactions++;
                    var sender = items[i].attrs.sender;
                    var receiver = items[i].attrs.receiver;
                    var amount = items[i].attrs.amount;
                    var newSenderAmt = -1 * amount;
                    var newReceiverAmt = 0;
                    Account.update({username : sender, value : {$add : newSenderAmt}}, function (err, acc) {
                      console.log('incremented age by 1', acc.get('value'));
                    });
                    Account.update({username : receiver, value : {$add : amount}}, function (err, acc) {
                      console.log('incremented age by 1', acc.get('value'));
                    });
                    Transaction.update({transID: items[i].attrs.transID, confirmed : "Confirmed", block : blockNum}, function(err, acc) {
                        if (!err) {
                            console.log('incremented age by 1', acc.get('unconfirmed'));
                        } else {
                            console.log("ERRORRRR");
                        }
                    });
                }
            }

        }
    });

    Job.scan().loadAll().exec(function(err, resp2) {
        if (resp2) {
            items2 = resp2.Items;
            var size = Object.keys(items2).length;
            for (var j = 0; j < size; j++) {
                if (items2[j].attrs.status === "Incomplete") {
                    var jobID = items2[j].attrs.JobID;
                    var res = items2[j].attrs.ans + "";
                    inx = items2[j].attrs.inx;
                    matches = res;
                    Account.update({username : req.session.username, value : {$add : items2[j].attrs.cost}}, function (err, acc) {
                          console.log('incremented age by 1', acc.get('value'));
                    });
                    Job.update({JobID : jobID, status : "Complete. Indices: " + res}, function(err, acc) {
                        if (!err) {
                            console.log('incremented age by 1', acc.get('status'));
                        } else {
                            console.log("ERRORRRR");
                        }
                    });
                }
            }
        } else {
            console.log("HELP IM HERE");
        }
    });

    Block.create({
        hash : blockNum,
        previousHash : blockNum - 1,
        start : inx,
        transactions : numTransactions
    }, function(err, post) {
        console.log(post);
        blockNum++;
        res.redirect('/');
    });

}

var routes = {
    getHome : getHome,
    postJob : postJob,
    getVisualizer : getVisualizer,
    getAbout : getAbout,
    getMine : getMine,
    postAccount : postAccount,
    getSignup : getSignup,
    postCheck : postCheck,
    getDNA : getDNA,
    postanswer : postanswer,
    postTransaction : postTransaction,
    getMining : getMining
};

module.exports = routes;
