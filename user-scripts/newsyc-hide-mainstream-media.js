// ==UserScript==
// @name         Hide Links From Mainstream Media
// @namespace    namuan
// @version      0.1
// @description  Hides all links from mainstream media websites on news.ycombinator
// @match        https://news.ycombinator.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Specify the list of mainstream media website substrings to check for
    var mainstreamMediaWebsites = [
        "cnn.com",
        "bbc.com",
        "nytimes.com",
        "washingtonpost.com",
        "theguardian.com",
        "abcnews.go.com",
        "nbcnews.com",
        "cbsnews.com",
        "foxnews.com",
        "msnbc.com",
        "npr.org",
        "reuters.com",
        "apnews.com",
        "aljazeera.com",
        "bloomberg.com",
        "forbes.com",
        "ft.com",
        "wsj.com",
        "arstechnica.com",
        "newyorker.com"
    ];

    // Find all HTML elements containing links
    var linkElements = document.querySelectorAll("a[href^='from?site=']");

    // Loop through all link elements and remove the closest <tr> element with class 'athing' to the link if the link is from a mainstream media website
    for (var i = 0; i < linkElements.length; i++) {
        var link = linkElements[i];
        if (link.href) {
            if (mainstreamMediaWebsites.some(function(site) { return link.href.includes(site); })) {
                var tr = link.closest("tr.athing");
                if (tr) {
                    // Hide the <tr> element
                    tr.style.display = "none";
                }
            }
        }
    }
})();
