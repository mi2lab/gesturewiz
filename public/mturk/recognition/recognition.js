(function (window, document, $) {
    
    /*************************/
    /* Variable Declarations */
    /*************************/
    
    // constants
    
    var AVG_GESTURE_DURATION = 4000;
    var GESTURES_TO_BE_RECOGNIZED = 3;
    var INJECTION_TIMEOUT = 2000;
    var MAX_GESTURES = 10; // max. = # gestures
    var MTURK_URL = "https://www.mturk.com/mturk/externalSubmit";
    var SANDBOX_MTURK_URL = "https://workersandbox.mturk.com/mturk/externalSubmit";
    var SANDBOX_ASSIGNMENT_ID = "ASSIGNMENT_ID_NOT_AVAILABLE";
    var SERVER_URL = location.href.indexOf("localhost") > -1 ? "http://localhost:8080" : "https://gesturewiz.mi2lab.com";
    
    // other vars
    
    var gestureSet = [
        {gesture: "triangle", file: "gesture1.jpg"},
        {gesture: "x", file: "gesture2.jpg"},
        {gesture: "rectangle", file: "gesture3.jpg"},
        {gesture: "circle", file: "gesture4.jpg"},
        {gesture: "check", file: "gesture5.jpg"},
        {gesture: "caret", file: "gesture6.jpg"},
        {gesture: "zigzag", file: "gesture7.jpg"},
        {gesture: "arrow", file: "gesture8.jpg"},
        {gesture: "leftsquarebracket", file: "gesture9.jpg"},
        {gesture: "rightsquarebracket", file: "gesture10.jpg"},
        {gesture: "v", file: "gesture11.jpg"},
        {gesture: "delete", file: "gesture12.jpg"},
        {gesture: "leftcurlybracket", file: "gesture13.jpg"},
        {gesture: "rightcurlybracket", file: "gesture14.jpg"},
        {gesture: "star", file: "gesture15.jpg"},
        {gesture: "pigtail", file: "gesture16.jpg"}
    ];
    
    var active = false;
    var addedGestures = [];
    var displayedGesture = "(unknown)";
    var endTime;
    var gestureNumber = 1;
    var injectGestures = [];
    var isLiveGesture = false;
    var isStartBtnClicked = false;
    var mTurk = new MTurk();
    var mTurkUrl = SANDBOX_MTURK_URL;
    var originalGesture;
    var positionToInject;
    var q = URI().query(true);
    var queuedGesture;
    var recognitionActive = false;
    var recognizedGestures = 0;
    var score = 0;
    var socket;
    var startTime;
    var streamActive = false;
    var testGestures = [];
    var timeTaken;
    var webRTC;
    
    // the data that will be ultimately stored
    
    var jsonObject = {
        assignmentId: SANDBOX_ASSIGNMENT_ID,
        workerId: -1,
        gestureOrder: [],
        timestamp: new Date().getTime(), // Date.now()
        windowHeight: $(window).innerHeight(),
        windowWidth: $(window).innerWidth(),
        testSet: q.gestures || "socket.io",
        selection: [],
        userAgent: navigator.userAgent
    };
    
    var mTurkAnswers = {};
    
    /********************/
    /* Helper Functions */
    /********************/
    
    var addGesture = function(src, id, position) {
        $("#gestures-container").append(
            '<div class="col-xs-3" data-src="' + src + '">' +
                '<button href="#" class="gesture thumbnail pull-left" id="' + id +
                        '" data-position="' + position + '" type="button">' +
                    '<img src="' + src + '?_=' + (new Date()).getTime() + '" class="img-responsive" />' +
                '</button>' +
            '</div>'
        );
        
        addedGestures.push(id);
    };
    
    var generateId = function() {
        return new Date().getTime() + "" + Math.round(Math.random() * 9999);
    };
    
    var getRandomElement = function(arr) {
        var r = Math.round(Math.random() * (arr.length-1));
        var el = arr[r];
        
        arr.splice(r,1);
        
        return el;
    };
    
    var highlight = function($element) {
        $element.css({
            "outline-width": "3px",
            "outline-color": "rgba(39, 174, 96, 1)",
            "outline-style": "solid"
        });
        
        $({ alpha: 1 }).animate({ alpha: 0 }, {
            duration: 2000,
            step: function() {
                $element.css("outline-color","rgba(39, 174, 96, " + this.alpha + ")");
            }
        });
    };
        
    /**********************/
    /* The Business Logic */
    /**********************/
    
    var injectGesture = function() {
        var injectCountdown = INJECTION_TIMEOUT; //Math.round(Math.random() * AVG_GESTURE_DURATION);
        var injectedGesture = getRandomElement(injectGestures);

        console.warn("Injection!");
        
        if (q.mode === "override") {
            window.setTimeout(function() {
                isLiveGesture = true;
                originalGesture = displayedGesture;
                displayedGesture = injectedGesture.gesture;
                
                startTimer();
                $("#current-gesture").stop(true).attr("src", "img/" + injectedGesture.file).show();
            }, injectCountdown);
        } else {
            isLiveGesture = true;
            queuedGesture = "img/" + injectedGesture.file;
        }
    };
    
    var choosePic = function() {
        var gestureObj = getRandomElement(testGestures);
        displayedGesture = gestureObj.gesture;
        
        $("#current-gesture").fadeOut(function() {
            var gestureSrc;
            
            if (isLiveGesture && q.mode === "queue") {
                displayedGesture = queuedGesture;
                gestureSrc = queuedGesture;
                queuedGesture = "";
            } else {
                gestureSrc = "img/" + gestureObj.file;
            }
            
            if (!isLiveGesture || q.mode !== "override") {
                $("#current-gesture").attr("src", gestureSrc).fadeIn();
            }
        });
        
        $("#gestureNum").text(gestureNumber);
        
        if (gestureNumber === positionToInject) {
            injectGesture();
        }
        
        startTimer();
        gestureNumber++;
    };
    
    var saveGesture = function(selectedGesture) {
        if (!recognitionActive) {
            $("#overlay").attr("class", "gray").text("No gesture to detect!").show();
            
            /*setTimeout(function() {
                $("#overlay").fadeOut(nextGesture);
            }, 500);*/
            
            return;
        }
        
        if (startTime) {
            endTimer();
        }
        
        createJSON(selectedGesture); // Relies on isLiveGesture!
        
        if (q.channel) {
            socket.emit("real$1", {
                event: "answer",
                workerId: jsonObject.workerId,
                answer: selectedGesture
            });
            
            recognizedGestures++;
            startTime = false;
            
            if (selectedGesture === displayedGesture || displayedGesture === "(unknown)") {
                score++;
                $("#score").append("<i class='fa fa-star'></i>");
                
                $("#overlay").attr("class", "correct").text("Correct!").show();
                setTimeout(function() {
                    $("#overlay").fadeOut(nextGesture);
                }, 500);
            } else {
                $("#overlay").attr("class", "incorrect").text("Incorrect!").show();
                setTimeout(function() {
                    $("#overlay").fadeOut(nextGesture);
                }, 500);
            }
            
            if (recognizedGestures >= GESTURES_TO_BE_RECOGNIZED) {
                $("#finishbtn-container").removeClass("hidden");
            }
        } else {
            if (isLiveGesture) {
                isLiveGesture = false;
            }

            mTurkAnswers[(gestureNumber-1) + "_" + displayedGesture] = (displayedGesture === selectedGesture);
            
            $("#overlay").text("Gesture detected!").show();
            setTimeout(function() {
                $("#overlay").fadeOut(nextGesture);
            }, 500);
        }
    };
    
    var nextGesture = function() {
        if (q.channel) {
            return;
        }
        
        if (gestureNumber > MAX_GESTURES) {
            $("#overlay").text("Thank you!").show();
            
            $.ajax({
                url: SERVER_URL + "/save?f=" + encodeURIComponent(q.gestures) + "&gestures=" + JSON.stringify(jsonObject)
            }).done(function(data) {
                var answers = $.extend(mTurkAnswers, {
                    data: JSON.stringify(jsonObject)
                });
                
                console.info("Final result: ", answers);
                console.log(data);
                
                mTurk.submitAssignment(q.hitId, answers);
            });
            
            return;
        }
        
        choosePic();
    };
    
    var startTimer = function() {
        startTime = new Date();
    };
    
    var endTimer = function() {
        endTime = new Date();
        timeTaken = endTime.getTime() - startTime.getTime();
    };
    
    var createJSON = function(selectedGesture) {
        var currentGesture = {
            dispGesture: displayedGesture,
            selGesture: selectedGesture,
            position: $("#" + selectedGesture).data("position"),
            timeTaken: timeTaken
        };
        
        if (isLiveGesture && q.inject) {
            currentGesture.originalGesture = originalGesture;
            currentGesture.injected = true;
        }
        
        jsonObject.selection.push(currentGesture);
        console.log(currentGesture);
    };
    
    var initGestures = function() {
        var testSets;
        
        // set up gestures to be recognized
        if (q.gestures) {
            testSets = q.gestures.split(",");
            
            for (var i=0; i<testSets.length; ++i) {
                if (!Gestures[testSets[i]]) {
                    $.ajax("/gestures/get?name=" + testSets[i], {
                        async: false,
                        success: function(data) {
                            var parsedData = JSON.parse(data);
                            var files = parsedData.gestures;
                            
                            Gestures[testSets[i]] = [];

                            if (!files) {
                                return;
                            }

                            for (var j=0; j<files.length; ++j) {
                                Gestures[testSets[i]].push({
                                    gesture: files[j].split(".")[0],
                                    file: "user-defined/" + testSets[i] + "/" + files[j]
                                });
                            }
                        }
                    });
                }
                
                $.merge(testGestures, Gestures[testSets[i]]);
            }
        } else {
            testGestures = Gestures.touch_static;
        }
        
        if (q.inject) {
            if (q.mode == "override") {
                if (q.injectPos) {
                    positionToInject = parseInt(q.injectPos);
                } else {
                    positionToInject = Math.round(Math.random() * (MAX_GESTURES-1)) + 1;
                }
            } else {
                // It doesn't make sense to queue a live gesture when the worker is
                // already at position 10.
                positionToInject = Math.round(Math.random() * (MAX_GESTURES-2)) + 1;
            }
            
            injectGestures = Gestures[q.inject];
        }
    };
    
    var initMTurk = function() {
        if (q.assignmentId && q.assignmentId !== SANDBOX_ASSIGNMENT_ID) {
            if (!q.sandbox) {
                mTurkUrl = MTURK_URL;
            }
            
            jsonObject.assignmentId = q.assignmentId;
            jsonObject.hitId = q.hitId;
            jsonObject.workerId = q.workerId || generateId();
        }
    };
    
    var initSockets = function() {
        jsonObject.workerId = generateId();
        socket = io();
        
        socket.on("real$1", function(msg) {
            console.log(msg);
            
            if (msg.event) {
                switch (msg.event) {
                    case "gesture":
                        isLiveGesture = true;
            
                        if (!startTime) {
                            startTimer();
                        }

                        if (q.mode === "queue") {
                            queuedGesture = msg.gesture;
                        } else {
                            if (!streamActive) {
                                $("#current-gesture").attr("src", msg.gesture).on("load", function() {
                                    $("#video-stream").addClass("hidden");
                                    $("#current-gesture").removeClass("hidden");
                                });
                            } else {
                                $("#video-stream").addClass("hidden");
                                $("#current-gesture").attr("src", msg.gesture).removeClass("hidden");
                            }
                        }
                    break;
                    case "addGestures":
                        for (var i=0; i<msg.gestures.length; ++i) {
                            if ($.inArray(msg.gestures[i].gesture, addedGestures) === -1) {
                                addGesture(msg.gestures[i].file, msg.gestures[i].gesture, 0);
                            }
                        }

                        // msg.addGestures.length > 1 iff worker first enters channel
                        if (msg.gestures.length === 1) {
                            highlight($("#" + msg.gestures[0].gesture));
                        }
                    break;
                    case "bonusGranted":
                        if (msg.workerId === jsonObject.workerId) {
                            mTurk.submitAssignment(q.hitId, {
                                data: JSON.stringify(jsonObject)
                            });
                        }
                    break;
                    case "deleteGestures":
                        for (var i=0; i<msg.gestures.length; ++i) {
                            $("[data-src='" + msg.gestures[i].file + "']").remove();
                            
                            if ($.inArray(msg.gestures[i].gesture, addedGestures) > -1) {
                                addedGestures.splice($.inArray(msg.gestures[i].gesture, addedGestures), 1);
                            }
                        }
                    break;
                    case "inputGesture":
                        displayedGesture = msg.gesture;
                    break;
                    case "recognitionActive":
                        recognitionActive = msg.status;
                    break;
                    case "stream":
                        if (msg.status === "start") {
                            streamActive = true;

                            $("#video-stream").removeClass("hidden");
                            $("#current-gesture").addClass("hidden");

                            startTimer();
                        } else {
                            streamActive = false;
                        }
                    break;
                    case "workersChanged":
                        $("#workers").html(msg.numWorkers);
                    break;
                }
            }
        });
        
        socket.on("connect", function() {
            socket.emit("room", q.channel);
            socket.emit("real$1", {
                event: "newWorker",
                workerId: jsonObject.workerId
            });
        });
        
        if (q.mode) {
            testGestures = Gestures.touch_animated3;
        }
    };
    
    // init
    if (q.channel) {
        initSockets();
    } else {
        recognitionActive = true;
        initGestures();
    }
    
    initMTurk();
    
    // DOM ready
    $(function() {
        // set up WebRTC
        if (socket) {
            webRTC = new WebRTC({
                id: jsonObject.workerId,
                socket: socket,
                video: document.getElementById("video-stream")
            });
        }
        
        // set up gesture set on right-hand side
        if (q.gestureSet) {
            if (Gestures[q.gestureSet]) {
                gestureSet = Gestures[q.gestureSet];
            } else {
                $.ajax("/gestures/get?name=" + q.gestureSet, {
                    async: false,
                    success: function(data) {
                        var parsedData = JSON.parse(data);
                        var files = parsedData.gestures;
                        var set = [];
                        
                        if (!files) {
                            return;
                        }

                        for (var i=0; i<files.length; ++i) {
                            set.push({
                                gesture: files[i].split(".")[0],
                                file: "user-defined/" + q.gestureSet + "/" + files[i]
                            });
                        }

                        gestureSet = set;
                    }
                });
            }
        } else if (q.channel) {
            gestureSet = [];
        }
        
        var gestureObj;
        var position = 1;
        
        while (gestureSet.length > 0) {
            gestureObj = getRandomElement(gestureSet);
            
            var regex = /^data:.+\/(.+);base64,(.*)$/;
            var src = gestureObj.file;

            if (!src.match(regex)) {
                src = "img/" + src;
            }
            
            addGesture(src, gestureObj.gesture, position);
            
            jsonObject.gestureOrder.push(gestureObj.gesture);
            position++;
        }
        
        $("#gestureTotal").text(MAX_GESTURES);
        
        // events

        $("body").on("click", ".gesture", function(e) {
            if (!isStartBtnClicked){
                return;
            }
            
            saveGesture($(this).attr("id"));
        });
        
        $("#startbtn").on("click", function() {
            isStartBtnClicked = true;
            
            // execute choosePic as soon as the DOM is ready
            choosePic();
            
            $("#startbtn-container").toggleClass("hidden");
        });
        
        // Go! Go! Go!
        if (q.channel) {
            isStartBtnClicked = true;
            
            $("#finishbtn").on("click", function() {
                socket.emit("real$1", {
                    event: "workerResult",
                    assignmentId: jsonObject.assignmentId,
                    hitId: jsonObject.hitId,
                    score: score,
                    workerId: jsonObject.workerId
                });
            });
            
            $("#title").html("Instructions:");
            $("#instructions").html("Several gestures will appear below. Try to recognize them before other players steal them from you.");
            $("#score-container").removeClass("hidden");
        } else {
            $("#startbtn-container").toggleClass("hidden");
        }
    });
    
})(window, document, jQuery);