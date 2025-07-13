// ==UserScript==
// @name         Grok Delete File Uploads
// @namespace    namuan
// @version      2025.07.13
// @description  Add a button to delete all uploaded files on grok.com/files
// @homepageURL  https://github.com/namuan/
// @author       namuan
// @match        https://grok.com/files
// @run-at       document-end
// @grant        none
// ==/UserScript==

// Forked from https://github.com/nisc/grok-userscripts/
// DISCLAIMER: These scripts are provided "AS IS" without warranty of any kind. Use them at your own risk.
// The authors are not responsible for any consequences of using these scripts, including but not limited to:
// Account-related issues
// Data loss or corruption
// Browser performance problems
// Any changes to Grok's functionality or behavior
// Terms of Service violations

(function() {
    'use strict';

    /**
     * Configuration object containing all constants used in the script
     * - Button appearance and behavior settings
     * - DOM selectors for finding elements
     * - Timing delays for various operations
     */
    const CONFIG = {
        BUTTON_ID: 'delete-all-btn',
        BUTTON_TEXT: 'Delete all files',
        BUTTON_STYLES: {
            backgroundColor: 'white',
            color: 'black',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginLeft: '10px'
        },
        DELETE_BUTTON_SELECTOR: 'button[aria-label="Delete file"]',
        CONFIRM_BUTTON_SELECTOR: 'button[aria-label="Delete"]',
        DELAYS: {
            CONFIRM_BUTTON: 200,   // Time to wait after clicking confirm button
            MODAL_RENDER: 500      // Time to wait for the confirmation modal to render
        }
    };

    /**
     * Utility function to create a promise that resolves after specified milliseconds
     * Used to add necessary delays between operations
     */
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    /**
     * Deletes all files one by one.
     * It repeatedly finds a delete button, clicks it, then finds and clicks the confirmation button.
     * Delays are added between operations to allow the UI to update.
     */
    async function deleteAll() {
        while (true) {
            const deleteButton = document.querySelector(CONFIG.DELETE_BUTTON_SELECTOR);
            if (!deleteButton) {
                console.log("No more files to delete.");
                break;
            }

            deleteButton.click();
            await sleep(CONFIG.DELAYS.MODAL_RENDER);

            const confirmButton = document.querySelector(CONFIG.CONFIRM_BUTTON_SELECTOR);
            if (!confirmButton) {
                console.error("Could not find the confirm button. Stopping.");
                break;
            }

            confirmButton.click();
            await sleep(CONFIG.DELAYS.CONFIRM_BUTTON);
        }
    }

    /**
     * Creates and adds the "Delete all files" button to the page
     * Only adds the button if it doesn't already exist
     */
    function addButton() {
        if (document.getElementById(CONFIG.BUTTON_ID)) {
            return;
        }

        const searchInputSpan = Array.from(document.querySelectorAll('span.sr-only')).find(span => span.textContent === 'Show search input');
        if (!searchInputSpan) {
            return;
        }

        const searchButton = searchInputSpan.closest('button');
        if (searchButton && searchButton.parentNode) {
            const btn = document.createElement('button');
            btn.id = CONFIG.BUTTON_ID;
            btn.textContent = CONFIG.BUTTON_TEXT;
            Object.assign(btn.style, CONFIG.BUTTON_STYLES);
            btn.addEventListener('click', deleteAll);
            searchButton.parentNode.insertBefore(btn, searchButton.nextSibling);
        }
    }

    // Watch for DOM changes and try to add button when possible
    // This ensures the button is added even if the container loads dynamically
    new MutationObserver(addButton).observe(document.body, { childList: true, subtree: true });

    // Initial attempt to add the button
    addButton();
})();
