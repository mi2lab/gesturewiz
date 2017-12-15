;

function MTurk(server) {

    // private variables

    const _scope = this;

    let _activeAssignments = 0;
    let _apiKey;
    let _assignmentsPerHit = {};
    let _hitIds = [];
    let _secret;

    // private functions

    const _getHostname = function () {
        if (server && server.indexOf("localhost") === -1) {
            return server;
        }

        return location.hostname === "localhost" ? location.host : "gesturewiz.mi2lab.com";
    };

    const _getQueryParameters = function () {
        const result = {};

        if (location.search) {
            const queryStrSplit = location.search.substr(1).split("&");

            for (let i = 0; i < queryStrSplit.length; ++i) {
                const entrySplit = queryStrSplit[i].split("=");

                if (entrySplit.length === 2) {
                    result[entrySplit[0]] = entrySplit[1];
                }
            }
        }

        return result;
    };

    const _postData = function (url, data) {
        const $form = $("<form method='post' action='" + url + "'></form>");

        for (let e in data) {
            $form.append("<input type='hidden' name='" + e + "' value='" + data[e] + "' />");
        }

        $("body").append($form);
        $form.submit();
    };

    // public methods

    this.deleteHITs = function (sandbox, hitIds = _hitIds) {
        return new Promise(function (resolve, reject) {
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
            }).fail(function (jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };

    this.getActiveAssignments = function () {
        return _activeAssignments;
    };

    this.getHITIds = function () {
        return _hitIds;
    };

    this.grantBonus = function (amount, assignmentId, sandbox, workerId) {
        return new Promise(function (resolve, reject) {
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
            }, function (data) {
                const parsedData = JSON.parse(data);
                console.log(parsedData);

                resolve(parsedData);
            }).fail(function (jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };

    /**
     * @param config {
     *   description: string,
     *   numAsignments: int,
     *   reward: float,
     *   sandbox: bool,
     *   title: string,
     *   url: string
     * }
     */
    this.sendHITs = function (config) {
        return new Promise(function (resolve, reject) {
            if (!_apiKey || !_secret) {
                reject(Error("Please enter your API key and secret for MTurk!"));
                return;
            }

            let assignments = config.numAssignments || 1;

            if (isNaN(assignments)) {
                assignments = 1;
            }

            $.post("//" + _getHostname() + "/mturk/externalQuestion", {
                apiKey: _apiKey,
                secret: _secret,
                amount: config.reward,
                description: config.description,
                maxAssignments: assignments,
                sandbox: config.sandbox ? "1" : "0",
                title: config.title,
                url: config.url
            }, function (data) {
                const parsedData = JSON.parse(data);

                try {
                    for (let i = 0; i < parsedData.length; ++i) {
                        console.log("https://" +
                            (config.sandbox ? "workersandbox" : "www") +
                            ".mturk.com/mturk/preview?groupId=" + parsedData[i].HIT[0].HITTypeId);

                        _hitIds.push(parsedData[i].HIT[0].HITId);
                        _activeAssignments += parsedData[i].assignments;
                        _assignmentsPerHit[parsedData[i].HIT[0].HITId] = parsedData[i].assignments;
                    }

                    console.log("active HITs:", _hitIds);
                    console.log("active assignments:", _activeAssignments);

                    resolve(parsedData);
                }
                catch (e) {
                    reject(e);
                }
            }).fail(function (jqXHR, textStatus, error) {
                reject(error);
            });
        });
    };

    this.setCredentials = function (apiKey = localStorage.getItem("api-key"), secret = localStorage.getItem("secret")) {
        _apiKey = apiKey;
        _secret = secret;

        localStorage.setItem("api-key", apiKey);
        localStorage.setItem("secret", secret);

        return _scope;
    };

    this.submitAssignment = function (hitId, data) {
        const q = _getQueryParameters();

        if (hitId && _assignmentsPerHit[hitId]) {
            _assignmentsPerHit[hitId]--;
            _activeAssignments--;
        }

        if (q.turkSubmitTo && q.assignmentId) {
            _postData(decodeURIComponent(q.turkSubmitTo) + "/mturk/externalSubmit", Object.assign({
                assignmentId: q.assignmentId,
                worker: q.workerId || (new Date()).getTime()
            }, data));
        }
        else {
            q.turkSubmitTo || console.error("query parameter 'turkSubmitTo' missing");
            q.assignmentId || console.error("query parameter 'assignmentId' missing");
        }
    };

}