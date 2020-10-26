"use strict";

/* native modules */
const assert = require("assert");

/* npm modules */
const _ = require("lodash");

/* exports */
module.exports = MergeArgs;

// default configuration options
const defaultConfig = {
  // concat arrays instead of replacing
  concatArrays: true,
  // convert empty strings to undefined
  emptyStringUndefined: true,
};

var mergeConfig = MergeArgs();

/**
 * @function MergeArgs
 *
 * @param {object} args
 *
 * @returns {function}
 *
 * @throws {Error}
 */
function MergeArgs(args) {
  // clone local config from default
  var config = _.cloneDeep(defaultConfig);
  // if config passed then merge config
  if (args !== undefined) {
    mergeConfig(config, args);
  }

  // create merge function

  /**
   * @funtion mergeArgs
   *
   * merge args into target object using options specified by config
   *
   * @param {object} target
   * @param {object} args
   *
   * @throws {Error}
   */
  var mergeArgs = function mergeArgs(target, args) {
    // require target object
    assert.ok(target && typeof target === "object", "target must be object");
    // if args is undefined then nothing to do
    if (args === undefined) {
      return;
    }
    // require args to be object
    assert.ok(args && typeof args === "object", "args must be object");
    // check it target is empty
    var targetIsEmpty = _.keys(target).length === 0 ? true : false;
    // iterate over args properties
    _.each(args, (val, key) => {
      // only validate against target if target has properties
      if (!targetIsEmpty) {
        // require key to exist in target
        // eslint-disable-next-line
        assert.ok(target.hasOwnProperty(key), "invalid argument " + key);
        // if target property has type then type must match
        if (target[key] !== undefined) {
          assert.ok(
            typeof target[key] === typeof args[key],
            "invalid type " +
              typeof args[key] +
              " for " +
              key +
              " " +
              typeof target[key] +
              " required"
          );
        }
      }
      // if property is an array then either concat or replace
      if (Array.isArray(target[key])) {
        // concat arrays
        if (config.concatArrays) {
          target[key] = target[key].concat(args[key]);
        }
        // otherwise replace
        else {
          target[key] = args[key];
        }
      }
      // if property is an object then do recursive merge
      else if (typeof target[key] === "object") {
        mergeArgs(target[key], args[key]);
      }
      // all other values overwrite
      else {
        target[key] = args[key];
      }
    });
    // convert empty strings to undefined
    if (config.emptyStringUndefined) {
      _.each(target, (val, key) => {
        if (typeof val === "string" && val.length === 0) {
          target[key] = undefined;
        }
      });
    }
  };

  // return function
  return mergeArgs;
}
