/**************************/
/* The real Real$1 Stuff! */
/**************************/

function Real$1Client(uid) {
    
    // private variables
    
    const _on = {};
    const _scope = this;

    // private functions

    

    // socket.io set-up

    const _socket = io();

    _socket.on("connect", function () {
        console.log("Client:", uid);
        _socket.emit("client", uid);
    });

    _socket.on("real$1", function(msg) {
        if (msg.event) {
            switch (msg.event) {
                case "ongesture":
                    if (_on.gesture) {
                        _on.gesture(msg);
                    }
                break;
            }
        }
    });

    // public functions

    this.on = function(event, callback) {
        _on[event] = callback;

        return _scope;
    };

}

/**************************/