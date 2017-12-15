/**************************/
/* The real Real$1 Stuff! */
/**************************/

function Real$1() {
    
    // private variables

    const _on = {};
    const _previousAnswers = [];
    const _scope = this;
    const _whitePNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAQAAABHvi1JAAACM0lEQVR42u3TMQEAAAgDINc/9Ezg5wkdSDvAIYKAICAICAKCgCAgCAgCgoAggCAgCAgCgoAgIAgIAoKAICAIIAgIAoKAICAICAKCgCAgCCAICAKCgCAgCAgCgoAgIAgIAggCgoAgIAgIAoKAICAICAIIAoKAICAICAKCgCAgCAgCggCCgCAgCAgCgoAgIAgIAoIAgoAgIAgIAoKAICAICAKCgCCAICAICAKCgCAgCAgCgoAgIIggIAgIAoKAICAICAKCgCAgCCAICAKCgCAgCAgCgoAgIAgIAggCgoAgIAgIAoKAICAICAIIAoKAICAICAKCgCAgCAgCggCCgCAgCAgCgoAgIAgIAoIAgoAgIAgIAoKAICAICAKCgCCAICAICAKCgCAgCAgCgoAggCAgCAgCgoAgIAgIAoKAICAIIAgIAoKAICAICAKCgCAgCAgiCAgCgoAgIAgIAoKAICAICAIIAoKAICAICAKCgCAgCAgCggCCgCAgCAgCgoAgIAgIAoIAgoAgIAgIAoKAICAICAKCgCCAICAICAKCgCAgCAgCgoAggCAgCAgCgoAgIAgIAoKAICAIIAgIAoKAICAICAKCgCAgCCAICAKCgCAgCAgCgoAgIAgIAggCgoAgIAgIAoKAICAICAKCCAKCgCAgCAgCgoAgIAgIAoIAgoAgIAgIAoKAICAICAKCgCCAICAICAKCgCAgCAgCgoAggCAgCAgCgoAgIAgIAoKAICAIIAgIAn8WHp1W8/6XGusAAAAASUVORK5CYII=";

    let _accuracy = 1;
    let _answers = {};
    let _clientUid;
    let _gestureFinished = false;
    let _gestureSet;
    let _lastNumWorkers = 0;
    let _receivedAnswer = false;
    let _webRTC;

    // private functions

    const _answersComplete = function() {
        var answerCounts = _getAnswerCounts();
        var majorityExists = false;

        for (let gesture in answerCounts) {
            if (answerCounts[gesture] > .5 * _accuracy) {
                majorityExists = true;
            }
        }

        return (Object.keys(_answers).length >= _accuracy || majorityExists);
    };

    const _getAnswerCounts = function() {
        var answerCounts = {};

        for (let workerId in _answers) {
            if (_answers[workerId] in answerCounts) {
                answerCounts[_answers[workerId]]++;
            }
            else {
                answerCounts[_answers[workerId]] = 1;
            }
        }

        return answerCounts;
    };

    const _getWinners = function() {
        var allVotes = 0;
        var answerCounts = _getAnswerCounts();
        var maxVotes = 0;
        var winners = [];

        for (let gesture in answerCounts) {
            allVotes += answerCounts[gesture];
        }
        
        for (let gesture in answerCounts) {
            if (answerCounts[gesture] >= maxVotes) {
                if (answerCounts[gesture] > maxVotes) {
                    winners = [];
                }

                winners.push({
                    gesture: gesture,
                    confidence: answerCounts[gesture] / allVotes
                });
                
                maxVotes = answerCounts[gesture];
            }
        }

        return winners;
    };

    // socket.io set-up

    const _channel = location.search.match(/(\?|&)channel=([^&]+)/);
    const _socket = io();
    
    const _room = _channel && _channel.length > 2 ? _channel[2] : Math.round(Math.random() * 9999);

    _socket.on("connect", function () {
        console.log("Channel:", _room);
        console.log("Worker UI at:", location.origin + "/mturk/recognition/recognition.html?channel=" + _room/* + (_gestureSet ? "&gestureSet=" + _gestureSet : "")*/);

        _socket.emit("room", _room);
    });
    
    _socket.on("real$1", function(msg) {
        if (msg.event) {
            switch (msg.event) {
                case "answer":
                    if (_receivedAnswer) {
                        return;
                    }

                    _answers[msg.workerId] = msg.answer;

                    console.info("[real$1] receiving new worker answer:", msg);

                    if (_answersComplete()) {
                        const winners = _getWinners();

                        if (_on.gesture) {
                            _on.gesture(winners);
                        }

                        if (_clientUid) {
                            _socket.emit("real$1", {
                                event: "ongesture",
                                gesture: winners
                            });
                        }

                        if (winners.length === 1) {
                            _previousAnswers.push($.extend({}, _answers));

                            _answers = {};
                            _receivedAnswer = true;

                            _socket.emit("real$1", {
                                event: "recognitionActive",
                                status: false
                            });
                            _socket.emit("real$1", {
                                event: "gesture",
                                gesture: _whitePNG
                            });
                        }
                    }
                break;
                case "conflict":
                    if (_on.conflict) {
                        _on.conflict(msg);
                    }
                break;
                case "newWorker":
                    if (_on.newworker) {
                        _on.newworker(msg);
                    }
                break;
                case "workersChanged":
                    if (_on.workerschanged && _lastNumWorkers !== msg.numWorkers) {
                        _on.workerschanged(msg.numWorkers);
                        _lastNumWorkers = msg.numWorkers;
                    }
                break;
                case "workerLost":
                    if (_on.workerlost) {
                        _on.workerlost(msg);
                    }
                break;
                case "workerResult":
                    if (_on.workersubmit) {
                        _on.workersubmit(msg);
                    }    
                break;
            }
        }
    });

    // public functions

    this.emit = function(key, value) {
        _socket.emit(key, value);
    };
    
    this.getChannel = function() {
        return _room;
    };
    
    this.init = function(canvas, gestureSet) {
        _gestureSet = gestureSet;
        
        _webRTC = new WebRTC({
            id: "broadcaster",
            socket: _socket,
            stream: canvas.captureStream()
        });
        
        const c = canvas.getContext("2d");
            
        window.setInterval(function() {
            c.fillStyle = "white";
            c.fillRect(0, 0, 1, 1);
        }, 100);
        
        return _scope;
    };
    
    this.on = function(event, callback) {
        _on[event] = callback;
        
        return _scope;
    }

    this.recognize = function(accuracy) {
        console.log("start gesture");
        
        _gestureFinished = false;
        _receivedAnswer = false;
        
        _answers = {};
        
        if (accuracy) {
            _accuracy = accuracy;
        }
        
        _socket.emit("real$1", {
            event: "stream",
            status: "start"
        });
        
        if(!_receivedAnswer) {
            _socket.emit("real$1", {
                event: "recognitionActive",
                status: true
            });
        }

        return _scope;
    };

    this.stop = function() {
        console.log("stop gesture");
        _socket.emit("real$1", {
            event: "stream",
            status: "stop"
        });
        
        _gestureFinished = true;

        return _scope;
    };
    
    this.toClient = function(uid) {
        _clientUid = uid;
        
        console.log("Client:", uid);
        _socket.emit("client", uid);
        
        return _scope;
    };

}

/**************************/