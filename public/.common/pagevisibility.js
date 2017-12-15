;(function (root, factory) {
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
        root.PageVisibility = factory();
    }
}(this, function() {
    "use strict";
    
    function PageVisibility() {

        // do we have an existing instance?
        if (typeof PageVisibility.instance === "object") {
            return PageVisibility.instance;
        }

        const _hidden = "hidden";
        const _on = {};
        const _scope = this;

        const _onchange = function(evt) {
            let v = "visible",
                h = "hidden",
                evtMap = {
                    focus: v,
                    focusin: v,
                    pageshow: v,
                    blur: h,
                    focusout: h,
                    pagehide: h
                },
                state;

            evt = evt || window.event;
            if (evt.type in evtMap)
                state = evtMap[evt.type];
            else
                state = this[_hidden] ? "hidden" : "visible";

            if (state === "hidden") {
                if (_on.hidden) {
                    _on.hidden();
                }
            } else {
                if (_on.visible) {
                    _on.visible();
                }
            }
        };

        // Standards:
        if (_hidden in document)
            document.addEventListener("visibilitychange", _onchange);
        else if ((_hidden = "mozHidden") in document)
            document.addEventListener("mozvisibilitychange", _onchange);
        else if ((_hidden = "webkitHidden") in document)
            document.addEventListener("webkitvisibilitychange", _onchange);
        else if ((_hidden = "msHidden") in document)
            document.addEventListener("msvisibilitychange", _onchange);
        // IE 9 and lower:
        else if ("onfocusin" in document)
            document.onfocusin = document.onfocusout = _onchange;
        // All others:
        else
            window.onpageshow = window.onpagehide = window.onfocus = window.onblur = _onchange;

        this.on = function(event, callback) {
            _on[event] = callback;
            return _scope;
        };

        PageVisibility.instance = this;

    }
    
    return PageVisibility;
    
}));