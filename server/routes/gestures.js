var _ = require("lodash");
var fs = require("fs");

// helper functions

var autoIncrement = function(lastId) {
    var addTrailingZero = function(number) {
        if (number < 10) {
            return "0" + number;
        }

        return "" + number;
    };

    var nextChar = function(c) {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }

    if (!lastId || !(lastId + "").match(/[a-z]\d\d/)) {
        return "a00";
    }

    var character = lastId.substr(0,1);
    var number = parseInt(lastId.substr(1));

    if (number === 99) {
        return nextChar(character) + "00";
    }

    return character + addTrailingZero(number + 1);
};

var setUpDir = function(name) {
    var dir = __dirname + "/../../public/mturk/recognition/img/user-defined/" + encodeURIComponent(name);
    
    // one-time set-up of "gestures" directory
    if (!fs.existsSync(__dirname + "/../../public/mturk/recognition/img/user-defined")) {
        fs.mkdirSync(__dirname + "/../../public/mturk/recognition/img/user-defined");
    }
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    return dir;
};

var saveDataUrl = function(dataUrl, dir, gestureSet, id) {
    var fileName = id + ".txt";
    var filePath = dir + "/" + fileName;

    var ext = dataUrl.startsWith("data:image/png") ? ".png" : ".gif";

    var fileNameImg = id + ext;
    var filePathImg = dir + "/" + fileNameImg;

    fs.writeFileSync(filePath, dataUrl);
    fs.writeFileSync(filePathImg, new Buffer(dataUrl.substring("data:image/png;base64,".length), "base64"));
    
    return '/mturk/recognition/img/user-defined/' + gestureSet + '/' + fileNameImg;
};

// the business logic

exports.delete = function(req, res) {
    if (!req.body || !req.body.src) {
        res.send(JSON.stringify({
            success: false,
            message: "No image source specified."
        }));
        
        return;
    }
    
    var srcArr = req.body.src.match(/\/mturk\/recognition\/img\/user-defined\/(.+)\/(.+)(\.[a-z]{3})/);
    
    if (srcArr) {
        var name = encodeURIComponent(srcArr[1]);
        var id = encodeURIComponent(srcArr[2]);
        var ext = encodeURIComponent(srcArr[3]);
        var dir = __dirname + "/../../public/mturk/recognition/img/user-defined/" + name + "/";
        var jsonFile = dir + id + ".txt";
        var imgFile = dir + id + ext;
        
        if (fs.existsSync(jsonFile)) {
            fs.unlinkSync(jsonFile);
            fs.unlinkSync(imgFile);
            
            res.send('{ "success": true }');
            
            return;
        }
    }
    
    res.send('{ "success": false }');
}

exports.save = function(req, res) {
    if (!req.body || !req.body.dataUrl || !req.body.name) {
        res.send(JSON.stringify({
            success: false,
            message: "No data URL and/or name for gesture set specified."
        }));
        
        return;
    }
    
    var dir = setUpDir(req.body.name);
    var existingFiles = fs.readdirSync(dir);
    var id = autoIncrement(existingFiles[existingFiles.length-1])
    
    var imgFile = saveDataUrl(req.body.dataUrl, dir, req.body.name, id);
    
    res.send(JSON.stringify({
        success: true,
        file: imgFile,
        id: id
    }));
};

exports.saveBulk = function(req, res) {
    if (!req.body || !req.body.dataUrls || !req.body.name) {
        res.send(JSON.stringify({
            success: false,
            message: "No data URLs and/or name for gesture set specified."
        }));
        
        return;
    }
    
    var name = req.body.name;
    var sources = req.body.dataUrls.split("|");
    
    for (var i=0; i<sources.length; ++i) {
        if (!sources[i].startsWith("data:")) {
            sources[i] = fs.readFileSync(__dirname + "/../../public" + sources[i].replace(/(png|gif)/g, "txt"), 'utf8');
        }
    }
    
    var dir = setUpDir(name);
    var existingFiles = fs.readdirSync(dir);

    if (existingFiles.length) {
        console.warn("Gesture set already exists and will be overridden.");
        
        for (var i=0; i<existingFiles.length; ++i) {
            fs.unlinkSync(dir + "/" + existingFiles[i]);
        }
    }
    
    var id;
    
    for (var i=0; i<sources.length; ++i) {
        id = autoIncrement(id);
        saveDataUrl(sources[i], dir, name, id);
    }
    
    res.send('{ "success": true }');
};

exports.get = function(req, res) {
    if (!req.query || !req.query.name) {
        res.send(JSON.stringify({
            success: false,
            message: "No name for gesture set specified."
        }));
        
        return;
    }
    
    var name = req.query.name;
    var dir = __dirname + "/../../public/mturk/recognition/img/user-defined/" + encodeURIComponent(name);
    
    if (!fs.existsSync(dir)) {
        res.send(JSON.stringify({
            success: false,
            message: "Gesture set does not exist."
        }));
    } else {
        var existingFiles = fs.readdirSync(dir);
        var imageFiles = [];
        
        for (var i=0; i<existingFiles.length; ++i) {
            if (existingFiles[i].indexOf(".txt") === -1) {
                imageFiles.push(existingFiles[i]);
            }
        }
        
        res.send(JSON.stringify({
            success: true,
            gestures: imageFiles
        }));
    }
};