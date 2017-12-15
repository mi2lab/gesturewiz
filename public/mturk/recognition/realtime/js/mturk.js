function MTurk() {
    
    // private variables
    
    const _scope = this;
    
    let _activeAssignments = 0;
    let _apiKey;
    let _assignmentsPerHit = {};
    let _hitIds = [];
    let _secret;
    
    // private functions
    
    const _getHostname = function() {
        return location.hostname === "localhost" ? "localhost:8080" : "gesturewiz.mi2lab.com";
    };
    
    // public methods
    
    this.submitAssignment = function(hitId) {
        if (_assignmentsPerHit[hitId]) {
            _assignmentsPerHit[hitId]--;
            _activeAssignments--;
        }
    };
    
    this.deleteHITs = function (sandbox, hitIds = _hitIds) {
        return new Promise(function(resolve, reject) {
            if (!_apiKey || !_secret) {
                reject(Error("Please enter your API key and secret for MTurk!"));
                return;
            }

            var numHits = hitIds.length;

            if (!numHits) {
                reject(Error("No active HITs."));
                return;
            }

            $.post("//" + _getHostname() + "/mturk/deleteHITs", {
                apiKey: _apiKey,
                secret: _secret,
                sandbox: sandbox ? "1" : "0",
                hits: hitIds.join(",")
            }, function (data) {
                var parsedData = JSON.parse(data);

                for (var e in parsedData) {
                    _hitIds.splice($.inArray(e, _hitIds), 1);
                    _activeAssignments -= _assignmentsPerHit[e];
                }

                console.log("active HITs:", _hitIds);
                console.log("active assignments:", _activeAssignments);
                
                resolve(parsedData);
            }).fail(function(jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };
    
    this.getActiveAssignments = function() {
        return _activeAssignments;
    };
    
    this.getHITIds = function() {
        return _hitIds;
    };
    
    this.grantBonus = function(amount, assignmentId, sandbox, workerId) {
        return new Promise(function(resolve, reject) {
            if (!_apiKey || !_secret) {
                reject(Error("Please enter your API key and secret for MTurk!"));
                return;
            }
            
            $.post("//" + _getHostname() + "/mturk/grantBonus", {
                apiKey: _apiKey,
                secret: _secret,
                sandbox: sandbox ? "1" : "0",
                assignmentId: assignmentId,
                workerId: workerId,
                amount: amount,
            }, function(data) {
                const parsedData = JSON.parse(data);
                console.log(parsedData);

                resolve(parsedData);
            }).fail(function(jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };
    
    this.sendHITs = function(numAssignments, reward, sandbox, url) {
        return new Promise(function(resolve, reject) {
            if (!_apiKey || !_secret) {
                reject(Error("Please enter your API key and secret for MTurk!"));
                return;
            }
            
            $.post("//" + _getHostname() + "/mturk/externalQuestion", {
                apiKey: _apiKey,
                secret: _secret,
                sandbox: sandbox ? "1" : "0",
                maxAssignments: numAssignments,
                amount: reward,
                url: url
            }, function(data) {
                const parsedData = JSON.parse(data);

                for (let i=0; i<parsedData.length; ++i) {
                    try {
                        console.log("https://" +
                            (sandbox ? "workersandbox" : "www") +
                            ".mturk.com/mturk/preview?groupId=" + parsedData[i].HIT[0].HITTypeId);

                        _hitIds.push(parsedData[i].HIT[0].HITId);
                        _activeAssignments += parsedData[i].assignments;
                        _assignmentsPerHit[parsedData[i].HIT[0].HITId] = parsedData[i].assignments;
                    } catch (e) {
                        console.error(e);
                    }
                }
                
                console.log("active HITs:", _hitIds);
                console.log("active assignments:", _activeAssignments);
                
                resolve(parsedData);
            }).fail(function(jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };
    
    this.setCredentials = function(apiKey = localStorage.getItem("api-key"), secret = localStorage.getItem("secret")) {
        _apiKey = apiKey;
        _secret = secret;
        
        return _scope;
    };
    
}