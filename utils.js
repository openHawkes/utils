/*************************************************************************
 * Copyright 2021-23 Hawkes Learning Systems

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*************************************************************************/
/* eslint quotes: ["error", "single", { "avoidEscape": true }]*/
/* eslint-disable no-invalid-regexp */
/* eslint-env browser */
(function () {
    'use strict';
    var devUrls = ['http://localhost'];
    var useOldNavbarStorageKey = 'hideOldNavbar';

    // see https://eslint.org/docs/rules/no-prototype-builtins
    function _hasProp(obj, propName) {
        return Object.prototype.hasOwnProperty.call(obj, propName);
    }

    function _compareFirstToSecond(first, second, propsToIgnore, path) {
        var msgs = [];
        propsToIgnore = propsToIgnore || [];

        // 1. Check type
        if (typeof first !== typeof second) {
            msgs.push(
                path +
                    ' -- two objects not the same type $${0}$$ $${1}$$'.formatUnicorn(
                        typeof first,
                        typeof second
                    )
            );
            return msgs;
        }

        // for now, at least, ignore function contents when comparing.
        // Same name & isFunction for both means they're equal for now.
        if (isFunction(first)) {
            return msgs;
        }

        // 2. Check value
        // Keep in mind that typeof null is 'object'
        // https://stackoverflow.com/a/18808270/1028230
        if (typeof first !== 'object' || first === null) {
            if (first !== second) {
                msgs.push(
                    '{2} -- Unequal (null and not null) or (two unequal non-objects): ##{0}## ##{1}## '.formatUnicorn(
                        (first || 'falsy').toString(),
                        (second || 'falsy').toString(),
                        (path || 'no path?').toString()
                    )
                );
            }
            return msgs;
        }

        // 3. Check properties
        for (var prop in first) {
            if (propsToIgnore.indexOf(prop) === -1) {
                if (_hasProp(first, prop) && first[prop] !== undefined) {
                    if (_hasProp(second, prop) && second[prop] !== undefined) {
                        msgs = msgs.concat(
                            _compareFirstToSecond(
                                first[prop],
                                second[prop],
                                propsToIgnore,
                                path + prop + '/'
                            )
                        );
                    } else {
                        msgs.push(path + prop + ' -- second object does not have property ' + prop);
                    }
                }
            }
        }

        return msgs;
    }

    // now verify that t doesn't have any properties
    // that are missing from s.
    // To recurse this properly, let's set up another function.
    function _compareSecondToFirst(second, first, propsToIgnore, path) {
        var msgs = [];
        propsToIgnore = propsToIgnore || [];

        for (var prop in second) {
            if (propsToIgnore.indexOf(prop) === -1) {
                if (_hasProp(second, prop) && second[prop] !== undefined) {
                    if (!first || !_hasProp(first, prop) || first[prop] === undefined) {
                        msgs.push(path + prop + ' -- first object does not have property ' + prop);
                    } else if (
                        typeof first[prop] === 'object' &&
                        typeof second[prop] === 'object'
                    ) {
                        // NOTE: To make this proceed down the object tree, even though we've already
                        // checked equality for each match, we need to keep recursively calling
                        // a check to see if the second object's object model has a prop the first's
                        // model does not.
                        //
                        // That is, we don't know what "props of props" are missing all the way
                        // down the object model without this call. But we're recursively calling this
                        // inner function so we don't do any extra comparision work.
                        msgs = msgs.concat(
                            _compareSecondToFirst(
                                second[prop],
                                first[prop],
                                propsToIgnore,
                                path + prop + '/'
                            )
                        );
                    } // else they aren't objects and we already know the props values match, as they've already been checked.
                }
            }
        }

        return msgs;
    }

    // This is the comparison part that's exported, below.
    function compareObjects(first, second, propsToIgnore) {
        return _compareFirstToSecond(first, second, propsToIgnore, '/').concat(
            _compareSecondToFirst(second, first, propsToIgnore, '/')
        );
    }

    function clone(jsonObj) {
        return JSON.parse(JSON.stringify(jsonObj));
    }

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    // https://stackoverflow.com/a/9436948/1028230
    function isString(str) {
        return typeof str === 'string' || str instanceof String;
    }

    function setCookie(name, value) {
        document.cookie =
            '{0}={1};expires=Fri, 31 Dec 9999 23:59:59 GMT;path=/;SameSite=Lax'.formatUnicorn(
                name,
                value
            );
    }

    function deleteCookie(name) {
        document.cookie = '{0}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'.formatUnicorn(
            name
        );
    }

    // https://stackoverflow.com/a/25490531/1028230
    function getCookie(cookieName) {
        var b = document.cookie.match('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
        return b ? b.pop() : '';
    }

    function _toCamelCase(s) {
        // You may also need to translate from kabob case, depending on your server.
        // prettier-ignore
        return (typeof s === 'string' || s instanceof String) && s.length > 1
            ? s[0].toLowerCase() + s.substr(1, s.length)
            : s.length ? s.toLowerCase() : s;
    }

    function _toPascalCase(s) {
        return (typeof s === 'string' || s instanceof String) && s.length > 1
            ? s[0].toUpperCase() + s.substr(1, s.length)
            : s.length
            ? s.toUpperCase()
            : s;
    }

    function camelCaseMyKeys(obj) {
        return caseMyKeys(obj, _toCamelCase);
    }

    // TODO: Do not use! This is a temporary workaround for a client-side codebase
    // that depends on PascalCased payloads from servers. Fixing here allows
    // the server to do the right thing (camelCased) without breaking the client.
    // Remove once we're in TypeScript-land and can refactor more easily.
    // (though beware of tempate usages)
    function pascalCaseMyKeys(obj) {
        return caseMyKeys(obj, _toPascalCase);
    }

    function caseMyKeys(obj, fnCaser) {
        if (Array.isArray(obj)) {
            var casedObj = [];
            obj.forEach(function (item) {
                casedObj.push(caseMyKeys(item, fnCaser));
            });
            return casedObj;
        }

        if (obj === Object(obj)) {
            var keys = Object.keys(obj);
            var newObj = {};

            keys.forEach(function (key) {
                newObj[fnCaser(key)] = caseMyKeys(obj[key], fnCaser);
            });

            return newObj;
        }

        return obj;
    }

    function logit() {
        if (console && console.log) {
            Array.prototype.forEach.call(arguments, function (arg) {
                console.log(JSON.stringify(arg, null, '  '));
            });
        }
    }

    function cleanit() {
        var compositeMsg = '';

        Array.prototype.forEach.call(arguments, function (arg) {
            compositeMsg += JSON.stringify(arg, null, '  ') + '\n\n';
        });

        return compositeMsg;
    }

    // https://stackoverflow.com/a/27533937/1028230
    function whatsRegistered(type, moduleName) {
        if (window.angular) {
            window.angular.module(moduleName || 'app')._invokeQueue.forEach(function (value) {
                if (!type || type === value[1]) {
                    console.log(value[1] + ': ' + value[2][0]);
                }
            });
        } else {
            console.log('angular is not in scope');
        }
    }

    function warn(msg, data) {
        if (console && console.warn) {
            if (data) {
                if (data.statusText && data.data && data.data.StackTrace) {
                    msg +=
                        data.statusText +
                        ' -- first 400:\n\n' +
                        data.data.StackTrace.substring(0, 400);
                } else {
                    msg += '\n' + JSON.stringify(data, null, '  ');
                }
            }
            console.warn(msg);

            // Will only fire if you've manually set a truthy [string] value for this cookie.
            if (window.utils.getCookie('alertme')) {
                window.alert(
                    'WARNING\n===============================\n\n' +
                        msg.substr(0, Math.min(120, msg.length))
                );
            }
        }
    }

    function devDebugger() {
        if (
            devUrls.find(function (url) {
                return location.href.indexOf(url) === 0;
            })
        ) {
            //eslint-disable-next-line
            debugger;
        }
    }

    function stringTruthiness(x) {
        return x || x === '';
    }

    //========================================================================
    // Right now, these are only used in QB's blocked-action-check.service.js
    //========================================================================
    function setDebugCookie() {
        setCookie('isDebug', true);
    }

    function deleteDebugCookie() {
        deleteCookie('isDebug');
    }

    function hasDebugCookie() {
        return getCookie('isDebug');
    }
    //========================================================================
    //========================================================================

    // This would be replaced by a call to settings
    // or some other means of checking feature flags.
    let _useNewNav = localStorage.getItem(useOldNavbarStorageKey) === 'true';

    function createApiUri(optionalRelativePath) {
        optionalRelativePath = optionalRelativePath || '';
        optionalRelativePath =
            optionalRelativePath && !optionalRelativePath.startsWith('/')
                ? '/' + optionalRelativePath
                : optionalRelativePath;

        return (window.useApi ? 'QuestionBuilder.Api/api' : 'api') + optionalRelativePath;
    }

    function setUseNewNav(value) {
        value = value === 'true' || value === true;
        localStorage.setItem(useOldNavbarStorageKey, value);
        _useNewNav = value;
    }

    if (window.utils) {
        console.error('window.utils already defined! (CDN)');
    }

    window.utils = window.utils || {
        setUseNewNav,

        // this gives utils a read-only *property*
        get useNewNav() {
            return _useNewNav;
        },

        cleanit,
        clone,
        createApiUri,
        logit,
        whatsRegistered,

        camelCaseMyKeys,
        pascalCaseMyKeys,

        compareObjects,
        isFunction,
        isString,
        stringTruthiness,

        devDebugger,
        warn,

        deleteCookie,
        deleteDebugCookie,
        getCookie,
        hasDebugCookie,
        setCookie,
        setDebugCookie,
    };
})();
