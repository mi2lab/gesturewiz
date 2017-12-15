var mturk = require('mturk-api');
var _ = require('lodash');

// configuration

var basicConfig = {
    access: 'ACCESS_KEY_GOES_HERE',
    secret: 'SECRET_KEY_GOES_HERE',
    sandbox: true
};

var simpleQuestionConfig = {
    Title: 'A Simple Question',
    Description: 'Please answer this question as good as possible.',
    Reward: {CurrencyCode: 'USD', Amount: 0.05},
    Question: '',
    AssignmentDurationInSeconds: 60 * 10, // 10 minutes
    LifetimeInSeconds: 60 * 20, // 20 minutes
    MaxAssignments: 1
};

var externalQuestionConfig = {
    Title: 'Gesture Recognition Experiment',
    Description: 'Help researchers from the University of Michigan with a simple experiment. Thanks!',
    AssignmentDurationInSeconds: 60 * 10, // Allow 10 minutes to answer
    AutoApprovalDelayInSeconds: 86400 * 1, // 1 day auto approve
    MaxAssignments: 1, // 10 worker responses, remember: >10 means larger fee, so instead post multiple tasks
    LifetimeInSeconds: 60 * 20, // 20 minutes
};

// constants

var MAX_ASSIGNMENTS = 100;
var MAX_BONUS = 0.22;

// the business logic

var checkPostData = function(data) {
    console.log('Checking POST data', data);
    
    if (data && data.apiKey && data.secret) {
        return true;
    } else {
        return false;
    }
};

var prepareTmpConfig = function(req) {
    var tmpConfig = _.extend({}, basicConfig, {
        access: req.body.apiKey,
        secret: req.body.secret
    });
    
    if (req.body.sandbox && req.body.sandbox === '0') {
        tmpConfig.sandbox = false;
    }
    
    return tmpConfig;
};

exports.balance = function(req, res) {
    if (!checkPostData(req.body)) {
        res.send('No API key and secret provided.');
        return;
    }
    
    var tmpConfig = prepareTmpConfig(req);
    
    mturk.connect(tmpConfig).then(function(api){

        api.req('GetAccountBalance').then(function(response) {
            console.log(response);
            res.send(JSON.stringify(response));
        });

    }).catch(console.error);
};

exports.grantBonus = function(req, res) {
    if (!checkPostData(req.body)) {
        res.send('No API key and/or secret provided.');
        return;
    }
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    
    var tmpConfig = prepareTmpConfig(req);
    var amount = parseFloat(req.body.amount) || 0.01;
    var assignmentId = req.body.assignmentId;
    var workerId = req.body.workerId;
    
    if (amount > MAX_BONUS) {
        amount = MAX_BONUS;
    }
    
    var params = {
        WorkerId: workerId,
        AssignmentId: assignmentId,
        BonusAmount: {
            CurrencyCode: 'USD',
            Amount: amount
        },
        Reason: 'Good job!'
    };
    
    mturk.connect(tmpConfig).then(function(api) {
        api.req('GrantBonus', params).then(function(response) {
            console.log(response);
            res.send(JSON.stringify(response));
        }).catch(function(err) {
            console.error(err);
            res.send(JSON.stringify({ error: err.toString() }));
        });
    });
};

exports.simpleQuestion = function(req, res) {
    if (!checkPostData(req.body) || !req.body.question) {
        res.send('No API key, secret and/or question provided.');
        return;
    }
    
    var tmpConfig = prepareTmpConfig(req);
    
    mturk.connect(tmpConfig).then(function(api) {
        var params = _.extend({}, simpleQuestionConfig, {
            Question: _.escape(
                '<QuestionForm xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2005-10-01/QuestionForm.xsd">'
                    + '<Question>'
                        + '<QuestionIdentifier>question1</QuestionIdentifier>'
                        + '<QuestionContent><Text>' + req.body.question + '</Text></QuestionContent>'
                        + '<AnswerSpecification><FreeTextAnswer /></AnswerSpecification>'
                    + '</Question>'
                + '</QuestionForm>')
        });
        
        api.req('CreateHIT', params).then(function(response) {
            console.log(response);
            res.send(JSON.stringify(response));
        }).catch(console.error);

    }).catch(console.error);
};

exports.externalQuestion = function(req, res) {
    if (!checkPostData(req.body) || !req.body.url) {
        res.send('No API key, secret and/or URL provided.');
        return;
    }
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    
    var tmpConfig = prepareTmpConfig(req);
    
    var amount = parseFloat(req.body.amount) || 0.02;
    var description = req.body.description || externalQuestionConfig.Description;
    var title = req.body.title || externalQuestionConfig.Title;
    
    var maxAssignments = req.body.maxAssignments || 1;
    var packageSize = 10;
    
    // some security checks before we determine the number of packages
    
    if (isNaN(maxAssignments)) {
        maxAssignments = 1;
    }
    
    if (maxAssignments > MAX_ASSIGNMENTS) {
        maxAssignments = MAX_ASSIGNMENTS;
    }
    
    var loops = Math.floor(maxAssignments / packageSize);
    var lastPackage = maxAssignments % packageSize;
    
    mturk.connect(tmpConfig).then(function(api) {
        var postHIT = function(assignments, callback) {
            var params = _.extend({}, externalQuestionConfig, {
                Title: title + ' #' + Math.round(Math.random() * 999),
                Description: description,
                Question: _.escape(
                    '<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">' +
                        '<ExternalURL>' + _.escape(req.body.url) + '</ExternalURL>' +
                        '<FrameHeight>500</FrameHeight>' +
                    '</ExternalQuestion>'),
                MaxAssignments: assignments,
                Reward: {
                    CurrencyCode: 'USD',
                    Amount: amount
                }
            });

            api.req('CreateHIT', params).then(function(response) {
                response.assignments = assignments;
                
                console.log(response);
                callback(response);
            }).catch(function(err) {
                console.error(err);
                callback(err.toString());
            });
        };
        
        var r = [];
        
        (function postHITs(i, l) {
            if (i === l) {
                if (lastPackage > 0) {
                    postHIT(lastPackage, function(response) {
                        r.push(response);
                        res.send(JSON.stringify(r));
                    });
                } else {
                    res.send(JSON.stringify(r));
                }
            } else {
                postHIT(packageSize, function(response) {
                    r.push(response);
                    postHITs(i+1, l);
                });
            }
        })(0, loops);
    }).catch(console.error);
};

exports.deleteHITs = function(req, res) {
    if (!checkPostData(req.body) || !req.body.hits) {
        res.send('No API key, secret and/or HIT IDs provided.');
        return;
    }
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    
    var tmpConfig = prepareTmpConfig(req);
    
    var hitIds = req.body.hits.split(',');
    
    mturk.connect(tmpConfig).then(function(api) {
        var r = {};
        
        (function expireHIT(i, l) {
            if (i === l) {
                res.send(JSON.stringify(r));
                return;
            }
            
            api.req('ForceExpireHIT', {
                HITId: hitIds[i]
            }).then(function(response) {
                console.log(response);
                r[hitIds[i]] = response;
                expireHIT(i+1, l);
            }).catch(function(err) {
                console.error(err);
                r[hitIds[i]] = err.toString();
                expireHIT(i+1, l);
            });
        })(0, hitIds.length);
    }).catch(console.error);
};