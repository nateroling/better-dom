import { WINDOW } from "./const";
import { DOM } from "./types";

var _DOM = WINDOW.DOM;

/**
 * Restores original DOM namespace
 * @memberof DOM
 * @alias DOM.noConflict
 * @return {$Element} previous DOM namespace
 */
DOM.noConflict = function() {
    if (WINDOW.DOM === DOM) {
        WINDOW.DOM = _DOM;
    }

    return DOM;
};

WINDOW.DOM = DOM;
