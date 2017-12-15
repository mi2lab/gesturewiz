var _ = require("lodash");
var fs = require("fs");

exports.csv = function (req, res) {
    res.setHeader("content-type", "text/plain");

    if (!req.query || !req.query.fileNames) {
        res.send("No file names specified.");
        return;
    }

    var fileNames = req.query.fileNames.split(",");
    var file, fileName, fileParsed, fileWrapped;
    var selection;

    var o = "testSet,userAgent,windowHeight,windowWidth,gestureNumber,displayedGesture,injected,originalGesture,selectedGesture,correct,correctBinary,position,timeTaken\n";

    for (var i = 0; i < fileNames.length; ++i) {
        fileName = _.escape(fileNames[i]);
        file = fs.readFileSync(__dirname + "/../../public/" + fileName, {
            encoding: "UTF-8"
        });

        fileWrapped = "[" + file.replace(/(\r|\n)/g, "").slice(0, -1) + "]";
        fileParsed = JSON.parse(fileWrapped);

        for (var j = 0; j < fileParsed.length; ++j) {
            selection = fileParsed[j].selection;

            for (var l = 0; l < selection.length; ++l) {
                o += ("\"" + fileParsed[j].testSet + "\",");
                o += ("\"" + fileParsed[j].userAgent + "\",");
                o += (fileParsed[j].windowHeight + ",");
                o += (fileParsed[j].windowWidth + ",");
                o += ((l + 1) + ",");
                o += ("\"" + selection[l].dispGesture + "\",");
                o += ((selection[l].injected || "false") + ",");
                o += ("\"" + (selection[l].originalGesture || "") + "\",");
                o += ("\"" + selection[l].selGesture + "\",");
                o += ((selection[l].dispGesture === selection[l].selGesture) + ",");
                o += ((selection[l].dispGesture === selection[l].selGesture ? "1" : "0") + ",");
                o += (selection[l].position + ",");
                o += (selection[l].timeTaken + "\n");
            }
        }
    }

    res.send(o);
};

exports.onevsone = function (req, res) {
    res.setHeader("content-type", "text/plain");

    if (!req.query || !req.query.fileNames) {
        res.send("No file names specified.");
        return;
    }

    var fileNames = req.query.fileNames.split(",");
    var file, fileName, fileParsed, fileWrapped;
    var selection;

    var o = "testSet,gestureSet,testGesture,sampleGesture,time,same,correct\n";

    for (var i = 0; i < fileNames.length; ++i) {
        fileName = _.escape(fileNames[i]);
        file = fs.readFileSync(__dirname + "/../../public/" + fileName, {
            encoding: "UTF-8"
        });

        fileWrapped = "[" + file.replace(/(\r|\n)/g, "").slice(0, -1) + "]";
        fileParsed = JSON.parse(fileWrapped);

        for (var j = 0; j < fileParsed.length; ++j) {
            var correct = (fileParsed[j].testGesture === fileParsed[j].sampleGesture) === fileParsed[j].same;

            o += ("\"" + fileParsed[j].testSet + "\",");
            o += ("\"" + fileParsed[j].gestureSet + "\",");
            o += ("\"" + fileParsed[j].testGesture + "\",");
            o += ("\"" + fileParsed[j].sampleGesture + "\",");
            o += (fileParsed[j].time + ",");
            o += (fileParsed[j].same + ",");
            o += (correct + "\n");
        }
    }

    res.send(o);
};

exports.realtime = function (req, res) {
    res.setHeader("content-type", "text/plain");

    if (!req.query || !req.query.fileNames) {
        res.send("No file names specified.");
        return;
    }

    var fileNames = req.query.fileNames.split(",");
    var file, fileName, fileParsed, fileWrapped;
    var selection;

    var o = "gestureSet,inputGesture,detectedGesture,timeSinceStart,timeSinceEnd,correct\n";

    for (var i = 0; i < fileNames.length; ++i) {
        fileName = _.escape(fileNames[i]);
        file = fs.readFileSync(__dirname + "/../../public/" + fileName, {
            encoding: "UTF-8"
        });

        fileWrapped = "[" + file.replace(/(\r|\n)/g, "").slice(0, -1) + "]";
        fileParsed = JSON.parse(fileWrapped);

        for (var j = 0; j < fileParsed.length; ++j) {
            var correct = (fileParsed[j].inputGesture == fileParsed[j].detectedGesture[0].gesture);

            o += ("\"" + fileParsed[j].gestureSet + "\",");
            o += ("\"" + fileParsed[j].inputGesture + "\",");
            o += ("\"" + fileParsed[j].detectedGesture[0].gesture + "\",");
            o += (fileParsed[j].timeSinceGestureStart + ",");
            o += (fileParsed[j].timeSinceGestureEnd + ",");
            o += (correct + "\n");
        }
    }

    res.send(o);
};