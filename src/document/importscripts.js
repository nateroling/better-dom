import _ from "../util/index";
import { StaticMethodError } from "../errors";
import { $Document } from "../types";

/**
 * Import external scripts on the page and call optional callback when it will be done
 * @memberof DOM
 * @alias DOM.importScripts
 * @param {...String} urls       script file urls
 * @param {Function}  [callback] callback that is triggered when all scripts are loaded
 * @example
 * DOM.importScripts("http://cdn/script1.js", function() {
 *     // do something when the script is loaded
 * });
 * // loading several scripts sequentially
 * DOM.importScripts("http://cdn/script2.js", "http://cdn/script3.js");
 */
$Document.prototype.importScripts = function(...urls) {
    var doc = this[0].ownerDocument;

    var callback = () => {
        var arg = urls.shift(),
            argType = typeof arg,
            script;

        if (argType === "string") {
            script = doc.createElement("script");
            script.src = arg;
            script.onload = callback;
            script.async = true;

            _.injectElement(script);
        } else if (argType === "function") {
            arg();
        } else if (arg) {
            throw new StaticMethodError("importScripts", arguments);
        }
    };

    callback();
};
