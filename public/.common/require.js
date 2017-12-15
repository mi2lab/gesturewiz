const require = function (scripts, synchronous) {
    if (scripts.constructor !== Array) {
        scripts = [scripts];
    }

    const head = document.getElementsByTagName("head")[0];
    
    const requireSync = function(i, scripts, onload, onerror) {
        if (!scripts.length) {
            onload();
        }

        const src = expandSrc(scripts[i]);
        console.log("loading script", src);

        const scriptExists = document.querySelector("script[src='" + src + "']");
        const script = document.createElement("script");

        if (scriptExists) {
            console.warn("script already required", src);
            setTimeout(function() {
                if (i === scripts.length-1) {
                    onload();
                } else {
                    requireSync(i+1, scripts, onload, onerror);
                }
            }, 1000); // let's wait a second to be "sure"
        } else {
            script.src = src;
            script.onerror = function() {
                head.removeChild(document.querySelector("[src='" + scripts[i] + "']"));
                onerror();
            };
            script.onload = function() {
                if (i === scripts.length-1) {
                    onload();
                } else {
                    requireSync(i+1, scripts, onload, onerror);
                }
            };

            head.appendChild(script);
        }
    };

    if (synchronous) {
        return new Promise(function(resolve, reject) {
            requireSync(0, scripts, resolve, reject);
        });
    }

    // the asynchronous case
    return new Promise(function (resolve, reject) {
        if (!scripts.length) {
            resolve();
        }
        
        const checkComplete = function(i) {
            scripts[i] = true;

            for (let j=0; j<scripts.length; ++j) {
                if (scripts[j] !== true) {
                    return;
                }
            }

            resolve();
        };
        
        for (let i=0; i<scripts.length; ++i) {
            if (scripts[i].constructor === String) {
                const src = expandSrc(scripts[i]);
                console.log("loading script", src);

                const scriptExists = document.querySelector("script[src='" + src + "']");
                const script = document.createElement("script");

                if (scriptExists) {
                    console.warn("script already required", src);
                    setTimeout(function () {
                        checkComplete(i);
                    }, 1000); // let's wait a second to be "sure"
                } else {
                    script.src = src;
                    script.onerror = function() {
                        head.removeChild(document.querySelector("[src='" + scripts[i] + "']"));
                        reject();
                    };
                    script.onload = function() {
                        checkComplete(i);
                    };

                    head.appendChild(script);
                }
            } else if (scripts[i].constructor === Array) {
                requireSync(0, scripts[i], function() {
                    checkComplete(i);
                }, reject);
            }

            // DEPRECATED
            
            /*if (script) {
                console.warn("script already required", src);
                setTimeout(function () {
                    checkComplete(i);
                }, 1000); // let's wait a second to be "sure"
            } else {
                script = document.createElement("script");
                script.src = src;
                script.onerror = reject;
                script.onload = function () {
                    if (callback) {
                        callback(src);
                    }

                    resolveN(i);
                };

                head.appendChild(script);
            }*/
        }
    });
};

const expandSrc = function(src) {
    src = {
        "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js",
        "socket.io": "//cdnjs.cloudflare.com/ajax/libs/socket.io/1.7.3/socket.io.min.js",
        "fabric": "//cdnjs.cloudflare.com/ajax/libs/fabric.js/1.7.9/fabric.min.js"
    }[src] || src;
    
    if (!src.startsWith("http") && !src.startsWith("/") && !src.startsWith(".")) {
        if (!src.endsWith(".js")) {
            src += ".js";
        }
        
        src = "/.common/" + src;
    }
    
    return src;
};
