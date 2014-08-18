/**
 * @file better-dom.js
 * @version 2.0.0-beta.1 2014-08-18T14:50:09
 * @overview Live extension playground
 * @copyright 2013-2014 Maksim Chemerisuk
 * @license MIT
 * @see https://github.com/chemerisuk/better-dom
 */
(function() {var SLICE$0 = Array.prototype.slice;
    "use strict";
    var constants$$WINDOW = window;
    var constants$$DOCUMENT = constants$$WINDOW.document;
    var constants$$HTML = constants$$DOCUMENT.documentElement;

    var constants$$userAgent = constants$$WINDOW.navigator.userAgent;

    var constants$$CSS3_ANIMATIONS = constants$$WINDOW.CSSKeyframesRule || !constants$$DOCUMENT.attachEvent;
    var constants$$LEGACY_ANDROID = ~constants$$userAgent.indexOf("Android") && constants$$userAgent.indexOf("Chrome") < 0;
    var constants$$DOM2_EVENTS = !!constants$$DOCUMENT.addEventListener;
    var constants$$WEBKIT_PREFIX = constants$$WINDOW.WebKitAnimationEvent ? "-webkit-" : "";
    var constants$$CUSTOM_EVENT_TYPE = "dataavailable";

    function errors$$MethodError(methodName) {var type = arguments[1];if(type === void 0)type = "$Element";
        this.message = type + "." + methodName + " was called with illegal arguments. Check http://chemerisuk.github.io/better-dom to verify the call";
    }

    errors$$MethodError.prototype = new TypeError();

    function errors$$StaticMethodError(methodName) {
        errors$$MethodError.call(this, methodName, "DOM");
    }

    errors$$StaticMethodError.prototype = new TypeError();

    var helpers$$arrayProto = Array.prototype,
        helpers$$currentScript = constants$$DOCUMENT.scripts[0];

    var helpers$$default = {
        computeStyle: function(node)  {
            return constants$$WINDOW.getComputedStyle ? constants$$WINDOW.getComputedStyle(node) : node.currentStyle;
        },
        injectElement: function(el)  {
            return helpers$$currentScript.parentNode.insertBefore(el, helpers$$currentScript);
        },
        // utilites
        slice: helpers$$arrayProto.slice,
        every: helpers$$arrayProto.every,
        each: helpers$$arrayProto.forEach,
        some: helpers$$arrayProto.some,
        filter: helpers$$arrayProto.filter,
        map: helpers$$arrayProto.map,
        isArray: Array.isArray,
        keys: Object.keys
    };

    /**
     * Used to represent a DOM element
     * @class $Element
     * @private
     */
    function types$$$Element(node) {
        if (node && node.__dom__) return node.__dom__;

        if (this instanceof types$$$Element) {
            if (node) {
                node.__dom__ = this;

                this[0] = node;
            }

            this._ = { _handlers: [], _watchers: {}, _visibility: "" };
        } else {
            return new types$$$Element(node);
        }
    }

    types$$$Element.prototype.toString = function() {
        var node = this[0];

        return node ? node.tagName.toLowerCase() : "";
    };

    /**
     * Global object to access DOM
     * @namespace DOM
     * @extends $Element
     */
    var types$$DOM = new types$$$Element(constants$$HTML);

    types$$DOM.version = "2.0.0-beta.1";

    constants$$WINDOW.DOM = types$$DOM;

    /**
     * Creates Array of {@link $Element} instances from a native object(s)
     * @memberof DOM
     * @alias DOM.constructor
     * @param  {Mixed}  nodes  native HTMLElement or Array-like collection of HTMLElement
     * @return {Array} collection of {@link $Element} instances
     */
    types$$DOM.constructor = function(nodes) {
        if (!nodes) return [];

        if ("nodeType" in nodes) {
            nodes = [ nodes ];
        } else if ( !("length" in nodes) ) {
            throw new errors$$StaticMethodError("constructor");
        }

        return helpers$$default.map.call(nodes, types$$$Element);
    };

    var dom$dom$create$$reTest = /^(?:[a-zA-Z-]+|\s*(<.+>)\s*)$/,
        dom$dom$create$$sandbox = constants$$DOCUMENT.createElement("body");

    /**
     * Create a new DOM element in memory
     * @memberof DOM
     * @alias DOM.create
     * @param  {String}       value     EmmetString or HTMLString
     * @param  {Object|Array} [varMap]  key/value map of variables
     * @return {$Element} element wrapper
     */
    types$$DOM.create = function(value, varMap, /*INTERNAL*/all) {
        var test = dom$dom$create$$reTest.exec(value),
            nodes;

        if (value && test && !test[1]) {
            nodes = [ constants$$DOCUMENT.createElement(value) ];
        } else {
            if (test && test[1]) {
                value = varMap ? types$$DOM.format(test[1], varMap) : test[1];
            } else if (typeof value === "string") {
                value = types$$DOM.emmet(value, varMap);
            } else {
                throw new errors$$StaticMethodError("create");
            }

            dom$dom$create$$sandbox.innerHTML = value;

            for (nodes = []; value = dom$dom$create$$sandbox.firstChild; dom$dom$create$$sandbox.removeChild(value)) {
                if (value.nodeType === 1) nodes.push(value);
            }
        }

        if (all) {
            return helpers$$default.map.call(nodes, types$$$Element);
        } else {
            return types$$$Element(nodes[0]);
        }
    };

    /**
     * Create a new DOM elements in memory
     * @memberof DOM
     * @alias DOM.createAll
     * @param  {String}       value     EmmetString or HTMLString
     * @param  {Object|Array} [varMap]  key/value map of variables
     * @return {Array} elements wrapper
     */
    types$$DOM.createAll = function(value, varMap) {
        return types$$DOM.create(value, varMap, true);
    };

    /*es6-transpiler has-iterators:false, has-generators: false*/

    var // operator type / priority object
        dom$dom$emmet$$operators = {"(": 1,")": 2,"^": 3,">": 4,"+": 4,"*": 5,"`": 6,"]": 5,"[": 6,".": 7,"#": 8},
        dom$dom$emmet$$reAttr = /([\w\-]+)(?:=((?:(`|')((?:\\?.)*)?\3)|[^\s]+))?/g,
        dom$dom$emmet$$reIndex = /(\$+)(?:@(-)?(\d+)?)?/g,
        // populate empty tags
        dom$dom$emmet$$tagCache = "area base br col hr img input link meta param command keygen source".split(" ").reduce(function(tagCache, tag)  {
            tagCache[tag] = "<" + tag + ">";

            return tagCache;
        }, {}),
        dom$dom$emmet$$toString = function(term)  {return term.join ? term.join("") : term},
        dom$dom$emmet$$normalizeAttrs = function(term, name, value, quotes, rawValue)  {
            if (!quotes || quotes === "`") quotes = "\"";
            // always wrap attribute values with quotes if they don't exist
            // replace ` quotes with " except when it's a single quotes case
            return name + "=" + quotes + (rawValue || value || name) + quotes;
        },
        dom$dom$emmet$$injectTerm = function(term, first)  {return function(el)  {
            var index = first ? el.indexOf(">") : el.lastIndexOf("<");
            // inject term into the html string
            return el.substr(0, index) + term + el.substr(index);
        }},
        dom$dom$emmet$$makeTerm = function(tag)  {
            var result = dom$dom$emmet$$tagCache[tag];

            if (!result) result = dom$dom$emmet$$tagCache[tag] = "<" + tag + "></" + tag + ">";

            return result;
        },
        dom$dom$emmet$$makeIndexedTerm = function(n, term)  {
            var result = [], i;

            for (i = 0; i < n; ++i) {
                result.push(term.replace(dom$dom$emmet$$reIndex, function(expr, fmt, sign, base)  {
                    var index = (sign ? n - i - 1 : i) + (base ? +base : 1);
                    // handle zero-padded strings
                    return (fmt + index).slice(-fmt.length).split("$").join("0");
                }));
            }

            return result;
        };

    /**
     * Parse emmet-like template and return resulting HTML string
     * @memberof DOM
     * @alias DOM.emmet
     * @param  {String}       template  input EmmetString
     * @param  {Object|Array} [varMap]  key/value map of variables
     * @return {String} HTML string
     * @see https://github.com/chemerisuk/better-dom/wiki/Microtemplating
     * @see http://docs.emmet.io/cheat-sheet/
     */
    types$$DOM.emmet = function(template, varMap) {var $D$0;var $D$1;
        if (typeof template !== "string") throw new errors$$StaticMethodError("emmet");
        // handle varMap
        if (varMap) template = types$$DOM.format(template, varMap);

        var stack = [],
            output = [],
            term = "",
            priority, skip, node, str;

        if (template in dom$dom$emmet$$tagCache) return dom$dom$emmet$$tagCache[template];

        // if (!template || reHtml.exec(template)) return template;

        // parse expression into RPN

        $D$0 = 0;$D$1 = template.length;for (str ; $D$0 < $D$1; ){str = (template[$D$0++]);
            // concat .c1.c2 into single space separated class string
            if (str === "." && stack[0] === ".") str = " ";

            priority = dom$dom$emmet$$operators[str];

            if (priority && (!skip || skip === str)) {
                // fix for a>`text`+b
                if (str === "+" && stack[0] === "`") str = ">";
                // remove redundat ^ operators from the stack when more than one exists
                if (str === "^" && stack[0] === "^") stack.shift();

                if (term) {
                    output.push(term);
                    term = "";
                }

                if (str !== "(") {
                    while (dom$dom$emmet$$operators[stack[0]] > priority) {
                        output.push(stack.shift());
                        // for ^ operator stop shifting when the first > is found
                        if (str === "^" && output[output.length - 1] === ">") break;
                    }
                }

                if (str === ")") {
                    stack.shift(); // remove "(" symbol from stack
                } else if (!skip) {
                    stack.unshift(str);

                    if (str === "[") skip = "]";
                    if (str === "`") skip = "`";
                } else {
                    skip = false;
                }
            } else {
                term += str;
            }
        };$D$0 = $D$1 = void 0;

        if (term) {
            // handle single tag case
            if (!output.length && !stack.length) return dom$dom$emmet$$makeTerm(term);

            output.push(term);
        }

        output = output.concat(stack);

        // transform RPN into html nodes

        stack = [];

        $D$0 = 0;$D$1 = output.length;for (str ; $D$0 < $D$1; ){str = (output[$D$0++]);
            if (str in dom$dom$emmet$$operators) {
                term = stack.shift();
                node = stack.shift() || [""];

                if (typeof node === "string") node = [ dom$dom$emmet$$makeTerm(node) ];

                switch(str) {
                case ".":
                    term = dom$dom$emmet$$injectTerm(" class=\"" + term + "\"", true);
                    break;

                case "#":
                    term = dom$dom$emmet$$injectTerm(" id=\"" + term + "\"", true);
                    break;

                case "[":
                    term = dom$dom$emmet$$injectTerm(" " + term.replace(dom$dom$emmet$$reAttr, dom$dom$emmet$$normalizeAttrs), true);
                    break;

                case "`":
                    term = dom$dom$emmet$$injectTerm(term);
                    break;

                case "*":
                    node = dom$dom$emmet$$makeIndexedTerm(+term, dom$dom$emmet$$toString(node));
                    break;

                default:
                    term = typeof term === "string" ? dom$dom$emmet$$makeTerm(term) : dom$dom$emmet$$toString(term);

                    if (str === ">") {
                        term = dom$dom$emmet$$injectTerm(term);
                    } else {
                        node.push(term);
                    }
                }

                str = typeof term === "function" ? node.map(term) : node;
            }

            stack.unshift(str);
        };$D$0 = $D$1 = void 0;

        output = dom$dom$emmet$$toString(stack[0]);

        return varMap ? output : dom$dom$emmet$$tagCache[template] = output;
    };
    /*
     * Helper for css selectors
     */
    var util$selectormatcher$$rquickIs = /^(\w*)(?:#([\w\-]+))?(?:\[([\w\-\=]+)\])?(?:\.([\w\-]+))?$/;

    var util$selectormatcher$$default = function(selector, context) {
        if (typeof selector !== "string") return null;

        var quick = util$selectormatcher$$rquickIs.exec(selector);

        if (quick) {
            //   0  1    2   3          4
            // [ _, tag, id, attribute, class ]
            if (quick[1]) quick[1] = quick[1].toLowerCase();
            if (quick[3]) quick[3] = quick[3].split("=");
            if (quick[4]) quick[4] = " " + quick[4] + " ";
        }

        return function(node)  {
            var result, found, test;

            if (!quick && !node.webkitMatchesSelector) {
                found = (context || document).querySelectorAll(selector);
                test = function(x)  {return x === node};
            }

            for (; node && node.nodeType === 1; node = node.parentNode) {
                if (quick) {
                    result = (
                        (!quick[1] || node.nodeName.toLowerCase() === quick[1]) &&
                        (!quick[2] || node.id === quick[2]) &&
                        (!quick[3] || (quick[3][1] ? node.getAttribute(quick[3][0]) === quick[3][1] : node.hasAttribute(quick[3][0]))) &&
                        (!quick[4] || (" " + node.className + " ").indexOf(quick[4]) >= 0)
                    );
                } else {
                    // querySelectorAll is faster in all browsers except Webkit-based:
                    // http://jsperf.com/queryselectorall-vs-matches/3
                    if (node.webkitMatchesSelector) {
                        result = node.webkitMatchesSelector(selector);
                    } else {
                        result = helpers$$default.some.call(found, test);
                    }
                }

                if (result || !context || node === context) break;
            }

            return result && node;
        };
    };

    /*
     * Helper for accessing css properties
     */
    var util$stylehooks$$hooks = {get: {}, set: {}},
        util$stylehooks$$reDash = /\-./g,
        util$stylehooks$$reCamel = /[A-Z]/g,
        util$stylehooks$$directions = ["Top", "Right", "Bottom", "Left"],
        util$stylehooks$$computed = helpers$$default.computeStyle(constants$$HTML),
        // In Opera CSSStyleDeclaration objects returned by _.computeStyle have length 0
        util$stylehooks$$props = util$stylehooks$$computed.length ? helpers$$default.slice.call(util$stylehooks$$computed, 0) : helpers$$default.keys(util$stylehooks$$computed).map(function(key)  {
            return key.replace(util$stylehooks$$reCamel, function(str)  {return "-" + str.toLowerCase()});
        }),
        util$stylehooks$$shortCuts = {
            font: ["fontStyle", "fontSize", "/", "lineHeight", "fontFamily"],
            padding: util$stylehooks$$directions.map(function(dir)  {return "padding" + dir}),
            margin: util$stylehooks$$directions.map(function(dir)  {return "margin" + dir}),
            "border-width": util$stylehooks$$directions.map(function(dir)  {return "border" + dir + "Width"}),
            "border-style": util$stylehooks$$directions.map(function(dir)  {return "border" + dir + "Style"})
        };

    util$stylehooks$$props.forEach(function(propName)  {
        var prefix = propName[0] === "-" ? propName.substr(1, propName.indexOf("-", 1) - 1) : null,
            unprefixedName = prefix ? propName.substr(prefix.length + 2) : propName,
            stylePropName = propName.replace(util$stylehooks$$reDash, function(str)  {return str[1].toUpperCase()});
        // most of browsers starts vendor specific props in lowercase
        if (!(stylePropName in util$stylehooks$$computed)) {
            stylePropName = stylePropName[0].toLowerCase() + stylePropName.substr(1);
        }

        util$stylehooks$$hooks.get[unprefixedName] = function(style)  {return style[stylePropName]};
        util$stylehooks$$hooks.set[unprefixedName] = function(style, value)  {
            value = typeof value === "number" ? value + "px" : value.toString();
            // use cssText property to determine DOM.importStyles call
            style["cssText" in style ? stylePropName : propName] = value;
        };
    });

    // Exclude the following css properties from adding px
    " float fill-opacity font-weight line-height opacity orphans widows z-index zoom ".split(" ").forEach(function(propName)  {
        var stylePropName = propName.replace(util$stylehooks$$reDash, function(str)  {return str[1].toUpperCase()});

        if (propName === "float") {
            stylePropName = "cssFloat" in util$stylehooks$$computed ? "cssFloat" : "styleFloat";
            // normalize float css property
            util$stylehooks$$hooks.get[propName] = function(style)  {return style[stylePropName]};
        }

        util$stylehooks$$hooks.set[propName] = function(style, value)  {
            style["cssText" in style ? stylePropName : propName] = value.toString();
        };
    });

    // normalize property shortcuts
    helpers$$default.keys(util$stylehooks$$shortCuts).forEach(function(key)  {
        var props = util$stylehooks$$shortCuts[key];

        util$stylehooks$$hooks.get[key] = function(style)  {
            var result = [],
                hasEmptyStyleValue = function(prop, index)  {
                    result.push(prop === "/" ? prop : style[prop]);

                    return !result[index];
                };

            return props.some(hasEmptyStyleValue) ? "" : result.join(" ");
        };

        util$stylehooks$$hooks.set[key] = function(style, value)  {
            if (value && "cssText" in style) {
                // normalize setting complex property across browsers
                style.cssText += ";" + key + ":" + value;
            } else {
                props.forEach(function(name)  {return style[name] = typeof value === "number" ? value + "px" : value.toString()});
            }
        };
    });

    var util$stylehooks$$default = util$stylehooks$$hooks;

    var dom$dom$importstyles$$styleNode = helpers$$default.injectElement(constants$$DOCUMENT.createElement("style")),
        dom$dom$importstyles$$styleSheet = dom$dom$importstyles$$styleNode.sheet || dom$dom$importstyles$$styleNode.styleSheet,
        dom$dom$importstyles$$styleRules = dom$dom$importstyles$$styleSheet.cssRules || dom$dom$importstyles$$styleSheet.rules;

    /**
     * Append global css styles
     * @memberof DOM
     * @alias DOM.importStyles
     * @param {String}         selector  css selector
     * @param {String|Object}  cssText   css rules
     */
    types$$DOM.importStyles = function(selector, cssText) {
        if (cssText && typeof cssText === "object") {
            // use styleObj to collect all style props for a new CSS rule
            var styleObj = helpers$$default.keys(cssText).reduce(function(styleObj, prop)  {
                var hook = util$stylehooks$$default.set[prop];

                if (hook) {
                    hook(styleObj, cssText[prop]);
                } else {
                    styleObj[prop] = cssText[prop];
                }

                return styleObj;
            }, {});

            cssText = helpers$$default.keys(styleObj).map(function(key)  {return key + ":" + styleObj[key]}).join(";");
        }

        if (typeof selector !== "string" || typeof cssText !== "string") {
            throw new errors$$StaticMethodError("importStyles");
        }

        if (dom$dom$importstyles$$styleSheet.cssRules) {
            dom$dom$importstyles$$styleSheet.insertRule(selector + "{" + cssText + "}", dom$dom$importstyles$$styleRules.length);
        } else {
            // ie doesn't support multiple selectors in addRule
            selector.split(",").forEach(function(selector)  { dom$dom$importstyles$$styleSheet.addRule(selector, cssText) });
        }
    };

    var dom$dom$importstyles$$default = types$$DOM.importStyles;

    // Inspired by trick discovered by Daniel Buchner:
    // https://github.com/csuwldcat/SelectorListener
    var dom$dom$extend$$reRemovableMethod = /^(on|do)[A-Z]/,
        dom$dom$extend$$extensions = [],
        dom$dom$extend$$returnTrue = function()  {return true},
        dom$dom$extend$$returnFalse = function()  {return false},
        dom$dom$extend$$nativeEventType, dom$dom$extend$$animId, dom$dom$extend$$link, dom$dom$extend$$styles,
        dom$dom$extend$$applyMixins = function(obj, mixins)  {
            helpers$$default.keys(mixins).forEach(function(key)  {
                if (key !== "constructor") obj[key] = mixins[key];
            });
        },
        dom$dom$extend$$stopExt = function(node, index)  {return function(e)  {
            var stop;

            e = e || constants$$WINDOW.event;

            if (constants$$CSS3_ANIMATIONS) {
                stop = e.animationName === dom$dom$extend$$animId && e.target === node;
            } else {
                stop = e.srcUrn === constants$$CUSTOM_EVENT_TYPE && e.srcElement === node;
            }
            // mark extension as processed via e._skip bitmask
            if (stop) (e._skip = e._skip || {})[index] = true;
        }},
        dom$dom$extend$$makeExtHandler = function(node, skip)  {return function(ext, index)  {
            // skip previously excluded or mismatched elements
            if (!skip[index] && ext.accept(node)) ext(node);
        }},
        dom$dom$extend$$startExt = function(ext)  {
            // initialize extension manually to make sure that all elements
            // have appropriate methods before they are used in other DOM.extend.
            // Also fixes legacy IEs when the HTC behavior is already attached
            helpers$$default.each.call(constants$$DOCUMENT.querySelectorAll(ext.selector), ext);
            // MUST be after querySelectorAll because of legacy IEs quirks
            dom$dom$importstyles$$default(ext.selector, dom$dom$extend$$styles);
        },
        dom$dom$extend$$readyState = constants$$DOCUMENT.readyState,
        dom$dom$extend$$readyCallback = function()  {
            if (dom$dom$extend$$readyCallback) {
                dom$dom$extend$$extensions.forEach(dom$dom$extend$$startExt);

                dom$dom$extend$$readyCallback = false;
            }
        };

    // Catch cases where ready is called after the browser event has already occurred.
    // IE10 and lower don't handle "interactive" properly... use a weak inference to detect it
    // discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
    if (constants$$DOCUMENT.attachEvent ? dom$dom$extend$$readyState === "complete" : dom$dom$extend$$readyState !== "loading") {
        // fix fox #14: use setTimeout to make sure that the library is fully initialized
        setTimeout(dom$dom$extend$$readyCallback, 0);
    } else {
        if (constants$$DOM2_EVENTS) {
            constants$$WINDOW.addEventListener("load", dom$dom$extend$$readyCallback, false);
            constants$$DOCUMENT.addEventListener("DOMContentLoaded", dom$dom$extend$$readyCallback, false);
        } else {
            constants$$WINDOW.attachEvent("onload", dom$dom$extend$$readyCallback);
            constants$$DOCUMENT.attachEvent("ondataavailable", function()  {
                if (constants$$WINDOW.event.srcUrn === "DOMContentLoaded" && dom$dom$extend$$readyCallback) dom$dom$extend$$readyCallback();
            });
        }
    }

    if (constants$$CSS3_ANIMATIONS) {
        dom$dom$extend$$nativeEventType = constants$$WEBKIT_PREFIX ? "webkitAnimationStart" : "animationstart";
        dom$dom$extend$$animId = "DOM" + Date.now();

        dom$dom$importstyles$$default("@" + constants$$WEBKIT_PREFIX + "keyframes " + dom$dom$extend$$animId, "from {opacity:.99} to {opacity:1}");

        dom$dom$extend$$styles = {
            "animation-duration": "1ms !important",
            "animation-name": dom$dom$extend$$animId + " !important"
        };

        constants$$DOCUMENT.addEventListener(dom$dom$extend$$nativeEventType, function(e)  {
            if (e.animationName === dom$dom$extend$$animId) {
                dom$dom$extend$$extensions.forEach(dom$dom$extend$$makeExtHandler(e.target, e._skip || {}));
            }
        }, false);
    } else {
        dom$dom$extend$$nativeEventType = "ondataavailable";
        dom$dom$extend$$link = constants$$DOCUMENT.querySelector("link[rel=htc]");

        if (!dom$dom$extend$$link) throw new Error("In order to use live extensions in IE < 10 you have to include extra files. See https://github.com/chemerisuk/better-dom#notes-about-old-ies");

        dom$dom$extend$$styles = {behavior: "url(" + dom$dom$extend$$link.href + ") !important"};
        // append behavior for HTML element to apply several legacy IE-specific fixes
        dom$dom$importstyles$$default("html", dom$dom$extend$$styles);

        constants$$DOCUMENT.attachEvent(dom$dom$extend$$nativeEventType, function()  {
            var e = constants$$WINDOW.event;

            if (e.srcUrn === constants$$CUSTOM_EVENT_TYPE) {
                dom$dom$extend$$extensions.forEach(dom$dom$extend$$makeExtHandler(e.srcElement, e._skip || {}));
            }
        });
    }

    /**
     * Declare a live extension
     * @memberof DOM
     * @alias DOM.extend
     * @param  {String}           selector         css selector of which elements to capture
     * @param  {Boolean|Function} [condition=true] indicates if live extension should be attached or not
     * @param  {Object}           mixins           extension declatation
     * @see https://github.com/chemerisuk/better-dom/wiki/Live-extensions
     */
    types$$DOM.extend = function(selector, condition, mixins) {
        if (arguments.length === 2) {
            mixins = condition;
            condition = true;
        }

        if (typeof condition === "boolean") condition = condition ? dom$dom$extend$$returnTrue : dom$dom$extend$$returnFalse;

        if (typeof mixins === "function") mixins = {constructor: mixins};

        if (!mixins || typeof mixins !== "object" || typeof condition !== "function") throw new errors$$StaticMethodError("extend");

        if (selector === "*") {
            // extending element prototype
            dom$dom$extend$$applyMixins(types$$$Element.prototype, mixins);
        } else {
            var eventHandlers = helpers$$default.keys(mixins).filter(function(prop)  {return !!dom$dom$extend$$reRemovableMethod.exec(prop)}),
                ctr = mixins.hasOwnProperty("constructor") && mixins.constructor,
                index = dom$dom$extend$$extensions.length,
                ext = function(node, mock)  {
                    var el = types$$$Element(node);

                    if (constants$$CSS3_ANIMATIONS) {
                        node.addEventListener(dom$dom$extend$$nativeEventType, dom$dom$extend$$stopExt(node, index), false);
                    } else {
                        node.attachEvent(dom$dom$extend$$nativeEventType, dom$dom$extend$$stopExt(node, index));
                    }

                    if (mock !== true && condition(el) === false) return;

                    dom$dom$extend$$applyMixins(el, mixins);
                    // make a safe call so live extensions can't break each other
                    if (ctr) el.dispatch(ctr);
                    // remove event handlers from element's interface
                    if (mock !== true) eventHandlers.forEach(function(prop)  { delete el[prop] });
                };

            ext.accept = util$selectormatcher$$default(selector);
            ext.selector = selector;
            dom$dom$extend$$extensions.push(ext);

            if (!dom$dom$extend$$readyCallback) dom$dom$extend$$startExt(ext);
        }
    };

    var dom$dom$extend$$default = dom$dom$extend$$extensions;

    var dom$dom$format$$reVar = /\{([\w\-]+)\}/g;

    /**
     * Formats template using a variables map
     * @memberof DOM
     * @alias DOM.format
     * @param  {String}  template  template string
     * @param  {Object}  varMap    key/value map of variables
     * @return {String}  result string
     */
    types$$DOM.format = function(template, varMap) {
        if (typeof template !== "string" || varMap && typeof varMap !== "object") throw new errors$$StaticMethodError("format");

        return template.replace(dom$dom$format$$reVar, function(x, name)  {return name in varMap ? String(varMap[name]) : x});
    };

    /**
     * Import external scripts on the page and call optional callback when it will be done
     * @memberof DOM
     * @alias DOM.importScripts
     * @param {...String} urls       script file urls
     * @param {Function}  [callback] callback that is triggered when all scripts are loaded
     */
    types$$DOM.importScripts = function() {var urls = SLICE$0.call(arguments, 0);
        var callback = function() {
            var arg = urls.shift(),
                argType = typeof arg,
                script;

            if (argType === "string") {
                script = constants$$DOCUMENT.createElement("script");
                script.src = arg;
                script.onload = callback;
                script.async = true;

                helpers$$default.injectElement(script);
            } else if (argType === "function") {
                arg();
            } else if (arg) {
                throw new errors$$StaticMethodError("importScripts");
            }
        };

        callback();
    };

    function dom$dom$mock$$applyExtensions(node) {
        dom$dom$extend$$default.forEach(function(ext)  { if (ext.accept(node)) ext(node, true) });

        helpers$$default.each.call(node.children, dom$dom$mock$$applyExtensions);
    }

    /**
     * Return {@link $Element} initialized with all existing live extensions.
     * Also exposes private event handler functions that aren't usually presented
     * @memberof DOM
     * @alias DOM.mock
     * @param  {String}       value     EmmetString or HTMLString
     * @param  {Object|Array} [varMap]  key/value map of variables
     * @return {$Element} mocked instance
     */
    types$$DOM.mock = function(content, varMap, /*INTERNAL*/all) {
        if (!content) return new types$$$Element();

        var result = types$$DOM.create(content, varMap, all);

        if (all) {
            result.forEach(function(el)  { dom$dom$mock$$applyExtensions(el[0]) });
        } else {
            dom$dom$mock$$applyExtensions(result[0]);
        }

        return result;
    };

    /**
     * Return Array of {@link $Element} initialized with all existing live extensions.
     * Also exposes private event handler functions that aren't usually presented
     * @memberof DOM
     * @alias DOM.mockAll
     * @param  {String}       value     EmmetString or HTMLString
     * @param  {Object|Array} [varMap]  key/value map of variables
     * @return {Array} collection of mocked {@link $Element} instances
     */
    types$$DOM.mockAll = function(content, varMap) {
        return types$$DOM.mock(content, varMap, true);
    };

    var dom$dom$raf$$lastTime = 0,
        dom$dom$raf$$propName = ["r", "webkitR", "mozR", "oR"].reduce(function(memo, name)  {
            var prop = name + "equestAnimationFrame";

            return memo || constants$$WINDOW[prop] && prop;
        }, 0);

    /**
     * Request animation frame helper
     * @memberof DOM
     * @alias DOM.raf
     * @param  {Function}  callback  request animation frame callback
     * @return {Number}    rafId
     */
    types$$DOM.raf = function(callback) {
        if (dom$dom$raf$$propName) {
            constants$$WINDOW[dom$dom$raf$$propName](callback);
        } else {
            var currTime = Date.now(),
                timeToCall = Math.max(0, 16 - (currTime - dom$dom$raf$$lastTime));

            dom$dom$raf$$lastTime = currTime + timeToCall;

            if (timeToCall) {
                setTimeout(callback, timeToCall);
            } else {
                callback(currTime + timeToCall);
            }
        }
    };

    var element$element$classes$$reSpace = /[\n\t\r]/g;

    function element$element$classes$$makeClassesMethod(nativeStrategyName, strategy) {
        var methodName = nativeStrategyName === "contains" ? "hasClass" : nativeStrategyName + "Class";

        if (constants$$HTML.classList) {
            strategy = function(className) {
                return this[0].classList[nativeStrategyName](className);
            };
        }

        if (methodName === "hasClass") {
            return function(className) {
                var args = arguments;

                if (this[0]) {
                    if (args.length === 1) {
                        return strategy.call(this, className);
                    } else {
                        return helpers$$default.every.call(args, strategy, this);
                    }
                }
            };
        } else {
            return function(className) {
                var args = arguments;

                if (args.length === 1) {
                    strategy.call(this, className);
                } else {
                    helpers$$default.each.call(args, strategy, this);
                }

                return this;
            };
        }
    }

    /**
     * Check if element contains class name(s)
     * @memberof! $Element#
     * @alias $Element#hasClass
     * @param  {...String} classNames class name(s)
     * @return {Boolean}   true if the element contains all classes
     * @function
     */
    types$$$Element.prototype.hasClass = element$element$classes$$makeClassesMethod("contains", function(className) {
        return (" " + this[0].className + " ").replace(element$element$classes$$reSpace, " ").indexOf(" " + className + " ") >= 0;
    });

    /**
     * Add class(es) to element
     * @memberof! $Element#
     * @alias $Element#addClass
     * @param  {...String} classNames class name(s)
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.addClass = element$element$classes$$makeClassesMethod("add", function(className) {
        if (!this.hasClass(className)) this[0].className += " " + className;
    });

    /**
     * Remove class(es) from element
     * @memberof! $Element#
     * @alias $Element#removeClass
     * @param  {...String} classNames class name(s)
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.removeClass = element$element$classes$$makeClassesMethod("remove", function(className) {
        className = (" " + this[0].className + " ").replace(element$element$classes$$reSpace, " ").replace(" " + className + " ", " ");

        this[0].className = className.trim();
    });

    /**
     * Toggle class(es) on element
     * @memberof! $Element#
     * @alias $Element#toggleClass
     * @param  {...String}  classNames class name(s)
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.toggleClass = element$element$classes$$makeClassesMethod("toggle", function(className) {
        var oldClassName = this[0].className;

        this.addClass(className);

        if (oldClassName === this[0].className) this.removeClass(className);
    });

    /**
     * Clone element
     * @memberof! $Element#
     * @alias $Element#clone
     * @param {Boolean} [deep=true] true if all children should also be cloned, or false otherwise
     * @return {$Element} clone of current element
     */
    types$$$Element.prototype.clone = function() {var deep = arguments[0];if(deep === void 0)deep = true;
        if (typeof deep !== "boolean") throw new errors$$MethodError("clone");

        var node = this[0], result;

        if (node) {
            if (constants$$DOM2_EVENTS) {
                result = new types$$$Element(node.cloneNode(deep));
            } else {
                result = types$$DOM.create(node.outerHTML);

                if (!deep) result.set("innerHTML", "");
            }
        } else {
            result = new types$$$Element();
        }

        return result;
    };

    /**
     * Check if element is inside of context
     * @memberof! $Element#
     * @alias $Element#contains
     * @param  {$Element} element element to check
     * @return {Boolean} true if success
     */
    types$$$Element.prototype.contains = function(element) {
        var node = this[0];

        if (!node) return false;

        if (element instanceof types$$$Element) {
            var otherNode = element[0];

            if (otherNode === node) return true;

            if (node.contains) {
                return node.contains(otherNode);
            } else {
                return node.compareDocumentPosition(otherNode) & 16;
            }
        }

        throw new errors$$MethodError("contains");
    };

    /**
     * CSS properties accessor for an element
     * @memberof! $Element#
     * @alias $Element#css
     * @param  {String|Object}   name    style property name or key/value object
     * @param  {String|Function} [value] style property value or function that returns it
     * @return {String|$Element} property value or reference to this
     */
    types$$$Element.prototype.css = function(name, value) {var this$0 = this;
        var len = arguments.length,
            node = this[0],
            nameType = typeof name,
            style, hook, computed, appendCssText;

        if (len === 1 && (nameType === "string" || helpers$$default.isArray(name))) {
            if (node) {
                style = node.style;

                value = (nameType === "string" ? [name] : name).reduce(function(memo, name)  {
                    hook = util$stylehooks$$default.get[name];
                    value = hook ? hook(style) : style[name];

                    if (!computed && !value) {
                        style = helpers$$default.computeStyle(node);
                        value = hook ? hook(style) : style[name];

                        computed = true;
                    }

                    memo[name] = value;

                    return memo;
                }, {});
            }

            return node && nameType === "string" ? value[name] : value;
        }

        if (node) {
            style = node.style;
            appendCssText = function(key, value)  {
                var hook = util$stylehooks$$default.set[key];

                if (typeof value === "function") value = value(this$0);

                if (value == null) value = "";

                if (hook) {
                    hook(style, value);
                } else {
                    style[key] = typeof value === "number" ? value + "px" : value.toString();
                }
            };

            if (len === 1 && name && nameType === "object") {
                helpers$$default.keys(name).forEach(function(key)  { appendCssText(key, name[key]) });
            } else if (len === 2 && nameType === "string") {
                appendCssText(name, value);
            } else {
                throw new errors$$MethodError("style");
            }
        }

        return this;
    };

    /**
     * Make a safe method/function call
     * @memberof! $Element#
     * @alias $Element#dispatch
     * @param  {String|Function}  method  name of method or function for a safe call
     * @param  {...Object}        [args]  extra arguments to pass into each invokation
     * @return {Object} result of the invokation which is undefined if there was an exception
     */
    types$$$Element.prototype.dispatch = function(method) {var args = SLICE$0.call(arguments, 1);
        var context = this,
            node = this[0];

        if (node) {
            if (typeof method === "string") {
                context = node;
                method = node[method];
            }

            if (typeof method !== "function") throw new errors$$MethodError("dispatch");

            try {
                return method.apply(context, args);
            } catch (err) {
                if ("console" in constants$$WINDOW) constants$$WINDOW.console.error(err);

                return err;
            }
        }
    };

    // big part of code inspired by Sizzle:
    // https://github.com/jquery/sizzle/blob/master/sizzle.js

    var element$element$find$$rquickExpr = constants$$DOCUMENT.getElementsByClassName ? /^(?:(\w+)|\.([\w\-]+))$/ : /^(?:(\w+))$/,
        element$element$find$$rsibling = /[\x20\t\r\n\f]*[+~>]/,
        element$element$find$$rescape = /'|\\/g,
        element$element$find$$tmpId = "DOM" + Date.now();

    /**
     * Find the first matched element by css selector
     * @memberof! $Element#
     * @alias $Element#find
     * @param  {String} selector css selector
     * @return {$Element} the first matched element
     */
    types$$$Element.prototype.find = function(selector) {var suffix = arguments[1];if(suffix === void 0)suffix = "";
        if (typeof selector !== "string") throw new errors$$MethodError("find" + suffix);

        var node = this[0],
            quickMatch = element$element$find$$rquickExpr.exec(selector),
            result, old, nid, context;

        if (!node) return suffix ? [] : new types$$$Element();

        if (quickMatch) {
            if (quickMatch[1]) {
                // speed-up: "TAG"
                result = node.getElementsByTagName(selector);
            } else {
                // speed-up: ".CLASS"
                result = node.getElementsByClassName(quickMatch[2]);
            }

            if (result && !suffix) result = result[0];
        } else {
            old = true;
            nid = element$element$find$$tmpId;
            context = node;

            if (this !== types$$DOM) {
                // qSA works strangely on Element-rooted queries
                // We can work around this by specifying an extra ID on the root
                // and working up from there (Thanks to Andrew Dupont for the technique)
                if ( (old = node.getAttribute("id")) ) {
                    nid = old.replace(element$element$find$$rescape, "\\$&");
                } else {
                    node.setAttribute("id", nid);
                }

                nid = "[id='" + nid + "'] ";

                context = element$element$find$$rsibling.test(selector) ? node.parentNode : node;
                selector = nid + selector.split(",").join("," + nid);
            }

            try {
                result = context["querySelector" + suffix](selector);
            } finally {
                if (!old) node.removeAttribute("id");
            }
        }

        return suffix ? helpers$$default.map.call(result, types$$$Element) : types$$$Element(result);
    };

    /**
     * Find all matched elements by css selector
     * @memberof! $Element#
     * @alias $Element#findAll
     * @param  {String} selector css selector
     * @return {Array} matched elements
     */
    types$$$Element.prototype.findAll = function(selector) {
        return this.find(selector, "All");
    };

    var util$eventhooks$$hooks = {};

    ["scroll", "mousemove"].forEach(function(name)  {
        util$eventhooks$$hooks[name] = function(handler)  {
            var free = true;
            // debounce frequent events
            return function(e)  { if (free) free = DOM.raf(function()  { free = !handler(e) }) };
        };
    });

    if ("onfocusin" in constants$$HTML) {
        util$eventhooks$$hooks.focus = function(handler)  { handler._type = "focusin" };
        util$eventhooks$$hooks.blur = function(handler)  { handler._type = "focusout" };
    } else {
        // firefox doesn't support focusin/focusout events
        util$eventhooks$$hooks.focus = util$eventhooks$$hooks.blur = function(handler)  { handler.capturing = true };
    }

    if (constants$$DOCUMENT.createElement("input").validity) {
        util$eventhooks$$hooks.invalid = function(handler)  { handler.capturing = true };
    }

    if (!constants$$DOM2_EVENTS) {
        // fix non-bubbling form events for IE8
        ["submit", "change", "reset"].forEach(function(name)  {
            util$eventhooks$$hooks[name] = function(handler)  { handler._type = constants$$CUSTOM_EVENT_TYPE };
        });
    }

    var util$eventhooks$$default = util$eventhooks$$hooks;

    /*
     * Helper type to create an event handler
     */

    var util$eventhandler$$defaultArgs = ["target", "currentTarget", "defaultPrevented"],
        util$eventhandler$$EventHandler = function(type, selector, callback, props, el, node, once)  {
            if (!node) return null;

            var hook = util$eventhooks$$default[type],
                matcher = util$selectormatcher$$default(selector, node),
                handler = function(e)  {
                    e = e || constants$$WINDOW.event;
                    // early stop in case of default action
                    if (util$eventhandler$$EventHandler.skip === type) return;
                    // handle custom events in legacy IE
                    if (handler._type === constants$$CUSTOM_EVENT_TYPE && e.srcUrn !== type) return;
                    // srcElement can be null in legacy IE when target is document
                    var target = e.target || e.srcElement || constants$$DOCUMENT,
                        currentTarget = matcher ? matcher(target) : node,
                        extraArgs = e._args || [],
                        args = props || util$eventhandler$$defaultArgs,
                        fn = callback;

                    if (typeof callback === "string") {
                        // use getter to handle custom properties
                        fn = el[callback] || el.get(callback);
                    }

                    // early stop for late binding or when target doesn't match selector
                    if (typeof fn !== "function" || !currentTarget) return;

                    // off callback even if it throws an exception later
                    if (once) el.off(type, callback);

                    args = args.map(function(name)  {
                        if (typeof name === "number") return extraArgs[name - 1];

                        if (!constants$$DOM2_EVENTS) {
                            switch (name) {
                            case "which":
                                return e.keyCode;
                            case "button":
                                var button = e.button;
                                // click: 1 === left; 2 === middle; 3 === right
                                return button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) );
                            case "pageX":
                                return e.pageX || e.clientX + constants$$HTML.scrollLeft - constants$$HTML.clientLeft;
                            case "pageY":
                                return e.clientY + constants$$HTML.scrollTop - constants$$HTML.clientTop;
                            }
                        }

                        switch (name) {
                        case "type":
                            return type;
                        case "defaultPrevented":
                            // IE8 and Android 2.3 use returnValue instead of defaultPrevented
                            return "defaultPrevented" in e ? e.defaultPrevented : e.returnValue === false;
                        case "target":
                            return types$$$Element(target);
                        case "currentTarget":
                            return types$$$Element(currentTarget);
                        case "relatedTarget":
                            return types$$$Element(e.relatedTarget || e[(e.toElement === node ? "from" : "to") + "Element"]);
                        }

                        return e[name];
                    });

                    // if props is not specified then prepend extra arguments
                    if (fn.apply(el, props ? args : extraArgs.concat(args)) === false) {
                        // prevent default if handler returns false
                        if (constants$$DOM2_EVENTS) {
                            e.preventDefault();
                        } else {
                            e.returnValue = false;
                        }
                    }
                };

            if (hook) handler = hook(handler, type) || handler;
            // handle custom events for IE8
            if (!constants$$DOM2_EVENTS && !("on" + (handler._type || type) in node)) {
                handler._type = constants$$CUSTOM_EVENT_TYPE;
            }

            handler.type = selector ? type + " " + selector : type;
            handler.callback = callback;

            return handler;
        };

    var util$eventhandler$$default = util$eventhandler$$EventHandler;

    /**
     * Triggers an event of specific type with optional extra arguments
     * @memberof! $Element#
     * @alias $Element#fire
     * @param  {String}  type  type of event
     * @param  {...Object}     [args]  extra arguments to pass into each event handler
     * @return {Boolean} true if default action wasn't prevented
     */
    types$$$Element.prototype.fire = function(type) {var args = SLICE$0.call(arguments, 1);
        var node = this[0],
            eventType = typeof type,
            handler = {},
            hook, e, canContinue;

        if (!node) return false;

        if (eventType === "string") {
            if (hook = util$eventhooks$$default[type]) handler = hook(handler) || handler;

            eventType = handler._type || type;
        } else {
            throw new errors$$MethodError("fire");
        }

        if (constants$$DOM2_EVENTS) {
            e = constants$$DOCUMENT.createEvent("HTMLEvents");
            e.initEvent(eventType, true, true);
            e._args = args;

            canContinue = node.dispatchEvent(e);
        } else {
            e = constants$$DOCUMENT.createEventObject();
            e._args = args;
            // handle custom events for legacy IE
            if (!("on" + eventType in node)) eventType = constants$$CUSTOM_EVENT_TYPE;
            // store original event type
            if (eventType === constants$$CUSTOM_EVENT_TYPE) e.srcUrn = type;

            node.fireEvent("on" + eventType, e);

            canContinue = e.returnValue !== false;
        }

        // Call native method. IE<9 dies on focus/blur to hidden element
        if (canContinue && node[type] && (type !== "focus" && type !== "blur" || node.offsetWidth)) {
            // Prevent re-triggering of the same event
            util$eventhandler$$default.skip = type;

            node[type]();

            util$eventhandler$$default.skip = null;
        }

        return canContinue;
    };

    var util$accessorhooks$$hooks = {get: {}, set: {}};

    // fix camel cased attributes
    "tabIndex readOnly maxLength cellSpacing cellPadding rowSpan colSpan useMap frameBorder contentEditable".split(" ").forEach(function(key)  {
        util$accessorhooks$$hooks.get[ key.toLowerCase() ] = function(node)  {return node[key]};
    });

    // style hook
    util$accessorhooks$$hooks.get.style = function(node)  {return node.style.cssText};
    util$accessorhooks$$hooks.set.style = function(node, value)  { node.style.cssText = value };

    // title hook for DOM
    util$accessorhooks$$hooks.get.title = function(node)  {return node === constants$$HTML ? constants$$DOCUMENT.title : node.title};
    util$accessorhooks$$hooks.set.title = function(node, value)  { (node === constants$$HTML ? constants$$DOCUMENT : node).title = value; };

    util$accessorhooks$$hooks.get.undefined = function(node)  {
        var name;

        switch (node.tagName) {
        case "SELECT":
            return ~node.selectedIndex ? node.options[ node.selectedIndex ].value : "";

        case "OPTION":
            name = node.hasAttribute("value") ? "value" : "text";
            break;

        default:
            name = node.type && "value" in node ? "value" : "innerHTML";
        }

        return node[name];
    };

    util$accessorhooks$$hooks.set.undefined = function(node, value) {
        // handle numbers, booleans etc.
        value = value == null ? "" : String(value);

        if (node.tagName === "SELECT") {
            // selectbox has special case
            if (helpers$$default.every.call(node.options, function(o)  {return !(o.selected = o.value === value)})) {
                node.selectedIndex = -1;
            }
        } else if (node.type && "value" in node) {
            // for IE use innerText for textareabecause it doesn't trigger onpropertychange
            node[constants$$DOM2_EVENTS || node.type !== "textarea" ? "value" : "innerText"] = value;
        } else {
            node.innerHTML = value;
        }
    };

    // some browsers don't recognize input[type=email] etc.
    util$accessorhooks$$hooks.get.type = function(node)  {return node.getAttribute("type") || node.type};

    // IE8 has innerText but not textContent
    if (!constants$$DOM2_EVENTS) {
        util$accessorhooks$$hooks.get.textContent = function(node)  {return node.innerText};
        util$accessorhooks$$hooks.set.textContent = function(node, value)  { node.innerText = value };
    }

    var util$accessorhooks$$default = util$accessorhooks$$hooks;

    /**
     * Get property or attribute value by name
     * @memberof! $Element#
     * @alias $Element#get
     * @param  {String|Array} [name] property/attribute name or array of names
     * @return {Object} property/attribute value
     */
    types$$$Element.prototype.get = function(name) {var this$0 = this;
        var data = this._,
            node = this[0],
            hook = util$accessorhooks$$default.get[name],
            nameType = typeof name,
            key, value;

        if (!node) return;

        if (hook) return hook(node, name);

        if (nameType === "string") {
            if (name.substr(0, 2) === "--") {
                key = name.substr(2);

                if (key in data) {
                    value = data[key];
                } else {
                    value = node.getAttribute("data-" + key);

                    if (value != null) {
                        // try to recognize and parse  object notation syntax
                        if (value[0] === "{" && value[value.length - 1] === "}") {
                            try {
                                value = JSON.parse(value);
                            } catch (err) { }
                        }

                        data[key] = value;
                    }
                }

                return value;
            }

            return name in node ? node[name] : node.getAttribute(name);
        } else if (helpers$$default.isArray(name)) {
            return name.reduce(function(r, key)  { return (r[key] = this$0.get(key), r) }, {});
        } else {
            throw new errors$$MethodError("get");
        }
    };

    function element$element$manipulation$$makeManipulationMethod(methodName, fasterMethodName, standalone, strategy) {
        return function() {var args = SLICE$0.call(arguments, 0);var this$0 = this;
            var node = this[0],
                html = "",
                value;

            if (!(standalone || node.parentNode && node.parentNode.nodeType === 1)) return this;

            args.forEach(function(arg)  {
                if (typeof arg === "function") arg = arg(this$0, node);

                if (typeof arg === "string") {
                    html += arg.trim();
                } else if (arg instanceof types$$$Element) {
                    if (!value) value = constants$$DOCUMENT.createDocumentFragment();
                    // populate fragment
                    value.appendChild(arg[0]);
                } else {
                    throw new errors$$MethodError(methodName);
                }
            });

            if (!fasterMethodName && html) value = types$$DOM.create(html)[0];

            if (!fasterMethodName || value) {
                strategy(node, value);
            } else if (html) {
                node.insertAdjacentHTML(fasterMethodName, html);
            }

            return this;
        };
    }

    /**
     * Insert html string or $Element after the current
     * @memberof! $Element#
     * @alias $Element#after
     * @param {...Mixed} contents HTMLString, $Element or functor that returns content
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.after = element$element$manipulation$$makeManipulationMethod("after", "afterend", false, function(node, relatedNode)  {
        node.parentNode.insertBefore(relatedNode, node.nextSibling);
    });

    /**
     * Insert html string or $Element before the current
     * @memberof! $Element#
     * @alias $Element#before
     * @param {...Mixed} contents HTMLString, $Element or functor that returns content
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.before = element$element$manipulation$$makeManipulationMethod("before", "beforebegin", false, function(node, relatedNode)  {
        node.parentNode.insertBefore(relatedNode, node);
    });

    /**
     * Prepend html string or $Element to the current
     * @memberof! $Element#
     * @alias $Element#prepend
     * @param {...Mixed} contents HTMLString, $Element or functor that returns content
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.prepend = element$element$manipulation$$makeManipulationMethod("prepend", "afterbegin", true, function(node, relatedNode)  {
        node.insertBefore(relatedNode, node.firstChild);
    });

    /**
     * Append html string or $Element to the current
     * @memberof! $Element#
     * @alias $Element#append
     * @param {...Mixed} contents HTMLString, $Element or functor that returns content
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.append = element$element$manipulation$$makeManipulationMethod("append", "beforeend", true, function(node, relatedNode)  {
        node.appendChild(relatedNode);
    });

    /**
     * Replace current element with html string or $Element
     * @memberof! $Element#
     * @alias $Element#replace
     * @param {Mixed} content HTMLString, $Element or functor that returns content
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.replace = element$element$manipulation$$makeManipulationMethod("replace", "", false, function(node, relatedNode)  {
        node.parentNode.replaceChild(relatedNode, node);
    });

    /**
     * Remove current element from DOM
     * @memberof! $Element#
     * @alias $Element#remove
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.remove = element$element$manipulation$$makeManipulationMethod("remove", "", false, function(node)  {
        node.parentNode.removeChild(node);
    });

    var util$selectorhooks$$hooks = {};

    util$selectorhooks$$hooks[":focus"] = function(node)  {return node === constants$$DOCUMENT.activeElement};

    util$selectorhooks$$hooks[":hidden"] = function(node, el)  {
        return node.getAttribute("aria-hidden") === "true" ||
            helpers$$default.computeStyle(node).display === "none" || !types$$DOM.contains(el);
    };

    util$selectorhooks$$hooks[":visible"] = function(node, el)  {return !util$selectorhooks$$hooks[":hidden"](node, el)};

    var util$selectorhooks$$default = util$selectorhooks$$hooks;

    /**
     * Check if the element matches selector
     * @memberof! $Element#
     * @alias $Element#matches
     * @param  {String}   selector  css selector for checking
     * @return {$Element}
     */
    types$$$Element.prototype.matches = function(selector) {
        if (!selector || typeof selector !== "string") throw new errors$$MethodError("matches");

        var checker = util$selectorhooks$$default[selector] || util$selectormatcher$$default(selector),
            node = this[0];

        return node && !!checker(node, this);
    };

    /**
     * Unbind an event from the element
     * @memberOf module:events
     * @param  {String}          type type of event
     * @param  {Function|String} [callback] event handler
     * @return {$Element}
     */
    types$$$Element.prototype.off = function(type, callback) {
        if (typeof type !== "string") throw new errors$$MethodError("off");

        var node = this[0];

        if (node) {
            this._._handlers = this._._handlers.filter(function(handler)  {
                if (type !== handler.type || callback && callback !== handler.callback) return true;

                type = handler._type || handler.type;

                if (constants$$DOM2_EVENTS) {
                    node.removeEventListener(type, handler, !!handler.capturing);
                } else {
                    node.detachEvent("on" + type, handler);
                }
            });
        }

        return this;
    };

    /**
     * Calculates offset of the current element
     * @memberof! $Element#
     * @alias $Element#offset
     * @return object with left, top, bottom, right, width and height properties
     */
    types$$$Element.prototype.offset = function() {
        var node = this[0],
            clientTop = constants$$HTML.clientTop,
            clientLeft = constants$$HTML.clientLeft,
            scrollTop = constants$$WINDOW.pageYOffset || constants$$HTML.scrollTop,
            scrollLeft = constants$$WINDOW.pageXOffset || constants$$HTML.scrollLeft,
            boundingRect;

        if (node) {
            boundingRect = node.getBoundingClientRect();

            return {
                top: boundingRect.top + scrollTop - clientTop,
                left: boundingRect.left + scrollLeft - clientLeft,
                right: boundingRect.right + scrollLeft - clientLeft,
                bottom: boundingRect.bottom + scrollTop - clientTop,
                width: boundingRect.right - boundingRect.left,
                height: boundingRect.bottom - boundingRect.top
            };
        }
    };

    /**
     * Bind a DOM event
     * @memberof! $Element#
     * @alias $Element#on
     * @param  {String|Array}    type event type(s) with optional selector
     * @param  {Function|String} callback event callback or property name (for late binding)
     * @param  {Array}           [props] array of event properties to pass into the callback
     * @return {$Element}
     */
    types$$$Element.prototype.on = function(type, callback, props, /*INTERNAL*/once) {var this$0 = this;
        var eventType = typeof type,
            selector, index, args;

        if (eventType === "string") {
            index = type.indexOf(" ");

            if (~index) {
                selector = type.substr(index + 1);
                type = type.substr(0, index);
            }

            if (!helpers$$default.isArray(props)) {
                once = props;
                props = undefined;
            }
        } else if (eventType === "object") {
            if (helpers$$default.isArray(type)) {
                args = helpers$$default.slice.call(arguments, 1);

                type.forEach(function(name)  { this$0.on.apply(this$0, [name].concat(args)) });
            } else {
                helpers$$default.keys(type).forEach(function(name)  { this$0.on(name, type[name]) });
            }

            return this;
        } else {
            throw new errors$$MethodError("on");
        }

        var node = this[0],
            handler = util$eventhandler$$default(type, selector, callback, props, this, node, once);

        if (handler) {
            if (constants$$DOM2_EVENTS) {
                node.addEventListener(handler._type || type, handler, !!handler.capturing);
            } else {
                node.attachEvent("on" + (handler._type || type), handler);
            }
            // store event entry
            this._._handlers.push(handler);
        }

        return this;
    };

    /**
     * Bind a DOM event but fire once before being removed
     * @memberof! $Element#
     * @alias $Element#once
     * @param  {String|Array}    type event type(s) with optional selector
     * @param  {Function|String} callback event callback or property name (for late binding)
     * @param  {Array}           [props] array of event properties to pass into the callback
     * @return {$Element}
     */
    types$$$Element.prototype.once = function() {var args = SLICE$0.call(arguments, 0);
        return this.on.apply(this, args.concat(true));
    };

    /**
     * Set property/attribute value by name
     * @memberof! $Element#
     * @alias $Element#set
     * @param {String|Object|Array} [name]  property/attribute name
     * @param {String|Function}     value   property/attribute value or function that returns it
     * @return {$Element}
     */
    types$$$Element.prototype.set = function(name, value) {var this$0 = this;
        var node = this[0],
            nameType = typeof name;

        if (!node) return this;

        if (arguments.length === 1 && nameType !== "object") {
            value = name;
            name = undefined;
        }

        var hook = util$accessorhooks$$default.set[name],
            watchers = this._._watchers[name || ("value" in node ? "value" : "innerHTML")],
            newValue = value, oldValue;

        if (watchers) oldValue = this.get(name);

        if (typeof name === "string" && name.substr(0, 2) === "--") {
            this._[name.substr(2)] = newValue;
        } else {
            if (typeof newValue === "function") newValue = value(this);

            if (hook) {
                hook(node, newValue);
            } else if (nameType !== "string") {
                if (helpers$$default.isArray(name)) {
                    return name.forEach(function(key)  { this$0.set(key, value) });
                } else if (name && nameType === "object") {
                    return helpers$$default.keys(name).forEach(function(key)  { this$0.set(key, name[key]) });
                }

                throw new errors$$MethodError("set");
            } else if (newValue == null) {
                node.removeAttribute(name);
            } else if (name in node) {
                node[name] = newValue;
            } else {
                node.setAttribute(name, newValue);
            }

            // always trigger reflow manually for IE8 and legacy Android
            if (!constants$$DOM2_EVENTS || constants$$LEGACY_ANDROID) node.className = node.className;
        }

        if (watchers && oldValue !== newValue) {
            watchers.forEach(function(w)  { this$0.dispatch(w, newValue, oldValue) });
        }

        return this;
    };

    function element$element$traversing$$makeTraversingMethod(methodName, propertyName, all) {
        return function(selector, andSelf) {
            if (selector && typeof selector !== "string") throw new errors$$MethodError(methodName);

            var matcher = util$selectormatcher$$default(selector),
                nodes = all ? [] : null,
                it = this[0];

            for (it = it && !andSelf ? it[propertyName] : it; it; it = it[propertyName]) {
                if (it.nodeType === 1 && (!matcher || matcher(it))) {
                    if (!all) break;

                    nodes.push(it);
                }
            }

            return all ? helpers$$default.map.call(nodes, types$$$Element) : types$$$Element(it);
        };
    }

    function element$element$traversing$$makeChildTraversingMethod(all) {
        return function(selector) {
            if (all) {
                if (selector && typeof selector !== "string") throw new errors$$MethodError("children");
            } else {
                if (selector && typeof selector !== "number") throw new errors$$MethodError("child");
            }

            var node = this[0],
                children = node ? node.children : null;

            if (!node) return all ? [] : new types$$$Element();

            if (!constants$$DOM2_EVENTS) {
                // fix IE8 bug with children collection
                children = helpers$$default.filter.call(children, function(node)  {return node.nodeType === 1});
            }

            if (all) return helpers$$default.map.call(selector ? helpers$$default.filter.call(children, util$selectormatcher$$default(selector)) : children, types$$$Element);

            if (selector < 0) selector = children.length + selector;

            return types$$$Element(children[selector]);
        };
    }

    /**
     * Find next sibling element filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#next
     * @param {String} [selector] css selector
     * @param {Boolean} [andSelf] if true than search will start from the current element
     * @return {$Element} matched element
     * @function
     */
    types$$$Element.prototype.next = element$element$traversing$$makeTraversingMethod("next", "nextSibling");

    /**
     * Find previous sibling element filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#prev
     * @param {String} [selector] css selector
     * @param {Boolean} [andSelf] if true than search will start from the current element
     * @return {$Element} matched element
     * @function
     */
    types$$$Element.prototype.prev = element$element$traversing$$makeTraversingMethod("prev", "previousSibling");

    /**
     * Find all next sibling elements filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#nextAll
     * @param {String} [selector] css selector
     * @param {Boolean} [andSelf] if true than search will start from the current element
     * @return {Array} collection of matched elements
     * @function
     */
    types$$$Element.prototype.nextAll = element$element$traversing$$makeTraversingMethod("nextAll", "nextSibling", true);

    /**
     * Find all previous sibling elements filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#prevAll
     * @param {String} [selector] css selector
     * @param {Boolean} [andSelf] if true than search will start from the current element
     * @return {Array} collection of matched elements
     * @function
     */
    types$$$Element.prototype.prevAll = element$element$traversing$$makeTraversingMethod("prevAll", "previousSibling", true);

    /**
     * Find parent element filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#parent
     * @param {String} [selector] css selector
     * @param {Boolean} [andSelf] if true than search will start from the current element
     * @return {$Element} matched element
     * @function
     */
    types$$$Element.prototype.parent = element$element$traversing$$makeTraversingMethod("parent", "parentNode");

    /**
     * Return child element by index filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#child
     * @param  {Number} index child index
     * @return {$Element} matched child
     * @function
     */
    types$$$Element.prototype.child = element$element$traversing$$makeChildTraversingMethod(false);

    /**
     * Fetch children elements filtered by optional selector
     * @memberof! $Element#
     * @alias $Element#children
     * @param  {String} [selector] css selector
     * @return {Array} collection of matched elements
     * @function
     */
    types$$$Element.prototype.children = element$element$traversing$$makeChildTraversingMethod(true);

    var element$element$visibility$$parseTimeValue = function(value)  {
            var result = parseFloat(value) || 0;
            // if duration is in seconds, then multiple result value by 1000
            return value.lastIndexOf("ms") === value.length - 2 ? result : result * 1000;
        },
        element$element$visibility$$calcDuration = function(style, prefix, iterationCount)  {
            var delay = util$stylehooks$$default.get[prefix + "delay"](style).split(","),
                duration = util$stylehooks$$default.get[prefix + "duration"](style).split(",");

            if (!iterationCount) iterationCount = util$stylehooks$$default.get[prefix + "iteration-count"](style).split(",");

            return Math.max.apply(Math, duration.map(function(value, index)  {
                var it = iterationCount[index] || "1";
                // initial or empty value equals to 1
                return (it === "initial" ? 1 : parseFloat(it)) *
                    element$element$visibility$$parseTimeValue(value) + (element$element$visibility$$parseTimeValue(delay[index]) || 0);
            }));
        },
        element$element$visibility$$transitionProps = ["timing-function", "property", "duration", "delay"].map(function(p)  {return "transition-" + p}),
        element$element$visibility$$eventType = constants$$WEBKIT_PREFIX ? "webkitTransitionEnd" : "transitionend",
        element$element$visibility$$absentStrategy = !constants$$LEGACY_ANDROID && constants$$CSS3_ANIMATIONS ? ["position", "absolute"] : ["display", "none"],
        element$element$visibility$$changeVisibility = function(el, fn, callback)  {return function()  {
            var node = el[0],
                style = node.style,
                completeVisibilityChange = function()  {
                    if (style.visibility === "hidden") {
                        style[element$element$visibility$$absentStrategy[0]] = element$element$visibility$$absentStrategy[1];
                    }

                    if (!constants$$LEGACY_ANDROID && constants$$CSS3_ANIMATIONS) {
                        // remove temporary properties
                        style.willChange = "";
                    }

                    if (callback) callback(el, node);
                },
                processVisibilityChange = function()  {
                    var compStyle = helpers$$default.computeStyle(node),
                        isHidden = typeof fn === "function" ? fn(node) : fn,
                        duration, index, transition, absentance, completeAnimation, timeoutId;
                    // Legacy Android is too slow and has a lot of bugs in the CSS animations
                    // implementation, so skip animations for it (duration value is always zero)
                    if (!constants$$LEGACY_ANDROID && constants$$CSS3_ANIMATIONS) {
                        duration = Math.max(element$element$visibility$$calcDuration(compStyle, "transition-", []), element$element$visibility$$calcDuration(compStyle, "animation-"));
                    }

                    if (duration) {
                        // make sure that the visibility property will be changed
                        // to trigger the completeAnimation callback
                        if (!style.visibility) style.visibility = isHidden ? "visible" : "hidden";

                        transition = element$element$visibility$$transitionProps.map(function(prop, index)  {
                            // have to use regexp to split transition-timing-function value
                            return util$stylehooks$$default.get[prop](compStyle).split(index ? ", " : /, (?!\d)/);
                        });

                        // try to find existing or use 0s length or make a new visibility transition
                        index = transition[1].indexOf("visibility");
                        if (index < 0) index = transition[2].indexOf("0s");
                        if (index < 0) index = transition[0].length;

                        transition[0][index] = "linear";
                        transition[1][index] = "visibility";
                        transition[isHidden ? 2 : 3][index] = "0s";
                        transition[isHidden ? 3 : 2][index] = duration + "ms";

                        transition.forEach(function(value, index)  {
                            util$stylehooks$$default.set[element$element$visibility$$transitionProps[index]](style, value.join(", "));
                        });

                        // use willChange to improve performance in modern browsers:
                        // http://dev.opera.com/articles/css-will-change-property/
                        style.willChange = transition[1].join(", ");

                        completeAnimation = function(e)  {
                            if (!e || e.propertyName === "visibility") {
                                if (e) e.stopPropagation(); // this is an internal event

                                clearTimeout(timeoutId);

                                node.removeEventListener(element$element$visibility$$eventType, completeAnimation, false);

                                completeVisibilityChange();
                            }
                        };

                        node.addEventListener(element$element$visibility$$eventType, completeAnimation, false);
                        // make sure that the completeAnimation callback will be called
                        timeoutId = setTimeout(completeAnimation, duration + 1000 / 60);
                    }

                    if (isHidden) {
                        absentance = style[element$element$visibility$$absentStrategy[0]];
                        // store current inline value in the internal property
                        if (absentance !== "none") el._._visibility = absentance;
                    } else {
                        // restore initial property value if it exists
                        style[element$element$visibility$$absentStrategy[0]] = el._._visibility || "";
                    }

                    style.visibility = isHidden ? "hidden" : "visible";
                    // trigger native CSS animation
                    el.set("aria-hidden", String(isHidden));
                    // must be AFTER changing the aria-hidden attribute
                    if (!duration) completeVisibilityChange();
                };

            // by using requestAnimationFrame we fix several issues:
            // 1) animation of new added elements (http://christianheilmann.com/2013/09/19/quicky-fading-in-a-newly-created-element-using-css/)
            // 2) firefox-specific animations sync quirks (because of the getComputedStyle call)
            // 3) power consuption: looped show/hide does almost nothing if page is not active

            // use DOM.raf only if element is in DOM to avoid quirks on hide().show() calls
            if (types$$DOM.contains(el)) {
                types$$DOM.raf(processVisibilityChange);
            } else {
                processVisibilityChange();
            }
        }},
        element$element$visibility$$makeVisibilityMethod = function(name, fn)  {return function(delay, callback) {
            var len = arguments.length,
                delayType = typeof delay;

            if (len === 1 && delayType === "function") {
                callback = delay;
                delay = 0;
            }

            if (delay && (delayType !== "number" || delay < 0) ||
                callback && typeof callback !== "function") {
                throw new errors$$MethodError(name);
            }

            callback = element$element$visibility$$changeVisibility(this, fn, callback);

            if (delay) {
                setTimeout(callback, delay);
            } else {
                callback();
            }

            return this;
        }};

    /**
     * Show element with optional callback and delay
     * @memberof! $Element#
     * @alias $Element#show
     * @param {Number}   [delay=0]  time in miliseconds to wait
     * @param {Function} [callback] function that executes when animation is done
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.show = element$element$visibility$$makeVisibilityMethod("show", false);

    /**
     * Hide element with optional callback and delay
     * @memberof! $Element#
     * @alias $Element#hide
     * @param {Number}   [delay=0]  time in miliseconds to wait
     * @param {Function} [callback] function that executes when animation is done
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.hide = element$element$visibility$$makeVisibilityMethod("hide", true);

    /**
     * Toggle element visibility with optional callback and delay
     * @memberof! $Element#
     * @alias $Element#toggle
     * @param {Number}   [delay=0]  time in miliseconds to wait
     * @param {Function} [callback] function that executes when animation is done
     * @return {$Element}
     * @function
     */
    types$$$Element.prototype.toggle = element$element$visibility$$makeVisibilityMethod("toggle", function(node) {
        return node.getAttribute("aria-hidden") !== "true";
    });

    /**
     * Watch for changes of a particular property/attribute
     * @memberof! $Element#
     * @alias $Element#watch
     * @param  {String}   name     property/attribute name
     * @param  {Function} callback watch callback the accepts (newValue, oldValue, name)
     * @return {$Element}
     */
    types$$$Element.prototype.watch = function(name, callback) {
        var watchers = this._._watchers;

        if (!watchers[name]) watchers[name] = [];

        watchers[name].push(callback);

        return this;
    };

    /**
     * Disable watching of a particular property/attribute
     * @memberof! $Element#
     * @alias $Element#unwatch
     * @param  {String}   name    property/attribute name
     * @param  {Function} callback watch callback the accepts (name, newValue, oldValue)
     * @return {$Element}
     */
    types$$$Element.prototype.unwatch = function(name, callback) {
        var watchers = this._._watchers;

        if (watchers[name]) {
            watchers[name] = watchers[name].filter(function(w)  {return w !== callback});
        }

        return this;
    };
}).call(this);