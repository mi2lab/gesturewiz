;(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === "object") {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.LZW = factory();
    }
}(this, function() {
    "use strict";

    function LZW() {
        
        // https://github.com/psyked/LZW-js/blob/master/lzw.js
        
        this.encode = function(s) {
            var dict = {};
            var data = (s + "").split("");
            var out = [];
            var currChar;
            var phrase = data[0];
            var code = 256;
            var i, l;
            for (i = 1, l = data.length; i < l; i++) {
                currChar = data[i];
                if (dict[phrase + currChar] != null) {
                    phrase += currChar;
                }
                else {
                    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                    dict[phrase + currChar] = code;
                    code++;
                    phrase = currChar;
                }
            }
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            for (i = 0, l = out.length; i < l; i++) {
                out[i] = String.fromCharCode(out[i]);
            }
            
            return out.join("");
        };
        
        this.encodeObject = function(obj) {
            var encodedObject = JSON.stringify(obj);
            return this.encode(encodedObject);
        };
        
        this.decode = function(s) {
            var dict = {};
            var data = (s + "").split("");
            var currChar = data[0];
            var oldPhrase = currChar;
            var out = [currChar];
            var code = 256;
            var phrase;
            for (var i = 1; i < data.length; i++) {
                var currCode = data[i].charCodeAt(0);
                if (currCode < 256) {
                    phrase = data[i];
                }
                else {
                    phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
                }
                out.push(phrase);
                currChar = phrase.charAt(0);
                dict[code] = oldPhrase + currChar;
                code++;
                oldPhrase = phrase;
            }
            
            return out.join("");
        };
        
        this.decodeObject = function(str) {
            var decodedString = this.decode(str);
            return JSON.parse(decodedString);
        };
        
    }
    
    return LZW;
    
}));