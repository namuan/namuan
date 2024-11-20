// ==UserScript==
// @name         LazyTrader Link
// @namespace    namuan
// @version      0.1
// @description  Adds links next to ticker symbols
// @author       You
// @match        https://finviz.com/screener.ashx*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    Array.from(document.querySelectorAll('tr')).filter(tr =>
        Array.from(tr.getElementsByTagName('td')).some(td =>
            td.textContent.includes('Ticker')
        )
    ).forEach(tr => {
        const allTDs = tr.getElementsByTagName('td');
        if (allTDs.length >= 2) {
            const tickerLink = allTDs[1].querySelector('a');
            if (tickerLink) {
                const tickerSymbol = tickerLink.textContent;

                // LazyTrader Link
                const lazyTraderLink = document.createElement('a');
                lazyTraderLink.href = `https://namuan.github.io/lazy-trader/?symbol=${tickerSymbol}`;
                lazyTraderLink.textContent = ' [LazyTrader]';
                lazyTraderLink.target = "_blank";
                lazyTraderLink.className = "tab-link";
                lazyTraderLink.style.marginLeft = '5px';
                allTDs[1].appendChild(lazyTraderLink);

                // TradingView Link
                const tradingViewLink = document.createElement('a');
                tradingViewLink.href = `https://www.tradingview.com/chart/?symbol=${tickerSymbol}`;
                tradingViewLink.textContent = ' [TradingView]';
                tradingViewLink.target = "_blank";
                tradingViewLink.className = "tab-link";
                tradingViewLink.style.marginLeft = '5px';
                allTDs[1].appendChild(tradingViewLink);
            }
        }
    });
})();