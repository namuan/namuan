// ==UserScript==
// @name       Write a Note!
// @version    2.3.3
// @description  You can edit a note on all websites!
// @match      *://*/*
// @copyright  2025+, namuan
// @namespace  namuan
// @grant      GM_registerMenuCommand
// @grant      GM_setValue
// @grant      GM_getValue
// @grant      GM_listValues
// ==/UserScript==

(function () {
    'use strict';

    const WriteANote = {
        // Configuration
        config: {
            popup: {
                minWidth: '500px',
                minHeight: '350px',
                zIndex: '9999999999999',
                backgroundColor: '#ffffff',
                borderRadius: '8px'
            },
            styles: `
        writeanotelittle {
          font-family: Tahoma;
          font-size: 0;
          cursor: pointer;
          z-index: 9999999999999;
          white-space: nowrap;
          text-align: left;
          color: black;
          transition: all 0.3s ease;
          overflow: hidden;
          width: 10px;
          min-width: 10px;
          min-height: 10px;
          height: 10px;
          background-color: yellow;
          position: fixed;
          top: 0;
          left: 0;
          text-overflow: ellipsis;
          opacity: 0.8;
          border: 1px solid black;
          border-radius: 3px;
        }
        writeanotelittle:hover {
          font-size: 14px;
          width: 100px;
          height: 20px;
        }
      `,
            translations: {
                title: 'Your Note',
                save: 'Save',
                delete: 'Delete',
                settings: 'Settings',
                saved: 'Your note was saved!',
                deleted: 'Your note was deleted!',
                close: 'Close',
                littleNoteLabel: 'Enable little note in top-left page-corner'
            }
        },

        // State
        state: {
            pageURL: document.location.toString(),
            littleNote: false,
            window: (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window
        },

        // Initialize the script
        init() {
            this.registerMenuCommand();
            this.loadLittleNoteState();
            this.insertStyles();
            this.checkForLittleNote();
        },

        // Register Greasemonkey menu command
        registerMenuCommand() {
            GM_registerMenuCommand('Write A Note', () => this.openPopup());
        },

        // Load little note state
        loadLittleNoteState() {
            this.state.littleNote = GM_getValue('littleNote', 'false') === 'true';
        },

        // Insert CSS styles
        insertStyles() {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.textContent = this.config.styles;
            document.head.appendChild(style);
        },

        // Get all stored notes
        getAllNotes() {
            return GM_listValues()
                .filter(key => key.endsWith('_notf'))
                .map(key => ({
                    url: key.slice(0, -5),
                    note: GM_getValue(key) || ''
                }))
                .filter(note => note.note);
        },

        // Get saved note for current page
        getSavedNote() {
            return GM_getValue(`${this.state.pageURL}_notf`, '');
        },

        // Create and open popup
        openPopup() {
            const existingPopup = document.querySelector('writeanotepopup');
            if (existingPopup) {
                existingPopup.style.display = 'block';
                return;
            }

            const popup = document.createElement('writeanotepopup');
            Object.assign(popup.style, {
                position: 'fixed',
                borderRadius: this.config.popup.borderRadius,
                minWidth: this.config.popup.minWidth,
                minHeight: this.config.popup.minHeight,
                left: `${(window.innerWidth - 500) / 2}px`,
                top: `${(window.innerHeight - 350) / 2}px`,
                zIndex: this.config.popup.zIndex,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backgroundColor: this.config.popup.backgroundColor,
                display: 'block',
                overflow: 'hidden',
                textAlign: 'left',
                color: '#333333'
            });

            popup.innerHTML = this.createPopupContent();
            document.body.appendChild(popup);
            this.attachEventListeners();
        },

        // Create popup content
        createPopupContent() {
            const { translations } = this.config;
            let content = `
        <span style="left:0;background:#4A90E2;width:100%;margin:0;position:absolute;padding:12px;font-family:Arial;font-size:16px;font-weight:bold;color:white;">Write A Note!</span>
        <span id="writeanote-close" style="right:12px;position:absolute;cursor:pointer;top:12px;font-family:Arial;color:white;">${translations.close}</span>
        <div style="margin-top:50px;padding:20px;">
          <textarea id="writeanotetextarea" placeholder="${translations.title}" rows="10" style="width:95%;padding:10px;font-family:system-ui;font-size:14px;color:#333;border:1px solid #E0E0E0;border-radius:4px;resize:vertical;">${this.getSavedNote()}</textarea>
          <br><br>
          <button id="writeanote-delete" style="background:#FF4D4F;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-family:system-ui;">${translations.delete}</button>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid #E0E0E0;">
            <label style="display:flex;align-items:center;gap:8px;font-family:system-ui;color:#666;">
              <input type="checkbox" ${this.state.littleNote ? 'checked' : ''} onchange="WriteANote.toggleLittleNote()">
              ${translations.littleNoteLabel}
            </label>
      `;

            const notes = this.getAllNotes();
            if (notes.length > 0) {
                content += `
          <div style="margin-top:20px;">
            <h3 style="color:#4A90E2;font-family:system-ui;font-size:14px;margin:0 0 10px 0;">Pages with Notes:</h3>
            <div style="max-height:100px;overflow-y:auto;font-family:system-ui;font-size:12px;">
              ${notes.map(note => `
                <div style="margin:5px 0;padding:5px;background:#f5f5f5;border-radius:4px;">
                  <a href="${note.url}" style="color:#666;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${note.url}</a>
                </div>
              `).join('')}
            </div>
          </div>
        `;
            }

            content += '</div></div>';
            return content;
        },

        // Attach event listeners to popup elements
        attachEventListeners() {
            const closeButton = document.getElementById('writeanote-close');
            const deleteButton = document.getElementById('writeanote-delete');

            if (closeButton) {
                closeButton.addEventListener('click', () => this.closePopup());
            }
            if (deleteButton) {
                deleteButton.addEventListener('click', () => this.deleteNote());
            }
        },

        // Close popup and save note
        closePopup() {
            const popup = document.querySelector('writeanotepopup');
            if (popup) {
                const textarea = document.getElementById('writeanotetextarea');
                GM_setValue(`${this.state.pageURL}_notf`, textarea.value);
                popup.remove();
            }
        },

        // Delete note
        deleteNote() {
            GM_setValue(`${this.state.pageURL}_notf`, '');
            document.getElementById('writeanotetextarea').value = '';
            alert(this.config.translations.deleted);
        },

        // Toggle little note state
        toggleLittleNote() {
            this.state.littleNote = !this.state.littleNote;
            GM_setValue('littleNote', this.state.littleNote.toString());
            this.checkForLittleNote();
        },

        // Check and create little note
        checkForLittleNote() {
            const existingNote = document.getElementById('writeanotelittle');
            if (existingNote) {
                existingNote.remove();
            }

            if (this.state.littleNote) {
                const littleNote = document.createElement('writeanotelittle');
                littleNote.id = 'writeanotelittle';
                littleNote.textContent = this.getSavedNote();
                littleNote.addEventListener('click', () => this.openPopup());
                document.body.appendChild(littleNote);
            }
        }
    };

    // Expose to global scope and initialize
    WriteANote.state.window.WriteANote = WriteANote;
    WriteANote.init();
})();