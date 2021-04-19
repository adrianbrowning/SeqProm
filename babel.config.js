/***
 * Created by adrianbrowning on 16/10/2018
 */
"use strict";

const presets = [
  [
    "@babel/env",
    {
      targets: {
        edge: "17",
        firefox: "60",
        chrome: "67",
        safari: "11.1",
        "ie": "11"
      }
    },
  ],
];

module.exports = { presets };