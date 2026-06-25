# MMM-SunsetHue

A  MagicMirror² module that fetches sunrise and sunset quality forecasts from the [Sunsethue](https://sunsethue.com) API. It displays sunrise/sunset times, cloud cover, quality percentages, and magic hour (golden and blue hour) windows with modern, responsive styling and Material Design Icons (MDI).

## Features

- **Sun Events:** Displays sunrise and sunset times.
- **Beauty Forecast:** Shows the predicted quality percentage (with rating text) of the sun event.
- **Cloud Cover:** Displays the forecasted cloud cover percentage.
- **Magic Hours:** Lists Golden Hour and Blue Hour windows for photographers and skywatchers.
- **Translucent UI:** Sleek glassmorphic card design with subtle color highlights (amber for sunrise, pink for sunset).
- **MDI Icons:** Seamless rendering of weather-specific icons loaded from the CDN.

## Installation

1. Navigate to your MagicMirror² `modules` directory:
   ```bash
   cd ~/MagicMirror/modules
   ```
2. Clone this repository as `MMM-SunsetHue`:
   ```bash
   git clone https://github.com/CarolinaControl/MMM-SunsetHue.git
   ```
3. Since this module uses native Node `fetch` (available in Node 18+), no external dependencies are required. However, you can register the module package:
   ```bash
   cd MMM-SunsetHue
   npm install
   ```

## Configuration

To use this module, obtain a free API key from the [Sunsethue Developer Portal](https://sunsethue.com/dev-api/portal).

Add the module to your `config/config.js` file:

```javascript
{
    module: "MMM-SunsetHue",
    position: "top_right",
    config: {
        apiKey: "YOUR_SUNSETHUE_API_KEY",
        latitude: 40.7128,  // Replace with your latitude
        longitude: -74.0060, // Replace with your longitude
        days: 1, // Display 1 day of forecast (supports 1-3)
        showCloudCover: true,
        showQualityPercent: true,
        showMagicHours: true,
        onlyShowUpcoming: false // Set to true to hide events that have already passed today
    }
}
```

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `""` | **Required.** Your API key from sunsethue.com. |
| `latitude` | `number` | `null` | **Required.** The latitude coordinates for the forecast (WGS84). |
| `longitude` | `number` | `null` | **Required.** The longitude coordinates for the forecast (WGS84). |
| `updateInterval` | `number` | `14400000` | Fetch interval in milliseconds. Default is 4 hours (14,400,000ms) to conserve API credits. |
| `days` | `number` | `1` | Number of forecast days to fetch and show (supports 1 to 3). |
| `showCloudCover` | `boolean` | `true` | Show or hide cloud cover percentage. |
| `showQualityPercent` | `boolean` | `true` | Show or hide the event quality percentage & text. |
| `showMagicHours` | `boolean` | `true` | Show or hide Golden and Blue Hour times. |
| `onlyShowUpcoming` | `boolean` | `false` | If `true`, hides events (e.g. Sunrise) once their time has passed. |
| `showDayHeaders` | `boolean` | `true` | Show or hide day section headers (always shows for multi-day, automatically hides "Today" for single-day). |
| `animationSpeed` | `number` | `1000` | Fade-in/out transition speed in milliseconds. |

## Credit Cost Details

Sunsethue's developer accounts include 1,000 free credits daily.
- A standard `/forecast` query costs credits depending on the number of days fetched and whether detailed model data is available (typically 1 credit per event, 5 credits if full `model_data` is used).
- With the default configuration updating every 4 hours (6 times a day) requesting 1 day of forecast (2 events), the module consumes less than 60 credits/day, keeping you well within the free tier.

## License

This project is licensed under the MIT License.
