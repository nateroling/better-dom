import _ from "../helpers";
import { MethodError } from "../errors";
import { CSS3_ANIMATIONS, WEBKIT_PREFIX, LEGACY_ANDROID } from "../constants";
import { $Element } from "../types";
import CSS from "../util/stylehooks";

var ANIMATIONS_ENABLED = !LEGACY_ANDROID && CSS3_ANIMATIONS,
    TRANSITION_PROPS = ["timing-function", "property", "duration", "delay"].map((p) => "transition-" + p),
    TRANSITION_EVENT_TYPE = WEBKIT_PREFIX ? "webkitTransitionEnd" : "transitionend",
    parseTimeValue = (value) => {
        var result = parseFloat(value) || 0;
        // if duration is in seconds, then multiple result value by 1000
        return value.lastIndexOf("ms") === value.length - 2 ? result : result * 1000;
    },
    calcDuration = (style, prefix, iterationCount) => {
        var delay = CSS.get[prefix + "delay"](style).split(","),
            duration = CSS.get[prefix + "duration"](style).split(",");

        if (!iterationCount) iterationCount = CSS.get[prefix + "iteration-count"](style).split(",");

        return Math.max.apply(Math, duration.map((value, index) => {
            var it = iterationCount[index] || "1";
            // initial or empty value equals to 1
            return (it === "initial" ? 1 : parseFloat(it)) *
                parseTimeValue(value) + (parseTimeValue(delay[index]) || 0);
        }));
    },
    scheduleAnimation = (node, style, isHidden, done) => {
        var compStyle = _.computeStyle(node),
            animationDuration = calcDuration(compStyle, "animation-"),
            transitionDuration = calcDuration(compStyle, "transition-", []),
            duration = Math.max(transitionDuration, animationDuration);

        if (!duration) return false;

        var visibilityTransitionIndex, transitionValues, completeAnimation;

        transitionValues = TRANSITION_PROPS.map((prop, index) => {
            // have to use regexp to split transition-timing-function value
            return CSS.get[prop](compStyle).split(index ? ", " : /, (?!\d)/);
        });

        // try to find existing or use 0s length or make a new visibility transition
        visibilityTransitionIndex = transitionValues[1].indexOf("visibility");
        if (visibilityTransitionIndex < 0) visibilityTransitionIndex = transitionValues[2].indexOf("0s");
        if (visibilityTransitionIndex < 0) visibilityTransitionIndex = transitionValues[0].length;

        transitionValues[0][visibilityTransitionIndex] = "linear";
        transitionValues[1][visibilityTransitionIndex] = "visibility";
        transitionValues[isHidden ? 2 : 3][visibilityTransitionIndex] = "0s";
        transitionValues[isHidden ? 3 : 2][visibilityTransitionIndex] = duration + "ms";

        // now set target duration and delay
        transitionValues.forEach((value, index) => {
            CSS.set[TRANSITION_PROPS[index]](style, value.join(", "));
        });

        // make sure that the visibility property will be changed
        // so reset it to appropriate value with zero
        style.visibility = isHidden ? "visible" : "hidden";
        // use willChange to improve performance in modern browsers:
        // http://dev.opera.com/articles/css-will-change-property/
        style.willChange = transitionValues[1].join(", ");

        completeAnimation = (e) => {
            if (e.propertyName === "visibility" && e.target === node) {
                e.stopPropagation(); // this is an internal transition

                node.removeEventListener(TRANSITION_EVENT_TYPE, completeAnimation, false);

                style.willChange = ""; // remove temporary properties

                done();
            }
        };

        node.addEventListener(TRANSITION_EVENT_TYPE, completeAnimation, false);

        return true;
    },
    changeVisibility = (el, fn, callback) => () => {
        var node = el[0],
            style = node.style,
            displayValue = style.display,
            isHidden = typeof fn === "function" ? fn(node) : fn,
            done = () => {
                if (style.visibility === "hidden") {
                    style.display = "none";
                }

                if (callback) callback.call(el);
            },
            // Legacy Android is too slow and has a lot of bugs in the CSS animations
            // implementation, so skip animations for it (duration value is always zero)
            hasAnimation = ANIMATIONS_ENABLED && scheduleAnimation(node, style, isHidden, done);

        if (isHidden) {
            if (displayValue !== "none") {
                el._._visibility = displayValue;
                // we'll hide element later in the complete call
            }
        } else {
            if (displayValue === "none") {
                // restore visibility
                style.display = el._._visibility || "inherit";

                // Use offsetWidth to trigger reflow of the element
                // after changing from display:none
                //
                // Credits to Jonathan Snook's prepareTransition plugin:
                // https://github.com/snookca/prepareTransition
                //
                // We shouldn't change truthy of hasAnimation, so use ~
                if (hasAnimation) hasAnimation = ~node.offsetWidth;
            }
        }

        // trigger visibility transition when it exists
        style.visibility = isHidden ? "hidden" : "visible";
        // trigger native CSS animation
        el.set("aria-hidden", String(isHidden));
        // must be AFTER changing the aria-hidden attribute
        if (!hasAnimation) done();
    },
    makeVisibilityMethod = (name, fn) => function(delay, callback) {
        var len = arguments.length,
            delayType = typeof delay;

        if (len === 1 && delayType === "function") {
            callback = delay;
            delay = 0;
        }

        if (delay && (delayType !== "number" || delay < 0) ||
            callback && typeof callback !== "function") {
            throw new MethodError(name);
        }

        callback = changeVisibility(this, fn, callback);

        if (delay) {
            setTimeout(callback, delay);
        } else {
            callback();
        }

        return this;
    };

/**
 * Show element with optional callback and delay
 * @memberof! $Element#
 * @alias $Element#show
 * @param {Number}   [delay=0]  time in miliseconds to wait
 * @param {Function} [callback] function that executes when animation is done
 * @return {$Element}
 * @function
 */
$Element.prototype.show = makeVisibilityMethod("show", false);

/**
 * Hide element with optional callback and delay
 * @memberof! $Element#
 * @alias $Element#hide
 * @param {Number}   [delay=0]  time in miliseconds to wait
 * @param {Function} [callback] function that executes when animation is done
 * @return {$Element}
 * @function
 */
$Element.prototype.hide = makeVisibilityMethod("hide", true);

/**
 * Toggle element visibility with optional callback and delay
 * @memberof! $Element#
 * @alias $Element#toggle
 * @param {Number}   [delay=0]  time in miliseconds to wait
 * @param {Function} [callback] function that executes when animation is done
 * @return {$Element}
 * @function
 */
$Element.prototype.toggle = makeVisibilityMethod("toggle", function(node) {
    return node.getAttribute("aria-hidden") !== "true";
});
