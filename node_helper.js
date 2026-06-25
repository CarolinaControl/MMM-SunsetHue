const NodeHelper = require("node_helper");
const Log = require("logger");

module.exports = NodeHelper.create({
    start: function() {
        Log.info("Starting node helper for: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_SUNSETHUE_DATA") {
            this.fetchSunsetHue(payload);
        }
    },

    fetchSunsetHue: async function(config) {
        const { apiKey, latitude, longitude, days } = config;

        if (!apiKey) {
            this.sendSocketNotification("SUNSETHUE_ERROR", "Missing API key in configuration.");
            return;
        }
        if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
            this.sendSocketNotification("SUNSETHUE_ERROR", "Missing latitude/longitude in configuration.");
            return;
        }

        const url = `https://api.sunsethue.com/forecast?latitude=${latitude}&longitude=${longitude}&days=${days || 3}`;

        try {
            // Note: Modern Node.js (v18+) includes global fetch.
            // MagicMirror² versions requiring Node >= 18 can utilize it natively.
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": apiKey,
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                let errorMsg = `HTTP Error ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData && errData.message) {
                        errorMsg = errData.message;
                    } else if (errData && errData.error) {
                        errorMsg = errData.error;
                    }
                } catch (_) {}
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // SunsetHue returns status info directly in JSON sometimes
            if (data && data.status && data.status >= 400) {
                throw new Error(data.message || `API Error ${data.status}`);
            }

            this.sendSocketNotification("SUNSETHUE_DATA_RESULT", data);
        } catch (error) {
            Log.error(`[MMM-SunsetHue] Error fetching forecast: ${error.message}`);
            this.sendSocketNotification("SUNSETHUE_ERROR", error.message);
        }
    }
});
