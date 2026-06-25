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
        showDayHeaders: true,
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

            // Add Day Header Label if configured (always show for multi-day, hide "Today" for single-day)
            const dayLabel = this.getDayLabel(dateKey);
            if (this.config.showDayHeaders && (this.config.days > 1 || dayLabel !== "Today")) {
                const dayHeader = document.createElement("div");
                dayHeader.className = "sunsethue-day-header small dimmed bold";
                dayHeader.innerText = dayLabel;
                dayWrapper.appendChild(dayHeader);
            }

            // Container for event cards to layout side-by-side
            const cardsContainer = document.createElement("div");
            cardsContainer.className = "sunsethue-cards-container";

            const events = groupedEvents[dateKey];
            // Sort chronologically within the day
            events.sort((a, b) => new Date(a.time) - new Date(b.time));

            events.forEach(event => {
                const eventCard = this.createEventCard(event);
                cardsContainer.appendChild(eventCard);
            });

            dayWrapper.appendChild(cardsContainer);
            container.appendChild(dayWrapper);
        });

        wrapper.appendChild(container);
        return wrapper;
    },

    // Create a card block representing a single event (compact layout)
    createEventCard: function(event) {
        const card = document.createElement("div");
        const eventType = event.type || "sunset";
        card.className = `sunsethue-card type-${eventType}`;

        // Header Section: Icon + Time & Type Stacked
        const header = document.createElement("div");
        header.className = "sunsethue-header";

        const iconClass = eventType === "sunrise" ? "mdi-weather-sunset-up" : "mdi-weather-sunset-down";
        
        const mainIcon = document.createElement("span");
        mainIcon.className = `mdi ${iconClass} icon-main`;
        header.appendChild(mainIcon);

        const metaContainer = document.createElement("div");
        metaContainer.className = "sunsethue-meta-container";

        const timeSpan = document.createElement("div");
        timeSpan.className = "sunsethue-time bold bright";
        timeSpan.innerText = this.formatTime(event.time);
        metaContainer.appendChild(timeSpan);

        const typeSpan = document.createElement("div");
        typeSpan.className = "sunsethue-type-label xsmall dimmed bold";
        typeSpan.innerText = eventType.toUpperCase();
        metaContainer.appendChild(typeSpan);

        header.appendChild(metaContainer);
        card.appendChild(header);

        // Metrics Section: Quality and Cloud Cover percentages (compact inline indicators)
        if (this.config.showQualityPercent || this.config.showCloudCover) {
            const metrics = document.createElement("div");
            metrics.className = "sunsethue-metrics small dimmed";

            if (this.config.showQualityPercent && event.quality !== undefined) {
                const qualitySpan = document.createElement("div");
                qualitySpan.className = "sunsethue-metric-item";
                const pct = Math.round(event.quality * 100);
                
                let qualityClass = "quality-low";
                if (event.quality >= 0.7) {
                    qualityClass = "quality-high";
                } else if (event.quality >= 0.4) {
                    qualityClass = "quality-medium";
                }

                qualitySpan.innerHTML = `<span class="mdi mdi-palette-outline icon-sub ${qualityClass}"></span> <span class="bright bold">${pct}%</span>`;
                metrics.appendChild(qualitySpan);
            }

            if (this.config.showCloudCover && event.cloud_cover !== undefined) {
                const cloudSpan = document.createElement("div");
                cloudSpan.className = "sunsethue-metric-item";
                const cloudPct = Math.round(event.cloud_cover * 100);
                cloudSpan.innerHTML = `<span class="mdi mdi-weather-cloudy icon-sub"></span> <span class="bright bold">${cloudPct}%</span>`;
                metrics.appendChild(cloudSpan);
            }

            card.appendChild(metrics);
        }

        // Footer Section: Golden & Blue Hour intervals (Stacked for narrow column styling)
        if (this.config.showMagicHours && event.magics) {
            const magics = event.magics;
            const magicHours = document.createElement("div");
            magicHours.className = "sunsethue-magic-hours xsmall dimmed";

            if (magics.golden_hour && magics.golden_hour.length === 2) {
                const start = this.formatTime(magics.golden_hour[0]);
                const end = this.formatTime(magics.golden_hour[1]);
                const goldenDiv = document.createElement("div");
                goldenDiv.className = "sunsethue-magic-row";
                goldenDiv.innerHTML = `<span class="mdi mdi-brightness-5 icon-magic golden"></span> ${start} - ${end}`;
                magicHours.appendChild(goldenDiv);
            }

            if (magics.blue_hour && magics.blue_hour.length === 2) {
                const start = this.formatTime(magics.blue_hour[0]);
                const end = this.formatTime(magics.blue_hour[1]);
                const blueDiv = document.createElement("div");
                blueDiv.className = "sunsethue-magic-row";
                blueDiv.innerHTML = `<span class="mdi mdi-brightness-3 icon-magic blue"></span> ${start} - ${end}`;
                magicHours.appendChild(blueDiv);
            }

            if (magicHours.children.length > 0) {
                card.appendChild(magicHours);
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
