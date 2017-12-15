;
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    }
    else if (typeof exports === "object") {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    }
    else {
        // Browser globals (root is window)
        root.WebRTC = factory();
    }
}(this, function () {
    "use strict";

    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
    window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    window.URL = window.URL || window.mozURL || window.webkitURL;
    window.navigator.getUserMedia = window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia;

    function WebRTC(options) {
        // do we have an existing instance?
        if (typeof WebRTC.instance === "object") {
            return WebRTC.instance;
        }

        // private vars

        const _peerConnections = {};
        const _peerConnectionConfig = {
            iceServers: [
                {
                    urls: "stun:stun.services.mozilla.com"
                },
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        };

        let _id;
        let _socket;
        let _streams;
        let _video;

        const self = this;

        // private functions

        const _createConnection = function (clientId) {
            WebRTC.log("creating WebRTC connection with", clientId);

            _peerConnections[clientId] = new RTCPeerConnection(_peerConnectionConfig);
            _peerConnections[clientId].onicecandidate = function (event) {
                _gotIceCandidate(event, clientId);
            };

            if (_streams.length) {
                for (let stream in _streams) {
                    self.addStream(_streams[stream], clientId);
                }

                _peerConnections[clientId].createOffer(function (description) {
                    _gotDescription(description, clientId);
                }, console.error);
            }

            _peerConnections[clientId].onaddstream = function (event) {
                if (_video) {
                    _video.srcObject = event.stream;
                }

                _onstream(event.stream);
            };
        };

        const _gotDescription = function (description, clientId) {
            WebRTC.log("got WebRTC description", description);

            _peerConnections[clientId].setLocalDescription(description, function () {
                _socket.emit("webRTC", {
                    forId: clientId,
                    id: _id,
                    sdp: description
                });
            }, console.warn);
        };

        const _gotIceCandidate = function (event, clientId) {
            WebRTC.log("got ICE candidate", event);

            if (event.candidate) {
                _socket.emit("webRTC", {
                    forId: clientId,
                    ice: event.candidate,
                    id: _id
                });
            }
        };

        const _gotMessageFromServer = function (msg) {
            const signal = msg;
            const clientId = signal.id;

            if (clientId && clientId === _id) {
                return;
            }

            WebRTC.log("got message from server", msg);

            let peerConnection = _peerConnections[clientId];

            if (!peerConnection) {
                peerConnection = _createConnection(clientId);
            }

            if (signal.broadcaster) {
                _socket.emit("webRTC", {
                    id: _id,
                    init: true
                });
            }

            if (signal.sdp && signal.forId === _id) {
                _peerConnections[clientId].setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {
                    if (signal.sdp.type === "offer") {
                        _peerConnections[clientId].createAnswer(function (description) {
                            _gotDescription(description, clientId);
                        }, console.warn);
                    }
                });
            }
            else if (signal.ice && signal.forId === _id) {
                if (!_peerConnections[clientId].remoteDescription.type) {
                    console.warn("remote description not set yet!");
                }

                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        };

        let _onstream = function (stream) {
            WebRTC.log("WebRTC stream received", stream);
        };

        // public functions

        this.addStream = function (stream, clientId) {
            if (!clientId) {
                if (_streams.filter(function (candidate) {
                        return candidate.id === stream.id;
                    }).length === 0) {
                    _streams.push(stream);
                }

                for (let remoteId in _peerConnections) {
                    self.addStream(stream, remoteId);
                }
            }
            else {
                WebRTC.log("adding WebRTC stream", stream, "to client", clientId);

                _peerConnections[clientId].addStream(stream);
            }

            return WebRTC;
        };

        this.init = function (a, b) {
            if (typeof a === "string") {
                console.warn("init function has changed: init(options)");
                b.id = a;
                a = b;
            }

            const options = a;

            WebRTC.log = options.log === true ? console.log : function (msg) { /* ignore msg */ };

            _id = options.id || "client" + Math.floor(Math.random() * 1000);
            _video = options.video;
            _streams = options.stream ? [options.stream] : [];
            _onstream = options.onstream || _onstream;
            _socket = options.socket;

            WebRTC.log("WebRTC init", _id);

            if (options.useAdapter) {
                require("//webrtc.github.io/adapter/adapter-latest.js");
            }

            require("socket.io").then(function () {
                if (!_socket) {
                    WebRTC.log("preparing socket");

                    _socket = io();

                    _socket.on("connect", function () {
                        _socket.emit("room", options.room || "webRTC");
                    });
                }

                WebRTC.log("starting WebRTC");

                _socket.on("webRTC", _gotMessageFromServer);

                _socket.emit("webRTC", {
                    broadcaster: !!options.stream,
                    id: _id,
                    init: true
                });
            });

            return WebRTC;
        };

        if (options) {
            this.init(options);
        }

        WebRTC.instance = this;
    }

    return WebRTC;
}));