(function (window, document, $) {

    //var hitInterval;
    var startInterval, endInterval;
    var isRecording = false;
    var name;
    var q = URI().query(true);
    var real$1;
    var workerUi = "classic";

    // Helper Functions

    var workerMap = {};

    var workersPerGesture = {};

    var assignGestureToWorker = function (workerId) {
        console.log("workerMap", workerMap);
        console.log("workersPerGesture", workersPerGesture);

        if (!Object.keys(workerMap).length) {
            return;
        }

        var wid = workerId;

        if (!wid) {
            for (var w in workerMap) {
                if (workerMap[w] === "(unassigned)") {
                    wid = w;
                    break;
                }
            }
        }

        if (!Object.keys(workersPerGesture).length) {
            workerMap[wid] = "(unassigned)";
            return;
        }

        var min = 9999;
        var nextGesture;

        for (var g in workersPerGesture) {
            if (workersPerGesture[g].length <= min) {
                nextGesture = g;
                min = workersPerGesture[g].length;
            }
        }

        workerMap[wid] = nextGesture;
        workersPerGesture[nextGesture].push(wid);

        console.log("workerMap", workerMap);
        console.log("workersPerGesture", workersPerGesture);

        var tmp = parseInt($("div[data-id='" + nextGesture + "'] .gesture-workers").text());
        $("div[data-id='" + nextGesture + "'] .gesture-workers").text(tmp + 1);

        real$1.emit("real$1", {
            event: "template",
            gesture: name + "/" + nextGesture,
            workerId: wid
        });

        if (mTurkActive) {
            //send1vs1HIT(1, getWorkerURL("1vs1"));
        }
    };

    var getMode = function () {
        var $mode = $("[name='mode']:checked");
        var $input = $("[name='input']:checked");

        return {
            recognize: $mode.val() === "recognize",
            create: $mode.val() === "create",
            mouse: $input.val() === "mouse",
            kinect: $input.val() === "kinect",
            video: $input.val() === "video"
        };
    };

    var getWorkerURL = function (mode, id) {
        var url = "https://gesturewiz.mi2lab.com/mturk/recognition/";

        if (mode === "classic") {
            url += ("game.html?channel=" + real$1.getChannel());
        }
        else {
            if (id !== undefined) {
                url += ("1vs1.html?channel=" + real$1.getChannel() + "&gesture=" + name + "/" + id);
            }
            else {
                url += ("1vs1.html?channel=" + real$1.getChannel());
            }
        }

        url += ($("#sandbox").is(":checked") ? "&sandbox=1" : "");

        return url;
    };

    var resetTimers = function () {
        answerTime = undefined;
        startTime = undefined;
        endTime = undefined;

        //window.clearInterval(hitInterval);
        window.clearInterval(startInterval);
        window.clearInterval(endInterval);
    };

    var setNameForGestureSet = function (override) {
        if (!name || override) {
            name = prompt("Please enter a name for your gesture set:");
            customGestureSet = name;
            $("#name").html(name);
        }
    };

    var ts = function () {
        return (new Date()).getTime();
    };

    // MTurk

    var MAX_REWARD = 0.25;
    var MIN_GESTURES_TO_BE_DETECTED = 3;
    var NUM_WORKERS = 10;
    var WORKERS_ON_HOLD = 10;

    var mTurk = new MTurk().setCredentials();

    var apiKey = localStorage.getItem("api-key");
    var secret = localStorage.getItem("secret");

    var conflictCheckerActive = false;
    var hitIds = [];
    var hitIds1vs1 = {};
    var mTurkActive = false;

    var storeCredentials = function () {
        apiKey = $("#api-key").val();
        secret = $("#secret").val();

        window.localStorage.setItem("api-key", apiKey);
        window.localStorage.setItem("secret", secret);
    };

    var toggleMTurk = function () {
        var $gestures = $(".gesture");

        setNameForGestureSet();

        if (!mTurkActive) {
            $("#mturk-status").html("Stop MTurk");
            $("#toggle-mturk > .circle").addClass("animated");
            $("[name='worker-ui'], #sandbox").attr("disabled", true);

            if (workerUi === "classic") {
                sendHITs(2 * NUM_WORKERS, 0.01 * MIN_GESTURES_TO_BE_DETECTED, getWorkerURL("classic"), function (response) {
                    for (var i = 0; i < response.length; ++i) {
                        hitIds.push(response[i].HIT[0].HITId);
                    }
                });
            }
            else {
                $gestures.each(function () {
                    var id = $(this).data("id");
                    send1vs1HIT(NUM_WORKERS, getWorkerURL("1vs1", id), id);
                });

                for (var i = 0; i < WORKERS_ON_HOLD; ++i) {
                    send1vs1HIT(2, getWorkerURL("1vs1"));
                }
            }

            mTurkActive = true;
        }
        else {
            $("#mturk-status").html("Start MTurk");
            $("#toggle-mturk > .circle").removeClass("animated");
            $("[name='worker-ui'], #sandbox").attr("disabled", false);

            if (mTurk.getActiveAssignments()) {
                if (workerUi === "classic") {
                    deleteHITs(hitIds, function () {
                        hitIds = [];
                    });
                }
                else {
                    var hitsToBeDeleted = [];

                    for (var id in hitIds1vs1) {
                        $.merge(hitsToBeDeleted, hitIds1vs1[id]);
                        delete hitIds1vs1[id];
                    }

                    deleteHITs(hitsToBeDeleted);
                }
            }

            mTurkActive = false;
        }
    };

    var send1vs1HIT = function (assignments, url, id) {
        var gestureId = id || "(unassigned)";

        sendHITs(assignments, 0.02, url, function (response) {
            for (let i = 0; i < response.length; ++i) {
                try {
                    var hitId = response[i].HIT[0].HITId;

                    if (!hitIds1vs1[gestureId]) {
                        hitIds1vs1[gestureId] = [];
                    }

                    hitIds1vs1[gestureId].push(hitId);
                }
                catch (e) {
                    console.error(e);
                }
            }
        });
    };

    var sendHITs = function (assignments, reward, url, callback) {
        /* obsolete since the gesture set is now sent via sockets */
        //if (customGestureSet) {
        //    gestureSetParam = "&gestureSet=" + customGestureSet;
        //} else {
        //    gestureSetParam = "";
        //}

        mTurk.sendHITs({
            numAssignments: assignments,
            reward: reward,
            sandbox: $("#sandbox").is(":checked"),
            url: url
        }).then(function (response) {
            var hitTime = (new Date()).getTime();

            /*window.clearInterval(hitInterval);

            hitInterval = window.setInterval(function () {
                $("#time-hit").html((new Date().getTime() - hitTime) / 1000);
            }, 100);*/

            if (callback) {
                callback(response);
            }
        }).catch(console.error);
    };

    var deleteHITs = function (hitIds, callback) {
        mTurk.deleteHITs($("#sandbox").is(":checked"), hitIds).then(function (response) {
            //window.clearInterval(hitInterval);
            alert(Object.keys(response).length + " HITs deleted successfully.");

            if (callback) {
                callback();
            }
        }).catch(console.error);
    };

    var saveGestures = function () {
        var $gestures = $(".gesture");
        var dataUrls = [];

        setNameForGestureSet(true);

        if (name && $gestures.length) {
            $gestures.each(function () {
                dataUrls.push($(this).attr("src").split("?")[0]);
            });

            $.post("/gestures/saveBulk", {
                dataUrls: dataUrls.join("|"),
                name: name
            }, function (data) {
                var parsedData = JSON.parse(data);
                console.log(parsedData);
            });
        }
    };

    var checkConflicts = function () {
        console.warn("Conflict checker:");

        conflictResponses = 0;
        conflictResponsesTotal = 0;

        var $resultsTable = $(".results-table");
        $resultsTable.html("");

        var tableHeader = "<tr><td></td>";

        for (var i = 0; i < customGestures.length; ++i) {
            tableHeader +=
                `<td><img src="/mturk/recognition/img/user-defined/${name}/${customGestures[i].gesture}.gif" width="50" /></td>`;
        }

        $resultsTable.append(tableHeader + "</tr>");

        for (var i = 0; i < customGestures.length; ++i) {
            var row = `<tr><td><img src="/mturk/recognition/img/user-defined/${name}/${customGestures[i].gesture}.gif" width="50" /></td>`;

            for (var j = 0; j < customGestures.length; ++j) {
                row += `<td id="${customGestures[i].gesture + "_" + customGestures[j].gesture}" ${i === j ? "style='background-color: #ccc;'" : ""}></td>`
            }

            $resultsTable.append(row + "</tr>");
        }

        for (var i = 0; i < customGestures.length; ++i) {
            var g1 = customGestures[i];

            for (var j = i + 1; j < customGestures.length; ++j) {
                conflictResponsesTotal += 3;

                var g2 = customGestures[j];

                var path = "/mturk/recognition/1vs1.html?mode=conflict&channel=" + real$1.getChannel() + "&test=" + name + "/" + g1.gesture + "&gesture=" + name + "/" + g2.gesture;

                if (location.hostname !== "localhost") {
                    send1vs1HIT(3, "https://gesturewiz.mi2lab.com" + path, g1.gesture + "_" + g2.gesture);
                }

                console.log("http://localhost:8080" + path + "&assignmentId=test");
            }
        }

        $("#conflict-checker-results").click();
    };

    var toggleConflictChecker = function () {
        if (!conflictCheckerActive) {
            $("#checker-status").html("Stop Conflict Checker");
            $("#conflict-checker > .circle").addClass("animated");

            checkConflicts();

            conflictCheckerActive = true;
        }
        else {
            $("#checker-status").html("Start Conflict Checker");
            $("#conflict-checker > .circle").removeClass("animated");

            var hitsToBeDeleted = [];

            for (var id in hitIds1vs1) {
                $.merge(hitsToBeDeleted, hitIds1vs1[id]);
                delete hitIds1vs1[id];
            }

            deleteHITs(hitsToBeDeleted);
            conflictCheckerActive = false;
        }
    };

    // The Gesture Stuff

    var $selectedGesture;
    var answerTime;
    var conflictResponses = 0;
    var conflictResponsesTotal = 0;
    var customGestures = [];
    var customGestureSet;
    var endTime;
    var gestureRecordingInterval;
    var gestureRecordingStart;
    var gotAnswer = false;
    var startTime;
    var times = {};
    var winners;

    var onGestureDetected = function (gestures) {
        if (!getMode().recognize || gotAnswer) {
            return;
        }

        answerTime = (new Date()).getTime();
        gotAnswer = true;
        winners = gestures;

        $("#winners").html(JSON.stringify(winners));
        $(".gesture").removeClass("highlighted");

        for (var i = 0; i < winners.length; ++i) {
            $("img[data-id='" + winners[i].gesture + "']").addClass("highlighted");
        }

        $selectedGesture = $(".selected");

        if (winners.length === 1 && $selectedGesture.length) {
            var result;

            if (winners[0].gesture == $selectedGesture.data("id")) {
                result = "correct";
            }
            else {
                result = "incorrect";
            }

            var tmp = parseInt($("div[data-id='" + $selectedGesture.data("id") + "'] .gesture-" + result).text());

            $("div[data-id='" + $selectedGesture.data("id") + "'] .gesture-" + result).text(tmp + 1);
        }

        if (endTime) {
            saveResult();
        }
    };

    var onConflict = function (msg) {
        conflictResponses++;

        if (msg.result === true) {
            $(`#${msg.gestures[0]}_${msg.gestures[1]}`).append("<i class='fa fa-times red'></i>");
            $(`#${msg.gestures[1]}_${msg.gestures[0]}`).append("<i class='fa fa-times red'></i>");
        }

        $(".results-hint").html(`${conflictResponses}/${conflictResponsesTotal} responses received.`);
    };

    var onWorkersChanged = function (numWorkers) {
        $("#num-workers-channel").html(numWorkers);
    };

    var onNewWorker = function (msg) {
        // notify new worker about current status
        if ($(".selected").length) {
            real$1.emit("real$1", {
                event: "inputGesture",
                gesture: $(".selected").data("id") + ""
            });
        }
        else {
            real$1.emit("real$1", {
                event: "inputGesture",
                gesture: "(unknown)"
            });
        }

        if (workerUi === "1vs1") {
            workerMap[msg.workerId] = msg.gesture;

            if (msg.gesture !== "(unassigned)") {
                if (!workersPerGesture[msg.gesture]) {
                    workersPerGesture[msg.gesture] = [];
                }

                workersPerGesture[msg.gesture].push(msg.workerId);
            }

            console.log("workerMap", workerMap);
            console.log("workersPerGesture", workersPerGesture);

            if (msg.gesture === "(unassigned)" && customGestures.length) {
                assignGestureToWorker();
            }
            else {
                var tmp = parseInt($("div[data-id='" + msg.gesture + "'] .gesture-workers").text());
                $("div[data-id='" + msg.gesture + "'] .gesture-workers").text(tmp + 1);
            }
        }

        real$1.emit("real$1", {
            event: "addGestures",
            gestures: customGestures
        });

        if (getMode().recognize && isRecording) {
            // tell them that we're currently streaming
            real$1.recognize();
        }
    };

    var onWorkerLost = function (msg) {
        var id = msg.gesture;

        if (workerUi === "1vs1") {
            delete workerMap[msg.workerId];

            for (var g in workersPerGesture) {
                var index = $.inArray(msg.workerId + "", workersPerGesture[g]);

                if (index > -1) {
                    workersPerGesture[g].splice(index, 1);

                    var tmp = parseInt($("div[data-id='" + g + "'] .gesture-workers").text());
                    $("div[data-id='" + g + "'] .gesture-workers").text(tmp - 1);
                }
            }
        }

        if (!mTurkActive) {
            return;
        }

        if (id !== undefined) {
            // 1 vs. 1
            send1vs1HIT(1, getWorkerURL("1vs1", id), id);
        }
        else {
            // classic
            sendHITs(1, 0.01 * MIN_GESTURES_TO_BE_DETECTED, getWorkerURL("classic"), function (response) {
                for (var i = 0; i < response.length; ++i) {
                    hitIds.push(response[i].HIT[0].HITId);
                }
            });
        }
    };

    var onWorkerSubmit = function (workerResult) {
        var bonus = (workerResult.score - MIN_GESTURES_TO_BE_DETECTED) * 0.01;

        if (bonus > 0) {
            if (bonus > MAX_REWARD - MIN_GESTURES_TO_BE_DETECTED * 0.01) {
                bonus = MAX_REWARD - MIN_GESTURES_TO_BE_DETECTED * 0.01;
            }

            mTurk.grantBonus(
                bonus,
                workerResult.assignmentId,
                $("#sandbox").is(":checked"),
                workerResult.workerId
            ).then(function () {
                real$1.emit("real$1", {
                    event: "bonusGranted",
                    workerId: workerResult.workerId
                });
            }).catch(console.error);
        }
        else {
            real$1.emit("real$1", {
                event: "bonusGranted",
                workerId: workerResult.workerId
            });
        }

        mTurk.submitAssignment(workerResult.hitId);
    };

    var saveResult = function () {
        var inputGesture = $(".selected").data("id");

        if (inputGesture !== undefined && winners.length === 1 && inputGesture == winners[0].gesture) {
            if (!times[inputGesture]) {
                times[inputGesture] = [];
            }

            times[inputGesture].push(answerTime - endTime);

            $("div[data-id='" + inputGesture + "'] .gesture-time").html(
                (Math.round(
                    times[inputGesture].reduce(function (sum, value) {
                        return sum + value;
                    }, 0) / times[inputGesture].length / 100
                ) / 10) + "s"
            );
        }

        var result = {
            gestureSet: customGestureSet,
            inputGesture: inputGesture,
            detectedGesture: winners,
            timeSinceGestureStart: answerTime - startTime,
            timeSinceGestureEnd: answerTime - endTime
        };

        console.log(result);
        $("#time-end").html((answerTime - endTime) / 1000);

        $.ajax({
            url: "/save?f=" + encodeURIComponent(customGestureSet) + "&gestures=" + JSON.stringify(result)
        }).done(function (data) {
            console.log(data);
        });

        resetTimers();
    };

    var startGesture = function () {
        if (getMode().recognize && isRecording) {
            startTime = (new Date()).getTime();

            startInterval = window.setInterval(function () {
                $("#time-start").html((new Date().getTime() - startTime) / 1000);
            }, 100);

            real$1.recognize($("#accuracy").val());
        }
        else if (getMode().create && isRecording) {
            startGifRecording(true);
        }
    };

    var stopGesture = function () {
        if (getMode().recognize) {
            endTime = (new Date()).getTime();

            if (answerTime) {
                $("#time-end").html((answerTime - endTime) / 1000);
                saveResult();
            }
            else {
                endInterval = window.setInterval(function () {
                    $("#time-end").html((new Date().getTime() - endTime) / 1000);
                }, 100);
            }

            real$1.stop();

            if (!gotAnswer) {
                real$1.emit("real$1", {
                    event: "gesture",
                    gesture: canvas.toDataURL()
                });
            }
        }
        else {
            // add touch/mouse gesture as animated GIF
            stopGifRecording();

            // add touch/mouse gesture as PNG
            //addGesture(canvas.toDataURL("image/png"));
        }
    };

    var initGestures = function () {
        if (q.gestureSet) {
            if (Gestures[q.gestureSet]) {
                for (var i = 0; i < Gestures[q.gestureSet].length; ++i) {
                    addGesture({
                        file: "/mturk/recognition/img/" + Gestures[q.gestureSet][i].file,
                        id: Gestures[q.gestureSet][i].gesture,
                        sendToWorker: false
                    });
                }
            }
            else {
                $.ajax("/gestures/get?name=" + q.gestureSet, {
                    async: false,
                    success: function (data) {
                        var parsedData = JSON.parse(data);
                        var files = parsedData.gestures;

                        if (!files) {
                            return;
                        }

                        for (var i = 0; i < files.length; ++i) {
                            addGesture({
                                file: "/mturk/recognition/img/user-defined/" + q.gestureSet + "/" + files[i],
                                id: files[i].split(".")[0],
                                sendToWorker: false
                            });
                        }
                    }
                });
            }

            customGestureSet = q.gestureSet;
            name = q.gestureSet;

            $("#name").html(name);
        }
    };

    var addGesture = function (options) {
        var file = options.file;
        var id = options.id;
        var sendToWorker = options.sendToWorker;

        if (!options) {
            return;
        }

        var showGesture = function (file, id) {
            workersPerGesture[id] = [];
            console.log("workersPerGesture", workersPerGesture);

            $("#gesture-set").append(`
                <div class='container-outer' data-id='${id}'>
                    <span class='gesture-container'>
                        <img class='gesture' data-id='${id}' src='${file + "?_=" + (new Date()).getTime()}' />
                        <span class='fa-stack'>
                            <i class='fa fa-circle fa-stack-2x'></i>
                            <i class='fa fa-minus fa-stack-1x fa-inverse'></i>
                        </span>
                    </span><br />
                    <span class='gesture-data'>
                        &Oslash; <span class='gesture-time'>0s</span>
                        <span class='separator-10px'></span>
                        <span class='gesture-correct'>0</span> <i class='fa fa-check green'></i>
                        <span class='separator-10px'></span>
                        <span class='gesture-incorrect'>0</span> <i class='fa fa-times red'></i>
                        <span class='separator-10px'></span>
                        <span class='gesture-workers'>0</span> <i class='fa fa-user'></i>
                    </span>
                </div>
            `);

            customGestures.push({
                gesture: id,
                file: file
            });

            if (sendToWorker) {
                real$1.emit("real$1", {
                    event: "addGestures",
                    gestures: [{
                        gesture: id,
                        file: file
                    }]
                });

                if (workerUi === "1vs1") {
                    if (mTurkActive) {
                        send1vs1HIT(NUM_WORKERS, "https://gesturewiz.mi2lab.com/mturk/recognition/1vs1.html?channel=" + +real$1.getChannel() + "&gestureSet=" + name + "&gesture=" + id, id);
                    }

                    assignGestureToWorker();
                }
            }
        };

        if (file.startsWith("data:")) {
            setNameForGestureSet();

            $.post("/gestures/save", {
                dataUrl: file,
                name: name
            }, function (data) {
                var parsedData = JSON.parse(data);
                console.log(parsedData);

                if (parsedData.success) {
                    showGesture(parsedData.file, parsedData.id);
                }
            });
        }
        else {
            showGesture(file, id);
        }
    };

    var deleteGesture = function (src, dataId) {
        if (mTurkActive && workerUi === "1vs1") {
            deleteHITs(hitIds1vs1[dataId], function () {
                delete hitIds1vs1[dataId];
            });
        }

        $.post("/gestures/delete", {
            src: src
        }, function (data) {
            console.log(JSON.parse(data));
            $("div[data-id='" + dataId + "']").remove();

            real$1.emit("real$1", {
                event: "deleteGestures",
                gestures: [{
                    file: src,
                    gesture: dataId
                }]
            });

            customGestures = [];

            $(".gesture").each(function () {
                customGestures.push({
                    gesture: $(this).data("id"),
                    file: $(this).attr("src").split("?")[0]
                });
            });

            delete workersPerGesture[dataId];

            for (var w in workerMap) {
                if (workerMap[w] == dataId) {
                    workerMap[w] = "(unassigned)";
                }
            }
        });
    };

    // GIF Encoder stuff

    var encoder;
    var gifRecordingInterval;
    var gifRecordingStart;
    var pointArray = [];

    var startGifRecording = function (once) {
        encoder = new GIFEncoder();

        if (once) {
            encoder.setRepeat();
        }
        else {
            encoder.setRepeat(0);
        }

        encoder.setDelay(0);
        encoder.start();

        gifRecordingStart = ts();

        if (getMode().recognize) {
            real$1.recognize($("#accuracy").val());
        }

        gifRecordingInterval = window.setInterval(addFrameToGif, 10);
    };

    var stopGifRecording = function () {
        encoder.finish();

        window.clearInterval(gifRecordingInterval);

        if (getMode().create) {
            addGesture({
                file: "data:image/gif;base64," + encode64(encoder.stream().getData()),
                sendToWorker: true
            });
        }
        else {
            real$1.stop();

            if (!gotAnswer) {
                real$1.emit("real$1", {
                    event: "gesture",
                    gesture: "data:image/gif;base64," + encode64(encoder.stream().getData())
                });
            }
        }
    };

    var addFrameToGif = function () {
        if (isRecording) {
            encoder.addFrame(ctx);
        }
    };

    // The Canvas Stuff

    // Variables for referencing the canvas and 2dcanvas context
    var canvas, ctx;

    // Variables to keep track of the mouse position and left-button status
    var mouseX, mouseY, mouseDown = 0;

    // Variables to keep track of the touch position
    var ongoingTouches = [];

    // Keep track of the old/last position when drawing a line
    // We set it to -1 at the start to indicate that we don't have a good value for it yet
    var lastX, lastY = -1;

    // some constants
    var LINE_THICKNESS = 5;

    // Draws a line between the specified position on the supplied canvas name
    // Parameters are: A canvas context, the x position, the y position, the size of the dot
    function drawLine(ctx, x, y, size) {
        if (!getMode().mouse) {
            return;
        }

        // If lastX is not set, set lastX and lastY to the current position
        if (lastX == -1) {
            lastX = x;
            lastY = y;
        }

        // Let's use black by setting RGB values to 0, and 255 alpha (completely opaque)
        r = 0;
        g = 0;
        b = 0;
        a = 255;

        // Select a fill style
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";

        // Set the line "cap" style to round, so lines at different angles can join into each other
        ctx.lineCap = "round";
        //ctx.lineJoin = "round";

        // Draw a filled line
        ctx.beginPath();

        // First, move to the old (previous) position
        ctx.moveTo(lastX, lastY);

        // Now draw a line to the current touch/pointer position
        ctx.lineTo(x, y);

        // Set the line thickness and draw the line
        ctx.lineWidth = size;
        ctx.stroke();

        ctx.closePath();

        // Update the last position to reference the current position
        lastX = x;
        lastY = y;
    }

    // Clear the canvas context using the canvas width and height
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        $("#detected-gesture, #winners").html("");
    }

    // Keep track of the mouse button being pressed and draw a dot at current location
    function sketchpad_mouseDown() {
        if (!getMode().mouse) {
            return;
        }

        ctx.beginPath();
        ctx.arc(mouseX, mouseY, LINE_THICKNESS, 0, 2 * Math.PI, false); // a circle at the start
        ctx.fillStyle = "black";
        ctx.fill();

        mouseDown = 1;
        drawLine(ctx, mouseX, mouseY, LINE_THICKNESS);
    }

    // Keep track of the mouse button being released
    function sketchpad_mouseUp() {
        ctx.fillStyle = "black";
        ctx.fillRect(mouseX - LINE_THICKNESS, mouseY - LINE_THICKNESS, 2 * LINE_THICKNESS, 2 * LINE_THICKNESS); // and a square at the end

        mouseDown = 0;

        // Reset lastX and lastY to -1 to indicate that they are now invalid, since we have lifted the "pen"
        lastX = -1;
        lastY = -1;
    }

    // Keep track of the mouse position and draw a dot if mouse button is currently pressed
    function sketchpad_mouseMove(e) {
        // Update the mouse co-ordinates when moved
        getMousePos(e);

        // Draw a dot if the mouse button is currently being pressed
        if (mouseDown == 1) {
            drawLine(ctx, mouseX, mouseY, LINE_THICKNESS);
        }
    }

    // Get the current mouse position relative to the top-left of the canvas
    function getMousePos(e) {
        var rect = canvas.getBoundingClientRect(), // abs. size of element
            scaleX = canvas.width / rect.width, // relationship bitmap vs. element for X
            scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
    }

    function copyTouch(touch) {
        return {
            identifier: touch.identifier,
            pageX: touch.pageX,
            pageY: touch.pageY
        };
    }

    function ongoingTouchIndexById(idToFind) {
        for (var i = 0; i < ongoingTouches.length; i++) {
            var id = ongoingTouches[i].identifier;

            if (id === idToFind) {
                return i;
            }
        }
        return -1; // not found
    }

    // Draw something when a touch start is detected
    function sketchpad_touchStart(e) {
        // Prevents an additional mousedown event being triggered
        e.preventDefault();

        var touches = e.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var pos = getTouchPos(touches[i]);
            ongoingTouches.push(copyTouch(touches[i]));

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, LINE_THICKNESS, 0, 2 * Math.PI, false); // a circle at the start
            ctx.fillStyle = "black";
            ctx.fill();
        }
    }

    function sketchpad_touchEnd(e) {
        e.preventDefault();

        var touches = e.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var idx = ongoingTouchIndexById(touches[i].identifier);

            if (idx >= 0) {
                var pos1 = getTouchPos(touches[i]);
                var pos2 = getTouchPos(ongoingTouches[idx]);

                ctx.lineWidth = LINE_THICKNESS;
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.moveTo(pos2.x, pos2.y);
                ctx.lineTo(pos1.x, pos1.y);
                ctx.fillRect(pos1.x - LINE_THICKNESS, pos1.y - LINE_THICKNESS, 2 * LINE_THICKNESS, 2 * LINE_THICKNESS); // and a square at the end
                ongoingTouches.splice(idx, 1); // remove it; we're done
            }
        }
    }

    function sketchpad_touchCancel(e) {
        e.preventDefault();

        var touches = e.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var idx = ongoingTouchIndexById(touches[i].identifier);
            ongoingTouches.splice(idx, 1); // remove it; we're done
        }
    }

    // Draw something and prevent the default scrolling when touch movement is detected
    function sketchpad_touchMove(e) {
        // Prevent a scrolling action as a result of this touchmove triggering.
        e.preventDefault();

        var touches = e.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var idx = ongoingTouchIndexById(touches[i].identifier);

            if (idx >= 0) {
                var pos1 = getTouchPos(touches[i]);
                var pos2 = getTouchPos(ongoingTouches[idx]);

                ctx.beginPath();
                ctx.moveTo(pos2.x, pos2.y);
                ctx.lineTo(pos1.x, pos1.y);
                ctx.lineWidth = LINE_THICKNESS;
                ctx.strokeStyle = "black";
                ctx.stroke();

                ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
            }
        }
    }

    // Get the touch position relative to the top-left of the canvas
    // When we get the raw values of pageX and pageY below, they take into account the scrolling on the page
    // but not the position relative to our target div. We'll adjust them using "target.offsetLeft" and
    // "target.offsetTop" to get the correct values in relation to the top left of the canvas.
    function getTouchPos(touch) {
        var rect = canvas.getBoundingClientRect(), // abs. size of element
            scaleX = canvas.width / rect.width, // relationship bitmap vs. element for X
            scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

        return {
            x: (touch.pageX - rect.left) * scaleX,
            y: (touch.pageY - rect.top) * scaleY
        }
    }

    // Video stuff

    function initVideo() {
        var video = window.video = document.getElementById('camera');

        var constraints = {
                audio: false,
                video: true
            },
            camera = -1;

        function drawVideoToCanvas() {
            if (video.paused || video.ended) {
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            window.setTimeout(drawVideoToCanvas, 10);
        }

        video.addEventListener("play", drawVideoToCanvas, false);

        function gotStream(stream) {
            window.stream = stream; // make stream available to console
            video.srcObject = stream;

            video.play();
        }

        function gotDevices(deviceInfos) {
            window.cameras = [];
            for (var i = 0; i !== deviceInfos.length; ++i) {
                var deviceInfo = deviceInfos[i];
                if (deviceInfo.kind === 'videoinput') {
                    cameras.push(deviceInfo.deviceId);
                }
            }
            console.log('found cameras: ', cameras);
            // pick last camera initially (hopefully rear)
            if (camera == -1) camera = cameras.length - 1;
            var videoSource = window.cameras ? cameras[camera] : undefined;
            var constraints = {
                audio: false,
                video: {
                    deviceId: videoSource ? {
                        exact: videoSource
                    } : undefined,
                    width: {
                        exact: 300
                    },
                    height: {
                        exact: 200
                    }
                }
            };
            return navigator.mediaDevices.getUserMedia(constraints);
        }

        function handleError(error) {
            console.log(error);
        }

        function startVideo() {
            if (window.stream) {
                window.stream.getTracks().forEach(function (track) {
                    track.stop();
                });
            };
            navigator.mediaDevices.enumerateDevices().then(gotDevices).then(gotStream).catch(handleError);
        }
        startVideo();
    }

    var gotVideo = false;

    var startVideo = function () {
        if (!gotVideo) {
            initVideo();
            gotVideo = true;
        }
        else {
            window.video.play();
        }
    };

    var stopVideo = function () {
        if (gotVideo) {
            window.video.pause();
        }
    };

    var toggleRecord = function () {
        isRecording = !isRecording;

        if (isRecording) {
            $("input[type='radio']").attr("disabled", true);
            $("form").css("color", "#ccc");
            $("#recording-status").html("Stop");
            $("#toggle-record > .circle").addClass("animated");

            clearCanvas();

            if (getMode().recognize) {
                resetTimers();
                gotAnswer = false;
            }

            if (getMode().video || getMode().kinect) {
                startGifRecording();

                if (getMode().recognize) {
                    startTime = (new Date()).getTime();

                    startInterval = window.setInterval(function () {
                        $("#time-start").html((new Date().getTime() - startTime) / 1000);
                    }, 100);
                }
            }
            else {
                startGesture();
            }
        }
        else {
            $("input[type='radio']").attr("disabled", false);
            $("form").css("color", "#000");
            $("#recording-status").html("Start");
            $("#toggle-record > .circle").removeClass("animated");

            if (getMode().video || getMode().kinect) {
                stopGifRecording();

                if (getMode().recognize) {
                    endTime = (new Date()).getTime();

                    if (answerTime) {
                        $("#time-end").html((answerTime - endTime) / 1000);
                        saveResult();
                    }
                    else {
                        endInterval = window.setInterval(function () {
                            $("#time-end").html((new Date().getTime() - endTime) / 1000);
                        }, 100);
                    }
                }
            }
            else {
                stopGesture();
            }
        }
    };

    // Set up the canvas and add our event handlers after the page has loaded
    function init() {
        // Get the specific canvas element from the HTML document
        canvas = document.getElementById('sketchpad');

        // If the browser supports the canvas tag, get the 2d drawing context for this canvas
        if (canvas.getContext) {
            ctx = canvas.getContext('2d');
        }

        // Check that we have a valid context to draw on/with before adding event handlers
        if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // React to mouse events on the canvas, and mouseup on the entire document
            canvas.addEventListener('mousedown', sketchpad_mouseDown, false);
            canvas.addEventListener('mousemove', sketchpad_mouseMove, false);
            canvas.addEventListener('mouseup', sketchpad_mouseUp, false);

            // React to touch events on the canvas
            canvas.addEventListener('touchstart', sketchpad_touchStart, false);
            canvas.addEventListener('touchend', sketchpad_touchEnd, false);
            canvas.addEventListener('touchmove', sketchpad_touchMove, false);
            canvas.addEventListener('touchcancel', sketchpad_touchCancel, false);
        }
    }

    $(function () {
        init();

        real$1 = new Real$1()
            .init(canvas, customGestureSet)
            .on("conflict", onConflict)
            .on("gesture", onGestureDetected)
            .on("workerschanged", onWorkersChanged)
            .on("newworker", onNewWorker)
            .on("workerlost", onWorkerLost)
            .on("workersubmit", onWorkerSubmit)
            .toClient("slideshow");

        // initGestures needs real$1
        initGestures();

        window.processKinect = false;

        $(window).keypress(function (e) {
            if (e.keyCode === 0 || e.keyCode === 32) {
                $("#toggle-record").click();
            }
        });

        $("#submit").on("click", function () {
            storeCredentials();
        });

        $("#toggle-mturk").on("click", function () {
            toggleMTurk();
        });

        $("#save").on("click", function () {
            saveGestures();
        });

        $("body").on("click", ".gesture-container > .fa-stack", function () {
            var $img = $(this).parent().find("img");

            deleteGesture(
                $img.attr("src").split("?")[0],
                $img.data("id")
            );
        });

        $("body").on("click", ".gesture", function () {
            var $this = $(this);

            if ($this.hasClass("selected")) {
                $this.removeClass("selected");
                real$1.emit("real$1", {
                    event: "inputGesture",
                    gesture: "(unknown)"
                });
            }
            else {
                $(".gesture").removeClass("selected");
                $(this).addClass("selected");
                real$1.emit("real$1", {
                    event: "inputGesture",
                    gesture: $(this).data("id") + ""
                });
            }
        });

        $("#toggle-record").on("click", toggleRecord);

        $("#conflict-checker").on("click", function () {
            toggleConflictChecker();
        });

        $("#conflict-checker-results").on("click", function () {
            $(".overlay").removeClass("hidden");
            $(".overlay-results").removeClass("hidden");
        });

        $(".fa-times").on("click", function () {
            $(".overlay").addClass("hidden");
            $(".overlay-results").addClass("hidden");
        });

        $("[name='input']").on("click", function () {
            if (getMode().video) {
                startVideo();
            }
            else {
                stopVideo();
            }

            if (getMode().mouse) {
                clearCanvas();
            }

            window.processKinect = getMode().kinect;
        });

        $("[name='mode']").on("click", function () {
            clearCanvas();
            resetTimers();

            if (isRecording) {
                toggleRecord();
            }

            if (getMode().create) {
                $("#accuracy").attr("disabled", true);
                $("#slider-container").css("color", "#ccc");
            }
            else {
                $("#accuracy").attr("disabled", false);
                $("#slider-container").css("color", "#000");
            }

            real$1.emit("real$1", {
                event: "gesture",
                gesture: canvas.toDataURL()
            });
        });

        $("[name='worker-ui']").on("change", function () {
            if (mTurkActive) {
                return;
            }

            workerUi = $(this).val();
        });
    });

})(window, document, jQuery);