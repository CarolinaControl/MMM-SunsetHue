Module.register("MMM-SunsetHue", {
    // Default module config.
    defaults: {
        apiKey: "",
        latitude: null,
        longitude: null,
        updateInterval: 4 * 60 * 60 * 1000, // Fetch every 4 hours (saves credits)
        days: 1, // Number of days to display (1 to 3 supported by API)
        showCloudCover: true,
        showQualityPercent: true,
        showMagicHours: true,
        onlyShowUpcoming: false,
        animationSpeed: 1000, // 1 second fade
        initialLoadDelay: 0
    },

    // Define required scripts.
    getStyles: function() {
        return [
            "MMM-SunsetHue.css",
            // Load Material Design Icons (MDI) stylesheet for premium iconography
            "https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css"
        ];
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.forecastData = null;
        this.error = null;
        this.loaded = false;

        // Schedule first update
        this.scheduleUpdate(this.config.initialLoadDelay);
    },

    // Override DOM generator.
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-sunsethue-wrapper";

        // Validate configuration settings
        if (!this.config.apiKey) {
            wrapper.innerHTML = "Please set the sunsethue.com <i>apiKey</i> in your config file.";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (this.config.latitude === null || this.config.longitude === null) {
            wrapper.innerHTML = "Please set <i>latitude</i> and <i>longitude</i> in your config file.";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING") || "Loading forecast...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (this.error) {
            wrapper.innerHTML = `Error: ${this.error}`;
            wrapper.className = "normal small error-text";
            return wrapper;
        }

        // Parse API response
        let forecastList = [];
        if (this.forecastData) {
            if (Array.isArray(this.forecastData)) {
                forecastList = this.forecastData;
            } else if (this.forecastData.forecast && Array.isArray(this.forecastData.forecast)) {
                forecastList = this.forecastData.forecast;
            } else if (this.forecastData.data && Array.isArray(this.forecastData.data)) {
                forecastList = this.forecastData.data;
            } else if (this.forecastData.data && typeof this.forecastData.data === "object") {
                forecastList = [this.forecastData.data];
            }
        }

        if (forecastList.length === 0) {
            wrapper.innerHTML = "No forecast data available.";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Filter for upcoming events if configured
        if (this.config.onlyShowUpcoming) {
            const now = new Date();
            forecastList = forecastList.filter(event => new Date(event.time) > now);
        }

        // Group events by day to construct a clean calendar view
        const groupedEvents = {};
        forecastList.forEach(event => {
            const eventDate = new Date(event.time);
            const dateKey = eventDate.toDateString();
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        });

        const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a) - new Date(b));
        // Restrict list to matching user preference
        const displayDates = sortedDates.slice(0, this.config.days);

        if (displayDates.length === 0) {
            wrapper.innerHTML = "No upcoming events forecast.";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        const container = document.createElement("div");
        container.className = "sunsethue-container";

        displayDates.forEach(dateKey => {
            const dayWrapper = document.createElement("div");
            dayWrapper.className = "sunsethue-day-section";

            // Add Day Header Label (Today, Tomorrow, Saturday, etc.)
            const dayHeader = document.createElement("div");
            dayHeader.className = "sunsethue-day-header small dimmed bold";
            dayHeader.innerText = this.getDayLabel(dateKey);
            dayWrapper.appendChild(dayHeader);

            const events = groupedEvents[dateKey];
            // Sort chronologically within the day
            events.sort((a, b) => new Date(a.time) - new Date(b.time));

            events.forEach(event => {
                const eventCard = this.createEventCard(event);
                dayWrapper.appendChild(eventCard);
            });

            container.appendChild(dayWrapper);
        });

        wrapper.appendChild(container);
        return wrapper;
    },

    // Create a card block representing a single event
    createEventCard: function(event) {
        const card = document.createElement("div");
        const eventType = event.type || "sunset";
        card.className = `sunsethue-card type-${eventType}`;

        // Top Row: Type Title and Event Local Time
        const topRow = document.createElement("div");
        topRow.className = "sunsethue-row top-row";

        const typeContainer = document.createElement("div");
        typeContainer.className = "sunsethue-type bright bold";
        const iconClass = eventType === "sunrise" ? "mdi-weather-sunset-up" : "mdi-weather-sunset-down";
        typeContainer.innerHTML = `<span class="mdi ${iconClass} icon-main"></span> ${eventType.toUpperCase()}`;

        const timeContainer = document.createElement("div");
        timeContainer.className = "sunsethue-time bright bold";
        timeContainer.innerText = this.formatTime(event.time);

        topRow.appendChild(typeContainer);
        topRow.appendChild(timeContainer);
        card.appendChild(topRow);

        // Middle Row: Forecast Quality & Cloud Cover percentage metrics
        if (this.config.showQualityPercent || this.config.showCloudCover) {
            const middleRow = document.createElement("div");
            middleRow.className = "sunsethue-row middle-row small dimmed";

            if (this.config.showQualityPercent && event.quality !== undefined) {
                const qualityDiv = document.createElement("div");
                qualityDiv.className = "sunsethue-quality";
                const pct = Math.round(event.quality * 100);
                const qualityText = event.quality_text ? ` (${event.quality_text})` : "";
                
                // Categorize colors
                let qualityClass = "quality-low";
                if (event.quality >= 0.7) {
                    qualityClass = "quality-high";
                } else if (event.quality >= 0.4) {
                    qualityClass = "quality-medium";
                }

                qualityDiv.innerHTML = `<span class="mdi mdi-palette-outline icon-sub ${qualityClass}"></span> Quality: <span class="bright bold ${qualityClass}">${pct}%${qualityText}</span>`;
                middleRow.appendChild(qualityDiv);
            }

            if (this.config.showCloudCover && event.cloud_cover !== undefined) {
                const cloudDiv = document.createElement("div");
                cloudDiv.className = "sunsethue-cloud";
                const cloudPct = Math.round(event.cloud_cover * 100);
                cloudDiv.innerHTML = `<span class="mdi mdi-weather-cloudy icon-sub"></span> Clouds: <span class="bright bold">${cloudPct}%</span>`;
                middleRow.appendChild(cloudDiv);
            }

            card.appendChild(middleRow);
        }

        // Bottom Row: Golden & Blue Hour intervals
        if (this.config.showMagicHours && event.magics) {
            const magics = event.magics;
            const magicRow = document.createElement("div");
            magicRow.className = "sunsethue-row magic-row xsmall dimmed";

            let goldenText = "";
            let blueText = "";

            if (magics.golden_hour && magics.golden_hour.length === 2) {
                const start = this.formatTime(magics.golden_hour[0]);
                const end = this.formatTime(magics.golden_hour[1]);
                goldenText = `<span class="sunsethue-magic-item"><span class="mdi mdi-brightness-5 icon-magic golden"></span> Golden: ${start} - ${end}</span>`;
            }

            if (magics.blue_hour && magics.blue_hour.length === 2) {
                const start = this.formatTime(magics.blue_hour[0]);
                const end = this.formatTime(magics.blue_hour[1]);
                blueText = `<span class="sunsethue-magic-item"><span class="mdi mdi-brightness-3 icon-magic blue"></span> Blue: ${start} - ${end}</span>`;
            }

            if (goldenText || blueText) {
                magicRow.innerHTML = `${goldenText} ${blueText}`;
                card.appendChild(magicRow);
            }
        }

        return card;
    },

    // Convert date string to "Today", "Tomorrow" or full Day Name
    getDayLabel: function(dateString) {
        const eventDate = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (eventDate.toDateString() === today.toDateString()) {
            return "Today";
        } else if (eventDate.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow";
        } else {
            // Respect browser locale or fall back to default
            const lang = (typeof config !== "undefined" && config.language) || "en";
            return eventDate.toLocaleDateString(lang, { weekday: "long" });
        }
    },

    // Format ISO string to time output respecting MagicMirror configuration format (12/24 hour clock)
    formatTime: function(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        const use12Hour = (typeof config !== "undefined" && config.timeFormat === 12);
        
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: use12Hour
        });
    },

    // Fetch call helper
    getData: function() {
        this.sendSocketNotification("GET_SUNSETHUE_DATA", this.config);
    },

    // Standard recursive scheduling logic
    scheduleUpdate: function(delay) {
        const nextLoad = delay !== undefined && delay >= 0 ? delay : this.config.updateInterval;

        setTimeout(() => {
            this.getData();
            // Automatically queue next interval updates
            this.scheduleUpdate();
        }, nextLoad);
    },

    // Receive data notifications from node_helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "SUNSETHUE_DATA_RESULT") {
            this.forecastData = payload;
            this.error = null;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "SUNSETHUE_ERROR") {
            this.error = payload;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});
