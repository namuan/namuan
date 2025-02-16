// ==UserScript==
// @name         Quick Explain
// @namespace    http://namuan.github.io/
// @version      1.7
// @description  Quickly lookup something using local LLMs.
// @author       Namuan
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("[Copy Tooltip Script] Initializing...");

    // Create a tooltip element
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '10px 15px';
    tooltip.style.background = 'linear-gradient(135deg, #6a11cb, #2575fc)'; // Gradient background
    tooltip.style.color = '#ffffff'; // White text color for contrast
    tooltip.style.borderRadius = '8px'; // Rounded corners
    tooltip.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)'; // Subtle shadow for depth
    tooltip.style.fontSize = '14px'; // Font size
    tooltip.style.fontFamily = 'Arial, sans-serif'; // Clean font family
    tooltip.style.zIndex = '10000';
    tooltip.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    tooltip.style.opacity = '0'; // Start hidden
    tooltip.style.pointerEvents = 'none'; // Prevent interference with mouse events
    tooltip.style.transform = 'translateY(-10px)'; // Initial transform for animation
    console.log("[Copy Tooltip Script] Tooltip element created.");
    document.body.appendChild(tooltip);

    // Function to show the tooltip
    function showTooltip(text, x, y) {
        tooltip.innerText = text;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0px)'; // Animate into view
        tooltip.style.pointerEvents = 'auto'; // Allow interaction with the tooltip
    }

    // Function to hide the tooltip
    function hideTooltip() {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(-10px)'; // Animate out of view
        tooltip.style.pointerEvents = 'none'; // Disable interaction with the tooltip
    }

    // Function to stream the API response
    async function streamApiResponse(model, prompt, updateTooltip) {
        const url = "http://localhost:11434/api/generate";
        const params = {
            model: model,
            prompt: prompt,
            stream: true, // Enable streaming
        };

        console.log("[Copy Tooltip Script] Making streaming API call with params:", params);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error(`[Copy Tooltip Script] API call failed: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let partialResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            partialResponse += json.response;
                            updateTooltip(partialResponse); // Update the tooltip with the latest partial response
                        }

                        if (json.done) {
                            console.log("[Copy Tooltip Script] Streaming complete.");
                            return; // Exit the function once streaming is complete
                        }
                    } catch (error) {
                        console.error("[Copy Tooltip Script] Error parsing JSON line:", line, error);
                    }
                }
            }
        } catch (error) {
            console.error("[Copy Tooltip Script] Streaming API call error:", error);
            updateTooltip(`Error: ${error.message}`);
        }
    }

    // Add an event listener to hide the tooltip on click
    document.addEventListener('click', (event) => {
        if (tooltip.style.opacity === '1') {
            console.log("[Copy Tooltip Script] Click detected. Hiding tooltip.");
            hideTooltip();
        }
    });

    // Add an event listener for the 'copy' event
    document.addEventListener('copy', async (event) => {
        console.log("[Copy Tooltip Script] Copy event detected.");

        // Get the copied text from the clipboard
        const copiedText = window.getSelection().toString();
        if (copiedText.trim() !== '') {
            const mouseX = event.pageX || window.innerWidth / 2;
            const mouseY = event.pageY || window.innerHeight / 2;

            // Show the tooltip with a loading message
            showTooltip("Loading...", mouseX + 10, mouseY + 10);

            // Prepare the custom prompt
            const prompt = `Can you explain the following:\n${copiedText}`;
            const model = "llama3.2:latest"; // Replace with your desired model

            // Stream the API response and dynamically update the tooltip
            await streamApiResponse(model, prompt, (partialResponse) => {
                tooltip.innerText = partialResponse;
            });
        }
    });

    console.log("[Copy Tooltip Script] Script initialized successfully.");
})();