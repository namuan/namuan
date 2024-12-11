// ==UserScript==
// @name         Build LLM context
// @namespace    http://namuan.github.io/
// @version      1.0
// @description  Add Context button that redirects to gitingest.com
// @author       Namuan
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function addContextButton() {
        // Find the Code button
        const codeButton = document.querySelector('button[data-variant="primary"] span.prc-Button-Label-pTQ3x');

        if (codeButton && codeButton.textContent === 'Code' && !document.querySelector('#contextButton')) {
            const codeButtonParent = codeButton.closest('button');

            // Create the new button
            const newButton = document.createElement('button');
            newButton.id = 'contextButton';
            newButton.setAttribute('data-component', 'IconButton');
            newButton.setAttribute('type', 'button');
            newButton.setAttribute('aria-label', 'Context');
            newButton.setAttribute('aria-haspopup', 'true');
            newButton.setAttribute('aria-expanded', 'false');
            newButton.setAttribute('tabindex', '0');
            newButton.setAttribute('data-loading', 'false');
            newButton.setAttribute('data-no-visuals', 'true');
            newButton.setAttribute('data-size', 'medium');
            newButton.setAttribute('data-variant', 'default');
            newButton.className = 'prc-Button-ButtonBase-c50BI';

            // Add custom styles to ensure text fits
            newButton.style.minWidth = 'fit-content';
            newButton.style.padding = '6px 12px';

            // Create button content
            const buttonContent = document.createElement('span');
            buttonContent.className = 'prc-Button-Label-pTQ3x';
            buttonContent.textContent = 'Context';
            buttonContent.style.whiteSpace = 'nowrap';

            newButton.appendChild(buttonContent);

            // Create a spacing element
            const spacer = document.createElement('span');
            spacer.style.marginRight = '8px';

            // Insert the new button and spacer before the Code button
            codeButtonParent.parentNode.insertBefore(newButton, codeButtonParent);
            codeButtonParent.parentNode.insertBefore(spacer, codeButtonParent);

            // Add click event listener to the new button
            newButton.addEventListener('click', function () {
                const currentPath = window.location.pathname;
                window.open('https://gitingest.com' + currentPath, '_blank');
            });
        }
    }

    // Initial check
    addContextButton();

    // Create a MutationObserver to handle dynamic page changes
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (!document.querySelector('#contextButton')) {
                addContextButton();
            }
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();