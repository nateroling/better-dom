import _ from "../util/index";
import { JSCRIPT_VERSION, DOCUMENT } from "../const";
import { DOM } from "../types";

var hooks = {get: {}, set: {}};

// fix camel cased attributes
"tabIndex readOnly maxLength cellSpacing cellPadding rowSpan colSpan useMap frameBorder contentEditable".split(" ").forEach((key) => {
    hooks.get[ key.toLowerCase() ] = (node) => node[key];
});

// style hook
hooks.get.style = (node) => node.style.cssText;
hooks.set.style = (node, value) => { node.style.cssText = value };

// title hook for DOM
hooks.get.title = (node) => {
    var doc = node.ownerDocument;

    return node === doc.documentElement ? doc.title : node.title;
};

hooks.set.title = (node, value) => {
    var doc = node.ownerDocument;

    (node === doc.documentElement ? doc : node).title = value;
};

hooks.get.undefined = (node) => {
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

hooks.set.value = function(node, value) {
    if (node.tagName === "SELECT") {
        // selectbox has special case
        if (_.every.call(node.options, (o) => !(o.selected = o.value === value))) {
            node.selectedIndex = -1;
        }
    } else {
        // for IE use innerText for textareabecause it doesn't trigger onpropertychange
        node[JSCRIPT_VERSION < 9 && node.type === "textarea" ? "innerText" : "value"] = value;
    }
};

// some browsers don't recognize input[type=email] etc.
hooks.get.type = (node) => node.getAttribute("type") || node.type;
/* istanbul ignore if */
if (JSCRIPT_VERSION < 9) {
    // IE8 has innerText but not textContent
    hooks.get.textContent = (node) => node.innerText;
    hooks.set.textContent = (node, value) => { node.innerText = value };

    // IE8 sometimes breaks on innerHTML
    hooks.set.innerHTML = function(node, value) {
        try {
            node.innerHTML = value;
        } catch (err) {
            node.innerText = "";

            DOM.createAll(value).forEach((x) => {
                node.appendChild(x);
            });
        }
    };
}

export default hooks;
