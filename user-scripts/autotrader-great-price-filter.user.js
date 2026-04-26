// ==UserScript==
// @name         Autotrader Great Price Filter
// @namespace    namuan
// @version      0.1
// @description  Filter Autotrader results to show only Great price listings
// @author      You
// @match       https://www.autotrader.co.uk/car-search*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function () {
  "use strict";

  var style = document.createElement("style");
  style.textContent = ".listing-row-great-hidden { display: none !important; }";
  document.head.appendChild(style);

  var HIDDEN_CLASS = "listing-row-great-hidden";

  function filterCards() {
    var listItems = document.querySelectorAll(
      'li[id^="id-"], li[data-testid^="id-"]',
    );

    listItems.forEach(function (li) {
      if (li.classList.contains(HIDDEN_CLASS)) return;

      var text = li.textContent;
      var isLeasing =
        li.querySelector('[data-testid="LEASING_LISTING"]') !== null;
      var hasGreatPrice = text.includes("Great price");

      if (!hasGreatPrice || isLeasing) {
        li.classList.add(HIDDEN_CLASS);
      }
    });
  }

  var observer = new MutationObserver(function (mutations) {
    filterCards();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(filterCards, 2000);

  console.log("[Autotrader Great Price Filter] Active");
  filterCards();
})();
