"use strict";
/**
 * object literal 'commands' contains all commands
 * that can be sent from client to server
 */
var commands = {
    recordings: {
        autoRecord: 10,
        record: 11,
        replay: 12,
        deleteRecording: 13,
        updateTag: 14,
        updateTitle: 15,
        addToAnalysis: 16,
        removeFromAnalysis: 17
    },
    configuration: {
        tiltAngle: 20
    },
    script: {
        saveScript: 70,
        deleteScript: 71,
        evaluateScript: 72,
        saveScriptOutput: 73,
        deleteScriptOutput: 74,
        getScriptOutputImage: 75,
        evaluateTwoRecordingsScript: 76,
        evaluateRealTimeScript: 78
    },
    timeline: {
        stopReplaying: 80,
        speedUp: 81,
        slowDown: 82,
        replaySingle: 83,
        saveAnnotation: 84,
        getAnnotations: 85,
        parseLogFile: 86
    },
    analysis: {
        newAnalysis: 90,
        updateTitle: 91,
        updateTag: 92,
        saveTrace: 93,
        getTrace: 94,
        getTraces: 95,
        deleteAnalysis: 96,
        saveConfiguration: 97,
        deleteTrace: 98,
        deleteConfiguration: 99
    }
};
// declaration of global canvas and context variables
var socket, jarvis, canvas0, canvas1, context0, context1, timelineCanvas0, timelineContext0, timelineCanvas1, timelineContext1;
var heatmap, webglHeatmap;
var recArray = [];
var con0, con1;
/**
 * object literal holding variables for annotating timeline 0
 */
var timelineAnnotation0 = {
        x1: 0,
        inAnnotationMode: 0,
        rectWidth: 0,
        x1Array: [],
        x2Array: [],
        tagArray: []
    }
    /**
     * object literal holding variables for annotating timeline 1
     */
var timelineAnnotation1 = {
        x1: 0,
        inAnnotationMode: 0,
        rectWidth: 0,
        x1Array: [],
        x2Array: [],
        tagArray: []
    }
    /**
     * object literal holding global variables
     */
var MYVAR = {
    fps: 0,
    timestamp: 0,
    prevTimetamp: 0,
    fpsCounter: 0,
    fpsElement: 0,
    totalRecordingSeconds0: 0,
    totalRecordingSeconds1: 0,
    isTraceEnabled: 0,
    isHeatmapEnabled: 0,
    isAnalysisEnabled: 0,
    isScriptEnabled: 0,
    useSecondCanvas: 0,
    playedOnCanvas0: 0,
    playedOnCanvas1: 0,
    color: 0,
    color0: 0,
    color1: 0,
    once: 1,
    once2: 1,
    scriptCounter: 0,
    lastAnalysis: 0,
    heatmapCanvasInitialized: 0,
    selectedConfiguration: 0,
    selectedScript: 0,
    selectedScriptType: 0,
    selectedScriptId: 0,
    annotationColor: 0,
    audio0Enabled: 1,
    audio1Enabled: 1,
    audioFile0: 0,
    audioFile1: 0,
    timelineAnnotations0: 0,
    timelineAnnotations1: 0,
    currentSection0: 0,
    currentSection1: 0
};
/**
 * dictionary containing all 20 Kinect joints: 
 * the dictionary is used to store the coordinates
 * of the joints in order to update the skeleton 
 * drawing correctly
 */
var dict = {
    hipcenter: 0,
    spine: 0,
    shouldercenter: 0,
    head: 0,
    shoulderleft: 0,
    elbowleft: 0,
    wristleft: 0,
    handleft: 0,
    shoulderright: 0,
    elbowright: 0,
    wristright: 0,
    handright: 0,
    hipleft: 0,
    kneeleft: 0,
    ankleleft: 0,
    footleft: 0,
    hipright: 0,
    kneeright: 0,
    ankleright: 0,
    footright: 0
};
var mapNewToOldJoints = {
    spinebase: 'hipcenter',
    spinemid: 'spine',
    spineshoulder: 'shouldercenter',
    head: 'head',
    shoulderleft: 'shoulderleft',
    elbowleft: 'elbowleft',
    wristleft: 'wristleft',
    handleft: 'handleft',
    shoulderright: 'shoulderright',
    elbowright: 'elbowright',
    wristright: 'wristright',
    handright: 'handright',
    hipleft: 'hipleft',
    kneeleft: 'kneeleft',
    ankleleft: 'ankleleft',
    footleft: 'footleft',
    hipright: 'hipright',
    kneeright: 'kneeright',
    ankleright: 'ankleright',
    footright: 'footright'
};
var mapTrackingStates = {
    0: "Not Tracked",
    1: "Inferred",
    2: "Tracked"
};
/**  
 * object containig all 20 Kinect joints:
 * the object is used to store whether a joint
 * is being displayed on the canvas or not. 
 * By default, all 20 joints are shown.
 */
var selected = {
    hipcenter: 1,
    spine: 1,
    shouldercenter: 1,
    head: 1,
    shoulderleft: 1,
    elbowleft: 1,
    wristleft: 1,
    handleft: 1,
    shoulderright: 1,
    elbowright: 1,
    wristright: 1,
    handright: 1,
    hipleft: 1,
    kneeleft: 1,
    ankleleft: 1,
    footleft: 1,
    hipright: 1,
    kneeright: 1,
    ankleright: 1,
    footright: 1
};
var selected0 = {
    hipcenter: 0,
    spine: 0,
    shouldercenter: 0,
    head: 0,
    shoulderleft: 0,
    elbowleft: 0,
    wristleft: 0,
    handleft: 0,
    shoulderright: 0,
    elbowright: 0,
    wristright: 0,
    handright: 0,
    hipleft: 0,
    kneeleft: 0,
    ankleleft: 0,
    footleft: 0,
    hipright: 0,
    kneeright: 0,
    ankleright: 0,
    footright: 0
};
var selected1 = {
    hipcenter: 0,
    spine: 0,
    shouldercenter: 0,
    head: 0,
    shoulderleft: 0,
    elbowleft: 0,
    wristleft: 0,
    handleft: 0,
    shoulderright: 0,
    elbowright: 0,
    wristright: 0,
    handright: 0,
    hipleft: 0,
    kneeleft: 0,
    ankleleft: 0,
    footleft: 0,
    hipright: 0,
    kneeright: 0,
    ankleright: 0,
    footright: 0
};
var selectedTimelineSection = {
    x1: 0,
    x2: 0,
    end: 0
};
var timelineSections0 = [],
    timelineSections1 = [];
$(function () {
    var status = document.getElementById("status");
    // canvas for drawing
    canvas0 = window.kinectCanvas = document.getElementById("sketchpad");
    //canvas1 = document.getElementById("canvas1");
    context0 = canvas0.getContext("2d");
    //context1 = canvas1.getContext("2d");
    MYVAR.fpsElement = document.getElementById("frameRate");
    /*// timeline for script visualizations
    timelineCanvas0 = document.getElementById("canvasTimeline0");
    timelineContext0 = timelineCanvas0.getContext("2d");
    timelineCanvas1 = document.getElementById("canvasTimeline1");
    timelineContext1 = timelineCanvas1.getContext("2d");*/
    if (!window.WebSocket) {
        status.innerHTML = "Status: Your browser does not support web sockets!";
        return;
    }
    status.innerHTML = "Status: Connecting to server...";
    // initialize a new web socket.
    socket = new WebSocket("ws://localhost:8181/Kinect"); // connect to the Kinect server
    jarvis = new WebSocket("ws://141.211.184.30");
    // ##########################################################################################
    // connection established.
    socket.onopen = function () {
        status.innerHTML = "Status: Connection successful.";
    };
    // connection closed.
    socket.onclose = function () {
        status.innerHTML = "Status: Connection closed.";
    };
    // receive data from the server!
    socket.onmessage = function (evt) {
        status.innerHTML = "Status: Kinect data received.";
        // get the data in JSON format.
        var jsonObject = eval('(' + evt.data + ')');
        // let's process it
        processMessage(jsonObject);
    };
});
/* processMessage */
function processMessage(jsonObject) {
    if (window.processKinect === false) return;
    if ($.isArray(jsonObject) && jsonObject[0] && jsonObject[0].kinectone) {
        var jsonObjectArray = jsonObject;
        jsonObject = {
            skeletons: [],
            converted: true
        };
        for (var i in jsonObjectArray) {
            jsonObject.skeletons[i] = {
                id: jsonObjectArray[i].TrackingId,
                joints: []
            };
            for (var j in mapNewToOldJoints) {
                jsonObject.skeletons[i].joints.push({
                    name: mapNewToOldJoints[j],
                    state: mapTrackingStates[jsonObjectArray[i].joints[j].state],
                    x: jsonObjectArray[i].joints[j].x,
                    y: jsonObjectArray[i].joints[j].y,
                    z: jsonObjectArray[i].joints[j].z
                });
            }
        }
    }
    //console.log(jsonObject);
    // check whether message contains skeleton data
    if (jsonObject.skeletons != undefined) {
        // clearing canvas before drawing a new frame
        //context0.clearRect(0, 0, canvas0.width, canvas0.height);
        // instead, fill backgound white before every frame
        context0.fillStyle = "#FFF";
        context0.fillRect(0, 0, canvas0.width, canvas0.height);

        var trackedCounter = 0,
            inferredCounter = 0;

        // iterate over all skeletons contained in skeleton array
        for (var i = 0; i < jsonObject.skeletons.length; i++) {
            // TODO use skeleton ID to distinguish different skeletons
            // ! skeleton ID can only be used for two different skeletons in same recording !	
            // 2 different skeletons in same recording are guaranteed to have 2 different ID's
            //var skeletonId = jsonObject.skeletons[i].id; 			
            // console.log("Skeleton ID: " + skeletonId);
            // iterate over all joints of skeleton i
            for (var j = 0; j < jsonObject.skeletons[i].joints.length; j++) {
                // get joint with its x and y coordinates for drawing
                var joint = jsonObject.skeletons[i].joints[j],
                    tStamp = jsonObject.skeletons[i].timestamp,
                    cNumber = jsonObject.skeletons[i].canvas,
                    skeletonId = jsonObject.skeletons[i].id,
                    trackingOrder = jsonObject.skeletons[i].order;
                //JOINT MAPPING OLD KINECT TO NEW KINECT
                joint.name = mapNewToOldJoints[joint.name];
                //console.log("skeleton: " + jsonObject.skeletons[i].timestamp);
                // TODO improve this	
                // draw skeleton frame either on canvas 0 or 1
                if (skeletonId > 0) {
                    drawSkeleton(joint, context0, null, selected, trackingOrder);
                }
                // console.log("time1: " + tStamp);
                //$("#slider0").slider("value", tStamp);
                // $("#beginTimer0").html(tStamp);
                // compute tracking ratio
                if (joint.state == "Inferred") {
                    inferredCounter++;
                }
                else {
                    trackedCounter++;
                }
                $('#trackedRatio').text("Tracked: " + Math.round((100 / (trackedCounter + inferredCounter)) * trackedCounter) + "%");
            }
        }

        // compute frame rate on the basis of the number of skeleton frames received and displayed per second
        MYVAR.timestamp = Math.round(new Date().getTime() / 1000);
        if (MYVAR.timestamp === MYVAR.previousTimestamp) {
            MYVAR.fpsCounter++;
        }
        else {
            MYVAR.fps = MYVAR.fpsCounter;
            MYVAR.previousTimestamp = Math.round(new Date().getTime() / 1000);
            MYVAR.fpsCounter = 0;
            //MYVAR.fpsElement.innerHTML = MYVAR.fps + " fps";
        }
    }
    else if (jsonObject.Finished != undefined) {
        processFinishedMessage(jsonObject);
    }
}

function storeCoordinates(xVal, yVal, array) {
    array.push({
        x: xVal,
        y: yVal
    });
    array.sort(function (a, b) {
        return a.x - b.x
    });
}

function removeCoordinates(xVal, yVal, array) {
    var index = arrayObjectIndexOf(array, xVal, "x")
    if (index > -1) {
        array.splice(index, 1);
    }
}

function arrayObjectIndexOf(array, searchTerm, property) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (array[i][property] === searchTerm) return i;
    }
    return -1;
}

/**
 * Reset play buttons and save analysis output (if available) at end of replay
 */
function processFinishedMessage(jsonObject) {
    dict.spine = 0; // handling switch from default to seated mode when replaying
    // replay is finished: update timeline play button and slider
    if (jsonObject.Finished[0] == 0) {
        MYVAR.firstSkeleton0 = 0;
    }
    else {
        MYVAR.firstSkeleton1 = 0;
    }
}
/**
 * handler for both play buttons 
 * @param {int} timeline number of timeline
 */
function playButtonHandler(timeline) {
    // change play icon to pause icon and  only execute the following
    // code when play was pressed, do nothing when pause was pressed
    var recId, time;
    if (timeline == 0) {
        if ($('#button-icon0').hasClass('icon-play')) {
            // currently paused, now playing
            $('#button-icon0').removeClass('icon-play');
            $('#button-icon0').addClass('icon-pause');
            recId = MYVAR.playedOnCanvas0;
            if (recId) {
                time = $('#slider0').slider("option", "value");
                var replay = {
                    id: recId,
                    canvas: 0,
                    timestamp: time
                };
                // send replay command to server and play audio
                socket.send(commands.recordings.replay + JSON.stringify(replay));
                if (MYVAR.audioFile0 && MYVAR.audio0Enabled) {
                    MYVAR.audioFile0.currentTime = time;
                    MYVAR.audioFile0.play();
                }
            }
        }
        else if ($('#button-icon0').hasClass('icon-pause')) {
            // currently playing, now pausing
            $('#button-icon0').removeClass('icon-pause');
            $('#button-icon0').addClass('icon-play');
            // pause Audio 
            if (MYVAR.audioFile0) MYVAR.audioFile0.pause();
            var pause = {
                    id: MYVAR.playedOnCanvas0
                }
                //console.log("Pause. Sending " + commands.timeline.stopReplaying + JSON.stringify(pause));
            socket.send(commands.timeline.stopReplaying + JSON.stringify(pause));
            dict.spine = 0; // handling switch from default to seated mode when replaying
        }
    }
    else if (timeline == 1) {
        if ($('#button-icon1').hasClass('icon-play')) {
            // currently paused, now playing
            $('#button-icon1').removeClass('icon-play');
            $('#button-icon1').addClass('icon-pause');
            recId = MYVAR.playedOnCanvas1;
            if (recId) {
                time = $('#slider1').slider("option", "value");
                var replayJson = {
                    id: recId,
                    canvas: 1,
                    timestamp: time
                };
                // send replay command to server and play audio
                socket.send(commands.recordings.replay + JSON.stringify(replayJson));
                if (MYVAR.audioFile1 && MYVAR.audio1Enabled) {
                    MYVAR.audioFile1.currentTime = time;
                    MYVAR.audioFile1.play();
                }
            }
        }
        else if ($('#button-icon1').hasClass('icon-pause')) {
            // currently playing, now pausing
            $('#button-icon1').removeClass('icon-pause');
            $('#button-icon1').addClass('icon-play');
            // pause Audio 
            if (MYVAR.audioFile1) MYVAR.audioFile1.pause();
            var pause = {
                    id: MYVAR.playedOnCanvas1
                }
                // console.log("Pause. Sending " + commands.timeline.stopReplaying + JSON.stringify(pause));
            socket.send(commands.timeline.stopReplaying + JSON.stringify(pause));
            dict.spine = 0; // handling switch from default to seated mode when replaying			
        }
    }
}
/**
 * convert timeline x-value to timestamp in seconds
 */
function convertToTimestamp(xValue, timeline) {
    if (timeline == 0) {
        return (xValue / 600) * MYVAR.totalRecordingSeconds0;
    }
    else if (timeline == 1) {
        return (xValue / 600) * MYVAR.totalRecordingSeconds1;
    }
}
/**
 * handler for both speed plus buttons
 * @param {int} timeline number
 */
function speedPlusButtonHandler(timeline) {
    var recId = assignRecId(timeline);
    var speed = {
            id: recId
        }
        // console.log("SpeedUp. Sending " + commands.timeline.speedUp + JSON.stringify(speed));
    socket.send(commands.timeline.speedUp + JSON.stringify(speed));
}
/**
 * handler for both speed minus buttons
 * @param {int} timeline number
 */
function speedMinusButtonHandler(timeline) {
    var recId = assignRecId(timeline);
    var speed = {
            id: recId
        }
        // console.log("SlowDown. Sending " + commands.timeline.slowDown + JSON.stringify(speed));
    socket.send(commands.timeline.slowDown + JSON.stringify(speed));
}
/**
 * return id of recording that is currently playing on given timeline
 * @param {int} timeline number
 */
function assignRecId(timeline) {
    var recId;
    if (timeline == 0) {
        recId = MYVAR.playedOnCanvas0;
    }
    else if (timeline == 1) {
        recId = MYVAR.playedOnCanvas1;
    }
    return recId;
}
/**
 * set max slider position of given timeline based on the total duration of a recording
 * @param {string} duration
 * @param {int} timeline number	
 */
function prepareSlider(duration, timeline, id) {
    //console.log("Preparing slider. Duration:" + duration + ", timeline: " + timeline);
    var n = duration.split(":");
    //n[0] hours : n[1] minutes : n[2] seconds
    //extract total seconds from duration 
    //console.log("Setting slider to totalRecSecs: " + MYVAR.totalRecordingSeconds0);
    //set max value = total seconds of recording time 	
    var totalSecs = parseInt(n[0] * 3600, 10) + parseInt(n[1] * 60, 10) + parseInt(n[2], 10);
    if (timeline == undefined) {
        if (MYVAR.useSecondCanvas) {
            MYVAR.totalRecordingSeconds1 = totalSecs;
            $("#slider1").slider("option", "max", totalSecs);
            $("#timer1").html(duration);
            $("#playId1").html("recording " + id);
        }
        else {
            MYVAR.totalRecordingSeconds0 = totalSecs;
            $("#slider0").slider("option", "max", totalSecs);
            $("#timer0").html(duration);
            $("#playId0").html("recording " + id);
        }
    }
    else {
        if (timeline == 1) {
            MYVAR.totalRecordingSeconds1 = totalSecs;
            $("#slider1").slider("option", "max", totalSecs);
            $("#timer1").html(duration);
            $("#playId1").html("recording " + id);
        }
        else {
            MYVAR.totalRecordingSeconds0 = totalSecs;
            $("#slider0").slider("option", "max", totalSecs);
            $("#timer0").html(duration);
            $("#playId0").html("recording " + id);
        }
    }
}
/**
 * send record command to server
 */
function record() {
    socket.send(commands.recordings.record);
    var recordButton = document.getElementById("RecordButton");
    if (recordButton.innerHTML == "Record") {
        recordButton.innerHTML = "Stop";
        recordButton.setAttribute("class", "btn btn-danger");
        evaluateRealTimeScript();
    }
    else if (recordButton.innerHTML == "Stop") {
        recordButton.innerHTML = "Record";
        recordButton.setAttribute("class", "btn");
    }
}
/**
 * send auto record command to server
 */
function autoRecord() {
    var recordingLabel;
    var recordButton = document.getElementById("AutoRecordButton");
    if (recordButton.innerHTML == "Auto Record") {
        recordButton.innerHTML = "Stop Auto Recording";
        recordButton.setAttribute("class", "btn btn-danger");
        recordingLabel = prompt("Enter a recording label for auto recordings:");
        evaluateRealTimeScript();
    }
    else if (recordButton.innerHTML == "Stop Auto Recording") {
        recordButton.innerHTML = "Auto Record";
        recordButton.setAttribute("class", "btn");
    }
    var autoRecord = {
        recordingLabel: recordingLabel
    }
    console.log("sending auto recording command to server: " + commands.recordings.autoRecord + JSON.stringify(autoRecord));
    socket.send(commands.recordings.autoRecord + JSON.stringify(autoRecord));
}
/**
 * toggle useSecondCanvas flag that indicates whether the second canvas is used or not
 */
function toggleUseSecondCanvas(timeline) {
    if (timeline == 0) {
        if ($("#canvas-checkbox1").is(":checked")) {
            $("#canvas-checkbox1").prop("checked", false);
            MYVAR.useSecondCanvas = false;
        }
        else {
            $("#canvas-checkbox1").prop("checked", true);
            MYVAR.useSecondCanvas = true;
        }
    }
    else if (timeline == 1) {
        if ($("#canvas-checkbox0").is(":checked")) {
            $("#canvas-checkbox0").prop("checked", false);
            MYVAR.useSecondCanvas = true;
        }
        else {
            $("#canvas-checkbox0").prop("checked", true);
            MYVAR.useSecondCanvas = false;
        }
    }
}
/**
 * clear both canvas and timelines too
 */
function clearCanvas() {
    canvas0.width = canvas0.width;
    canvas1.width = canvas1.width;
    // not sure whether it makes sense to clear timeline and annotations as well...
    timelineCanvas0.width = timelineCanvas0.width;
    timelineCanvas1.width = timelineCanvas1.width;
    annotationCanvas0.width = annotationCanvas0.width;
    annotationCanvas1.width = annotationCanvas1.width;
    // TODO when clearing annotation canvas we also need to clear the cache (xArray, yArray etc.)
    // var c = document.getElementById("annotationCanvas0");
    // c.width = c.width;
    // destroy heatmap canvas if it exists 
    var containerDiv = document.getElementById("canvasContainer"),
        heatmapCanvas = containerDiv.getElementsByTagName("CANVAS")[2];
    if (heatmapCanvas) {
        containerDiv.removeChild(heatmapCanvas);
    }
    MYVAR.heatmapCanvasInitialized = false;
    // TODO improve this
    var parent = document.getElementById("canvasContainer");
    var descendants = parent.getElementsByTagName("canvas");
    if (descendants[2]) {
        descendants[2].width = descendants[2].width;
    }
}
/**
 * returns true if recording on given timeline is part of currently selected analysis 
 */
function isRecordingInCurrentAnalysis(timeline) {
    var result = false;
    $('.draggableRecId').each(function (index, value) {
        //console.log("Value: " + value.innerHTML + ", MYVAR.playedOnCanvas0: " + MYVAR.playedOnCanvas0);
        if (timeline == 0 && value.innerHTML == MYVAR.playedOnCanvas0) {
            result = true;
        }
        if (timeline == 1 && value.innerHTML == MYVAR.playedOnCanvas1) {
            result = true;
        }
    });
    return result;
}
/**
 * handler for dropping recId on timeline; used for preparing timeline for replay
 */
function handleAnnotationCanvasDrop(ui, timeline) {
    // console.log("Handling rec Id drop on timeline " + timeline);
    var recordingId = ui.draggable.text();
    // clear time line section selector
    $("#timelineSectionSelector").html('');
    $("#timelineSectionSelector").multiselect('rebuild');
    if (timeline == 0) {
        // prepare timeline 0 for playing dropped recording and display stored timeline annotations
        MYVAR.playedOnCanvas0 = recordingId;
        MYVAR.isAnalysisEnabled = false;
        MYVAR.useSecondCanvas = false;
        prepareSlider($("#recordingId" + recordingId).attr("data-duration"), 0, recordingId);
        $("#slider0").slider("value", 0);
        annotationCanvas0.width = annotationCanvas0.width;
        timelineAnnotation0.x1Array.length = 0;
        timelineAnnotation0.x2Array.length = 0;
        timelineAnnotation0.tagArray.length = 0;
        getTimelineAnnotations(MYVAR.lastAnalysis, recordingId, 0);
        // select T1 checkbox and store recording id in recArray
        var $select0 = $('#recordingSelectTimeline0' + recordingId);
        $select0.prop("checked", true);
        recArray[0] = $select0.val();
    }
    else if (timeline == 1) {
        // prepare timeline 1 for playing dropped recording and display stored timeline annotations
        MYVAR.playedOnCanvas1 = recordingId;
        MYVAR.isAnalysisEnabled = false;
        //MYVAR.useSecondCanvas = false; 
        prepareSlider($("#recordingId" + recordingId).attr("data-duration"), 1, recordingId);
        $("#slider1").slider("value", 0);
        annotationCanvas1.width = annotationCanvas1.width;
        timelineAnnotation1.x1Array.length = 0;
        timelineAnnotation1.x2Array.length = 0;
        timelineAnnotation1.tagArray.length = 0;
        getTimelineAnnotations(MYVAR.lastAnalysis, recordingId, 1);
        var $select1 = $('#recordingSelectTimeline1' + recordingId);
        $select1.prop("checked", true);
        recArray[1] = $select1.val();
    }
}
/**
 * handler for mousemove event on timeline: used for drawing annotation rectangle or displaying annotation popover
 */
function handleAnnotationCanvasMousemove(xNow, timeline) {
    var annotationContext = (timeline == 0) ? con0 : con1;
    if (timeline == 0) {
        if (timelineAnnotation0.inAnnotationMode) {
            // redraw canvas with stored annotations 
            drawTimelineAnnotations(timelineAnnotation0.x1Array, timelineAnnotation0.x2Array, annotationContext, 0);
            // set width of annotation rectangle and draw it
            timelineAnnotation0.rectWidth = Math.abs(timelineAnnotation0.x1 - xNow);
            if (timelineAnnotation0.rectWidth < 10) {
                timelineAnnotation0.rectWidth = 10;
            }
            annotationContext.fillRect(timelineAnnotation0.x1, 0, timelineAnnotation0.rectWidth, annotationCanvas0.height);
        }
        else {
            // not in annotation mode, i.e. we are displaying existing annotations		
            var data = undefined;
            for (var i = 0; i < timelineAnnotation0.x1Array.length; i++) {
                if (xNow > timelineAnnotation0.x1Array[i] && xNow < timelineAnnotation0.x2Array[i]) {
                    data = timelineAnnotation0.tagArray[i];
                }
            }
            if (data) { // only display popover if annotations are available
                annotationCanvas0.setAttribute("data-content", data);
                $('#annotationCanvas0').popover('show');
            }
            else {
                $('#annotationCanvas0').popover('hide');
            }
        }
    }
    else if (timeline == 1) {
        if (timelineAnnotation1.inAnnotationMode) {
            // redraw canvas with stored annotations 
            drawTimelineAnnotations(timelineAnnotation1.x1Array, timelineAnnotation1.x2Array, annotationContext, 1);
            // set width of annotation rectangle and draw it
            timelineAnnotation1.rectWidth = Math.abs(timelineAnnotation1.x1 - xNow);
            if (timelineAnnotation1.rectWidth < 10) {
                timelineAnnotation1.rectWidth = 10;
            }
            annotationContext.fillRect(timelineAnnotation1.x1, 0, timelineAnnotation1.rectWidth, annotationCanvas1.height);
        }
        else {
            // not in annotation mode, i.e. we are displaying existing annotations		
            var data = undefined;
            for (var i = 0; i < timelineAnnotation1.x1Array.length; i++) {
                if (xNow > timelineAnnotation1.x1Array[i] && xNow < timelineAnnotation1.x2Array[i]) {
                    data = timelineAnnotation1.tagArray[i];
                }
            }
            if (data) { // only display popover if annotations are available
                annotationCanvas1.setAttribute("data-content", data);
                $('#annotationCanvas1').popover('show');
            }
            else {
                $('#annotationCanvas1').popover('hide');
            }
        }
    }
}
/**
 * handler for mouseup event on given timeline; used for creating a new timeline annotation
 */
function handleAnnotationCanvasMouseup(timeline) {
    //console.log("Handling annotation canvas mouseup for timeline " + timeline);
    if (timeline == 0 && timelineAnnotation0.inAnnotationMode) {
        annotationCanvas0.width = annotationCanvas0.width;
        var tag = prompt("Enter an annotation:");
        timelineAnnotation0.inAnnotationMode = false;
        if (tag) {
            var x2 = timelineAnnotation0.x1 + timelineAnnotation0.rectWidth;
            console.log(timelineAnnotation0.x1 + ", " + timelineAnnotation0.rectWidth)
            timelineAnnotation0.x1Array.push(timelineAnnotation0.x1);
            timelineAnnotation0.x2Array.push(x2);
            timelineAnnotation0.tagArray.push(tag);
            var annotation = {
                analysisId: MYVAR.lastAnalysis,
                recordingId: MYVAR.playedOnCanvas0,
                x1Coord: timelineAnnotation0.x1,
                x2Coord: x2,
                text: tag,
                timeline: 0
            };
            socket.send(commands.timeline.saveAnnotation + JSON.stringify(annotation));
            // console.log("Saving annotation: " + commands.timeline.saveAnnotation + JSON.stringify(annotation));
        }
        else {
            drawTimelineAnnotations(timelineAnnotation0.x1Array, timelineAnnotation0.x2Array, con0, 0);
        }
    }
    else if (timeline == 1 && timelineAnnotation1.inAnnotationMode) {
        annotationCanvas1.width = annotationCanvas1.width;
        var tag = prompt("Enter an annotation:");
        timelineAnnotation1.inAnnotationMode = false;
        if (tag) {
            var x2 = timelineAnnotation1.x1 + timelineAnnotation1.rectWidth;
            timelineAnnotation1.x1Array.push(timelineAnnotation1.x1);
            timelineAnnotation1.x2Array.push(x2);
            timelineAnnotation1.tagArray.push(tag);
            var annotation = {
                analysisId: MYVAR.lastAnalysis,
                recordingId: MYVAR.playedOnCanvas1,
                x1Coord: timelineAnnotation1.x1,
                x2Coord: x2,
                text: tag,
                timeline: 1
            };
            socket.send(commands.timeline.saveAnnotation + JSON.stringify(annotation));
            // console.log("Saving annotation: " + commands.timeline.saveAnnotation + JSON.stringify(annotation));
        }
        else {
            drawTimelineAnnotations(timelineAnnotation1.x1Array, timelineAnnotation1.x2Array, con1, 1);
        }
    }
}
/**
 * clear annotations on given timeline
 */
function clearTimelineAnnotations(timeline) {
    if (timeline == 0) {
        annotationCanvas0.width = annotationCanvas0.width
        timelineAnnotation0.x1Array.length = 0;
        timelineAnnotation0.x2Array.length = 0;
        timelineAnnotation0.tagArray.length = 0;
    }
    else if (timeline == 1) {
        annotationCanvas1.width = annotationCanvas1.width
        timelineAnnotation1.x1Array.length = 0;
        timelineAnnotation1.x2Array.length = 0;
        timelineAnnotation1.tagArray.length = 0;
    }
}
/**
 * draw skeleton on HTML canvas.
 * the skeleton structure is harcoded
 * @param {Object} joint 
 */
function drawSkeleton(joint, ctx, color, object, trackingOrder) {
    // do not draw a joint if it is not selected
    if (object[joint.name] == false) {
        dict[joint.name] = joint;
        return;
    }
    if (MYVAR.isAnalysisEnabled && MYVAR.isTraceEnabled) {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        if (ctx == context0) {
            if (selected0[joint.name] == false) {
                dict[joint.name] = joint;
                return;
            }
        }
    }
    else {
        // color 2 different skeletons differently and also consider inferred joints
        if (ctx == context0) {
            // first skeleton				
            if (trackingOrder == 1) {
                ctx.fillStyle = "#2F8956";
                ctx.strokeStyle = "#6CCD96";
            }
            else { //second skeleton		
                ctx.fillStyle = "#00EB85";
                ctx.strokeStyle = "#A8FFD1";
            }
            // different fill style for inferred joints 	
            if (joint.state == "Inferred") {
                ctx.fillStyle = "#D4EA43";
            }
        }
    }
    ctx.globalAlpha = 1;
    switch (joint.name) {
    case "hipcenter":
        ctx.beginPath();
        // ctx.arc(x,y,radius,startingAngle,endingAngle,counterclockwise);
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();
        dict.hipcenter = joint;
        break;
    case "spine":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        // TODO fix this
        if (MYVAR.isAnalysisEnabled) {
            if (!MYVAR.isTraceEnabled) {
                ctx.beginPath();
                // check whether hipcenter is being displayed, only draw line to hipcenter if
                // hipcenter is there
                if (object.hipcenter !== false) {
                    // moves the path to the specified point in the canvas without creating a line
                    ctx.moveTo(parseFloat(dict.hipcenter.x), parseFloat(dict.hipcenter.y));
                    ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
                    ctx.stroke();
                }
            }
        }
        else {
            ctx.beginPath();
            // check whether hipcenter is being displayed, only draw line to hipcenter if
            // hipcenter is there
            if (object.hipcenter !== false) {
                // moves the path to the specified point in the canvas without creating a line
                ctx.moveTo(parseFloat(dict.hipcenter.x), parseFloat(dict.hipcenter.y));
                ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
                ctx.stroke();
            }
        }
        ctx.closePath();
        dict.spine = joint;
        break;
    case "shouldercenter":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.spine !== false) {
            ctx.moveTo(parseFloat(dict.spine.x), parseFloat(dict.spine.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.shouldercenter = joint;
        break;
    case "head":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 15, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        // DEBUG
        //console.log("HEAD Y: " + joint.y);
        if (object.shouldercenter !== false) {
            ctx.moveTo(parseFloat(dict.shouldercenter.x), parseFloat(dict.shouldercenter.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.head = joint;
        break;
    case "shoulderleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.shouldercenter !== false) {
            ctx.moveTo(parseFloat(dict.shouldercenter.x), parseFloat(dict.shouldercenter.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.shoulderleft = joint;
        break;
    case "elbowleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.shoulderleft !== false) {
            ctx.moveTo(parseFloat(dict.shoulderleft.x), parseFloat(dict.shoulderleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.elbowleft = joint;
        break;
    case "wristleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.elbowleft !== false) {
            ctx.moveTo(parseFloat(dict.elbowleft.x), parseFloat(dict.elbowleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.wristleft = joint;
        break;
    case "handleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 10, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.wristleft !== false) {
            ctx.moveTo(parseFloat(dict.wristleft.x), parseFloat(dict.wristleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.handleft = joint;
        break;
    case "shoulderright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.shouldercenter !== false) {
            ctx.moveTo(parseFloat(dict.shouldercenter.x), parseFloat(dict.shouldercenter.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.shoulderright = joint;
        break;
    case "elbowright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.shoulderright !== false) {
            ctx.moveTo(parseFloat(dict.shoulderright.x), parseFloat(dict.shoulderright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.elbowright = joint;
        break;
    case "wristright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.elbowright !== false) {
            ctx.moveTo(parseFloat(dict.elbowright.x), parseFloat(dict.elbowright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.wristright = joint;
        break;
    case "handright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 10, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        // DEBUG
        //console.log("HandRIGHT Y: " + joint.y);
        if (object.wristright !== false) {
            ctx.moveTo(parseFloat(dict.wristright.x), parseFloat(dict.wristright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.handright = joint;
        break;
    case "hipleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.hipcenter !== false) {
            ctx.moveTo(parseFloat(dict.hipcenter.x), parseFloat(dict.hipcenter.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.hipleft = joint;
        break;
    case "kneeleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.hipleft !== false) {
            ctx.moveTo(parseFloat(dict.hipleft.x), parseFloat(dict.hipleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.kneeleft = joint;
        break;
    case "ankleleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.kneeleft !== false) {
            ctx.moveTo(parseFloat(dict.kneeleft.x), parseFloat(dict.kneeleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.ankleleft = joint;
        break;
    case "footleft":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.ankleleft !== false) {
            ctx.moveTo(parseFloat(dict.ankleleft.x), parseFloat(dict.ankleleft.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.footleft = joint;
        break;
    case "hipright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.hipcenter !== false) {
            ctx.moveTo(parseFloat(dict.hipcenter.x), parseFloat(dict.hipcenter.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.hipright = joint;
        break;
    case "kneeright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.hipright !== false) {
            ctx.moveTo(parseFloat(dict.hipright.x), parseFloat(dict.hipright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.kneeright = joint;
        break;
    case "ankleright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.kneeright !== false) {
            ctx.moveTo(parseFloat(dict.kneeright.x), parseFloat(dict.kneeright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.ankleright = joint;
        break;
    case "footright":
        ctx.arc(parseFloat(joint.x), parseFloat(joint.y), 6, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.beginPath();
        if (object.ankleright !== false) {
            ctx.moveTo(parseFloat(dict.ankleright.x), parseFloat(dict.ankleright.y));
            ctx.lineTo(parseFloat(joint.x), parseFloat(joint.y));
            ctx.stroke();
        }
        ctx.closePath();
        dict.footright = joint;
        break;
    }
}