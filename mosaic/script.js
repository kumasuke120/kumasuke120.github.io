/*
* Javascript for Mosaic Grids
*
* author:           Kumasuke (bearcomingx@gmail.com)
* compatibility:    Chrome 45+, Edge 13+, Firefox 45+
* date:             01/29/2016
*/

(function () {
    "use strict";

    function $(selectors) { // jQuery-like select function
        var elems = document.querySelectorAll(selectors);
        return (elems.length === 0) ? undefined :
            (elems.length === 1) ? elems[0] : elems;
    }

    Array.prototype.equals = function (o) {
        if (this === o)
            return true;
        if (!(o instanceof Array))
            return false;
        if (this.length !== o.length)
            return false;

        for (let i = 0; i < this.length; i++) {
            let oItem = o[i];

            if (oItem instanceof Array) {
                if (!this[i].equals(oItem))
                    return false;
            }
            else {
                if (this[i] !== oItem)
                    return false;
            }
        }

        return true;
    };

    // radix 64 converter
    var kRadix64 = (function () {
        const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz" +
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
        const REGEX_INVALID_R64_CHAR = /[^0-9a-zA-Z-_]/;

        const N_R64 = 6;
        const REGEX_R64_SPLIT = new RegExp(`[01]{${N_R64}}`, "g");

        const N_HEX = 4;
        const REGEX_HEX_SPLIT = new RegExp(`[01]{${N_HEX}}`, "g");

        function padZero(s, n) {
            var nZero = (n - s.length % n) % n;

            return "0".repeat(nZero) + s;
        }

        return {
            isValidR64String: function (str) {
                return str.search(REGEX_INVALID_R64_CHAR) === -1;
            },
            binToR64: function (str) {
                // makes sure the length of the string passed in is a
                // multiple of 6, if not pad it with leading zero(s)
                var paddedStr = padZero(str, N_R64);
                
                // splits string of binary digits into chunks of 6,
                // converts binary numbers into radix 64 digits, 
                // and join these digits into one single string
                return paddedStr.match(REGEX_R64_SPLIT)
                    .map(i => DIGITS.charAt(Number("0b" + i)))
                    .join("");
            },
            r64ToBin: function (str, len) {
                // split string into an arrry of characters,
                // converts radix 64 digits into binary numbers,
                // and join them together 
                var tmp = str.split("")
                    .map(i => {
                        var t = DIGITS.indexOf(i).toString(2);

                        return padZero(t, N_R64);
                    }).join("");

                // if smaller length is specified, result will be
                // truncated to fit the given length
                if (len !== undefined && len < tmp.length)
                    return tmp.substr(tmp.length - len);
                else
                    return tmp;
            },
            hexToR64: function (str) {
                // converts each character of string into 6 bits
                // binary code, joins them into single string, and
                // calls other function to finish the job
                var tmp = str.split("")
                    .map(i => padZero(Number("0x" + i).toString(2), N_HEX))
                    .join("");

                return this.binToR64(tmp);
            },
            r64ToHex: function (str, len) {
                // calls other function to convert radix 64 string
                // to binary number string, splits it into groups
                // of 4, converts them into hexadecimal digits,
                // and join them together
                var tmp = padZero(this.r64ToBin(str), N_HEX)
                    .match(REGEX_HEX_SPLIT)
                    .map(i => Number("0b" + i).toString(16))
                    .join("");

                // if smaller length is specified, result will be
                // truncated to fit the given length
                if (len !== undefined && len < tmp.length)
                    return tmp.substr(tmp.length - len);
                else
                    return tmp;
            }
        };
    })();

    class GridsConfig {
        constructor(count, size, foreColor, backColor, inverse, states) {
            this.count = count || GridsConfig.DEF_COUNT;
            this.size = size || GridsConfig.DEF_SIZE;
            this.foreColor = foreColor || GridsConfig.DEF_FORE_COLOR;
            this.backColor = backColor || GridsConfig.DEF_BACK_COLOR;
            this.inverse = inverse || GridsConfig.DEF_INVERSE;
            this.states = states || GridsConfig.DEF_STATES(this.count);
        }

        static get DEF_COUNT() {
            return 9;
        }

        static get DEF_SIZE() {
            return 50;
        }

        static get DEF_FORE_COLOR() {
            return "#000000";
        }

        static get DEF_BACK_COLOR() {
            return "#ffffff";
        }

        static get DEF_INVERSE() {
            return false;
        }

        static DEF_STATES(count) {
            if (count === undefined)
                count = GridsConfig.DEF_COUNT;

            var result = new Array(count);

            for (let i = 0; i < count; i++) {
                result[i] = new Array(count);

                for (let j = 0; j < count; j++)
                    result[i][j] = (i + j) % 2 !== 0;
            }

            return result;
        }

        static get MIN_COUNT() {
            return 1;
        }

        static get MAX_COUNT() {
            return 64;
        }

        static get MIN_SIZE() {
            return 15;
        }

        static get MAX_SIZE() {
            return 150;
        }

        static fromMap(map) {
            var count = parseInt(map.get("count"));
            var size = parseInt(map.get("size"));
            var foreColor = map.get("fore-color");
            var backColor = map.get("back-color");
            var inverse = map.has("inverse");
            var states = GridsConfig.stringToStates(map.get("states"),
                                                    count);
            
            // in case of uppercase hexdecimal color value
            foreColor = foreColor ? foreColor.toLowerCase() : foreColor;
            backColor = backColor ? backColor.toLowerCase() : backColor;

            return new GridsConfig(count, size, foreColor, backColor,
                                   inverse, states);
        }

        static fromString(str) {
            var data = str.split("!");
            var count, size, foreColor, backColor, inverse, states;

            try {
                count = parseInt(data[0], 16);
                size = parseInt(data[1], 16);
                foreColor = "#" + kRadix64.r64ToHex(data[2]);
                backColor = "#" + kRadix64.r64ToHex(data[3]);

                let tmpStates = data[4];

                if (tmpStates !== undefined) {
                    inverse = (tmpStates.charAt(0) === "~");
                    tmpStates = inverse ? tmpStates.substr(1) : tmpStates;
                    states = GridsConfig.stringToStates(tmpStates, count);
                }
            } catch (e) {
                states = []; // invalidates the created config
            }

            return new GridsConfig(count, size, foreColor, backColor,
                                   inverse, states);
        }

        static stringToStates(str, count) {
            if (str === undefined || str === "")
                return undefined; // uses default states
            if (!kRadix64.isValidR64String(str))
                return []; // invalid states
            if (count === undefined)
                count = GridsConfig.DEF_COUNT;

            try {
                var s = kRadix64.r64ToBin(str, count * count);

                // converts the string into 2-dimensional boolean array
                return s.match(new RegExp(`[01]{${count}}`, "g"))
                    .map(i => i.split("").map(j => j === "1"));
            } catch (e) {
                return []; // invalid states
            }
        }

        get isDefault() {
            return (this.count === GridsConfig.DEF_COUNT) &&
                (this.size === GridsConfig.DEF_SIZE) &&
                (this.foreColor === GridsConfig.DEF_FORE_COLOR) &&
                (this.backColor === GridsConfig.DEF_BACK_COLOR) &&
                (this.inverse === GridsConfig.DEF_INVERSE) &&
                (this.states.equals(GridsConfig.DEF_STATES(this.count)));
        }

        get isValid() {
            var isValidNumber = function (num, min, max) {
                return (typeof num === "number") &&
                    (num >= min && num <= max);
            };
            var isValidColor = function (color) {
                return (typeof color === "string") &&
                    color.match(/^#[0-9a-f]{6}$/);
            };
            var isValidStates = function (s, c) {
                return (s instanceof Array) && (s.length === c) &&
                    (function () {
                        for (let i = 0; i < c; i++) {
                            if (!(s instanceof Array) || s[i].length !== c)
                                return false;
                            for (let j = 0; j < c; j++) {
                                if (typeof s[i][j] !== "boolean")
                                    return false;
                            }
                        }

                        return true;
                    })();
            };

            return isValidNumber(this.count,
                GridsConfig.MIN_COUNT, GridsConfig.MAX_COUNT) &&
                isValidNumber(this.size,
                              GridsConfig.MIN_SIZE,
                              GridsConfig.MAX_SIZE) &&
                isValidColor(this.foreColor) &&
                isValidColor(this.backColor) &&
                typeof this.inverse === "boolean" &&
                isValidStates(this.states, this.count);
        }

        toSimpleString() {
            var foreColorStr = kRadix64.hexToR64
                (this.foreColor.substr(1));
            var backColorStr = kRadix64.hexToR64
                (this.backColor.substr(1));
            var statesStr = "";

            // attaches states string unless states is default one
            if (!this.states.equals(GridsConfig.DEF_STATES(this.count)))
                statesStr = kRadix64.binToR64(this.states
                    .map(i => i.map(j => j ? "1" : "0").join(""))
                    .join(""));

            var tmp = `${this.count.toString(16) }!` +
                `${this.size.toString(16) }!` +
                `${foreColorStr}!${backColorStr}!` +
                `${this.inverse ? "~" : ""}${statesStr}`;

            if (tmp.charAt(tmp.length - 1) === "!")
                tmp = tmp.substring(0, tmp.length - 1);

            return tmp;
        }
    }

    // retrieves url parameters of GET method
    var urlParser = (function () {
        var url = location.href;
        var pos = url.lastIndexOf("?");
        var originParasStr = (pos !== -1) ? url.substring(pos + 1) : "";

        return {
            get parameters() {
                var result = new Map();

                if (this.hasParameters) {
                    let originParas = originParasStr.split("&");

                    originParas.forEach(p => {
                        var splitPos = p.indexOf("=");
                        var key = decodeURIComponent
                            (p.substring(0, splitPos)).trim();
                        var name = decodeURIComponent
                            (p.substring(splitPos + 1)).trim();

                        result.set(key, name);
                    });
                }

                return result;
            },
            get hasParameters() {
                return originParasStr.length !== 0;
            },
            get pureUrl() { // url without parameters
                return (pos === -1) ? url : url.substring(0, pos);
            }
        };
    })();

    var generator = (function () {
        var config;
        var target;

        function toggleState(g) {
            var gd = g.dataset;

            gd.state = (gd.state === "false") ? "true" : "false";
            config.states[gd.row][gd.col] = (gd.state === "true");
        }

        function setState(g, v) {
            var gd = g.dataset;

            gd.state = v ? "true" : "false";
            config.states[gd.row][gd.col] = v;
        }

        function applyOnEachGrid(f) {
            var rows = target.getElementsByTagName("div");

            for (let i = 0; i < rows.length; i++) {
                let cols = rows[i].getElementsByTagName("span");

                for (let j = 0; j < cols.length; j++)
                    f(cols[j]);
            }
        }

        function appendInternalCss() {
            var size = config.size;
            var foreColor = config.foreColor;
            var backColor = config.backColor;
            var inverse = config.inverse;
            var wholeSize = config.count * size;

            var css = document.createElement("style");
            css.setAttribute("type", "text/css");
            css.innerHTML =
            `header,
            footer,
            #controls .tooltip,
            form .button-group button,
            form input[type='checkbox']:checked + .fake-checkbox span {
                background-color: ${foreColor};
                color: ${backColor};
            }

            body,
            .dialog,
            form input,
            #controls button,
            .dialog .dialog-header .close,
            .dialog .dialog-content input,
            .dialog .dialog-footer button {
                background-color: ${backColor};
                color: ${foreColor};
            }

            #controls .tooltip::after {
                border-color: ${foreColor} transparent
                	transparent transparent;
            }

            #canvas {
                width: ${wholeSize}px;
                height: ${wholeSize}px;
            }

            #canvas span {
                width: ${size}px;
                height: ${size}px;
            }

            #canvas span[data-state='true'] {
                background-color: ${inverse ? backColor : foreColor};
            }

            #canvas span[data-state='false'] {
                background-color: ${inverse ? foreColor : backColor};
            }`;

            document.head.appendChild(css);
        }

        function insertGrids() {
            var count = config.count;
            var states = config.states;
            var clickHandler = e => toggleState(e.target);

            for (let i = 0; i < count; i++) {
                let row = document.createElement("div");

                for (let j = 0; j < count; j++) {
                    let col = document.createElement("span");

                    col.dataset.state = states[i][j] ? "true" : "false";
                    col.dataset.row = i;
                    col.dataset.col = j;
                    col.addEventListener("click", clickHandler);
                    row.appendChild(col);
                }

                target.appendChild(row);
            }
        }

        return {
            get gridsConfig() {
                return config;
            },
            set gridsConfig(value) {
                if (config === undefined)
                    config = value;
                else
                    throw new Error("gridsConfig has already been set.");
            },
            get targetCanvas() {
                return target;
            },
            set targetCanvas(value) {
                if (target === undefined)
                    target = value;
                else
                    throw new Error("targetCanvas has already been set.");
            },
            generate: function () {
                appendInternalCss();
                insertGrids();
            },
            inverseAll: function () {
                applyOnEachGrid(toggleState);
            },
            useDefault: function () {
                var defStates = GridsConfig.DEF_STATES(config.count);

                applyOnEachGrid(g => {
                    var i = g.dataset.row;
                    var j = g.dataset.col;

                    setState(g, defStates[i][j]);
                });
            },
            allForeground: function () {
                applyOnEachGrid(g => setState(g, true));
            },
            allBackground: function () {
                applyOnEachGrid(g => setState(g, false));
            },
            share: function () {
                var configUrl = urlParser.pureUrl;

                if (!config.isDefault) {
                    let cfg = config.toSimpleString();
                    let encodedCfg = encodeURIComponent(cfg);
                    
                    configUrl += "?cfg=" + encodedCfg;
                }

                $("#share-dialog").style.display = "block";
                $("#config-url").value = configUrl;
            }
        };
    })();
    
    function getConfigFromParameters() {
        var paras = urlParser.parameters;

        if (paras.has("cfg")) {
            let cfg = paras.get("cfg");

            return GridsConfig.fromString(cfg);
        } else
            return GridsConfig.fromMap(paras);
    }

    function setControls(cfg) {
        // header
        $("header h1").addEventListener("click",
            () => location.assign(urlParser.pureUrl));

        // canvas controls
        $("#reload-canvas").addEventListener
            ("click", () => location.reload());
        $("#use-default").addEventListener("click", generator.useDefault);
        $("#invert-all").addEventListener("click", generator.inverseAll);
        $("#all-foreground").addEventListener
            ("click", generator.allForeground);
        $("#all-background").addEventListener
            ("click", generator.allBackground);

        // grids config
        var iptCount = $("#count");
        var iptSize = $("#size");

        iptCount.value = cfg.count;
        iptCount.min = GridsConfig.MIN_COUNT;
        iptCount.max = GridsConfig.MAX_COUNT;


        iptSize.value = cfg.size;
        iptSize.min = GridsConfig.MIN_SIZE;
        iptSize.max = GridsConfig.MAX_SIZE;

        $("#fore-color").value = cfg.foreColor;
        $("#back-color").value = cfg.backColor;
        $("#inverse").checked = cfg.inverse;      
          
        // share dialog
        var closeShareDialog = () => $("#share-dialog").style.display = "";
        var timeoutId;
        var copyConfigUrl = () => {
            // in case that there are multiple function waiting 
            // to be executed
            if (timeoutId !== undefined)
                clearTimeout(timeoutId);

            let txtMsg = $("#share-dialog .message");

            $("#config-url").select();
            let msg = document.execCommand('copy') ? "succeeded" : "failed";
            txtMsg.innerHTML = `Copy ${msg}!`;
            txtMsg.style.display = "inline";
            timeoutId = setTimeout(() => {
                txtMsg.style.display = "";
                timeoutId = undefined;
            }, 3500);
        };

        $("#share").addEventListener("click", generator.share);
        $("#share-dialog .close").addEventListener
        	("click", closeShareDialog);
        $("#share-dialog button:nth-child(2)").addEventListener
            ("click", copyConfigUrl);
        $("#share-dialog button:nth-child(3)").addEventListener
            ("click", closeShareDialog);
    }

    function startGenerator(cfg) {
        generator.gridsConfig = cfg;
        generator.targetCanvas = $("#canvas");
        generator.generate();
    }

    document.body.onload = function () {
        var gridsCfg;

        if (urlParser.hasParameters) {
            gridsCfg = getConfigFromParameters();

            if (gridsCfg.isDefault)
                location.replace(urlParser.pureUrl);
            if (!gridsCfg.isValid) {
                document.body.innerHTML =
                `<p class="error">Invalid configuration!
                        Click <a href="${urlParser.pureUrl}">here</a>
                        to go back to default.</p>`;

                return;
            }
        } else
            gridsCfg = new GridsConfig();

        setControls(gridsCfg);
        startGenerator(gridsCfg);
    };
})();