const eventTypes = {
    "Radar Indicated Tornado Warning": "tornado-warning",
    "Observed Tornado Warning": "observed-tornado-warning",
    "PDS Tornado Warning": "pds-tornado-warning",
    "Tornado Emergency": "tornado-emergency",
    "Severe Thunderstorm Warning": "severe-thunderstorm-warning", // Regular
    "Considerable Severe Thunderstorm Warning": "severe-thunderstorm-considerable", // Considerable
    "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning", // PDS (Destructive)
    "Flash Flood Warning": "flash-flood-warning",
    "Tornado Watch": "tornado-watch",
    "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
    "Winter Weather Advisory": "winter-weather-advisory",
    "Winter Storm Watch": "winter-storm-watch",
    "Winter Storm Warning": "winter-storm-warning",
    "Special Weather Statement": "special-weather-statement",
    "Ice Storm Warning": "ice-storm-warning"
};

//Last Updateed March 6 01:11 PM
const priority = {
    "Tornado Emergency": 1,
    "PDS Tornado Warning": 2,
    "Observed Tornado Warning": 3,
    "Radar Indicated Tornado Warning": 4,
    "Destructive Severe Thunderstorm Warning": 5, // PDS
    "Considerable Severe Thunderstorm Warning": 6, // Considerable
    "Severe Thunderstorm Warning": 7, // Regular
    "Special Weather Statement": 8,
    "Tornado Watch": 9,
    "Severe Thunderstorm Watch": 10,
    "Flash Flood Warning": 11,
    "Ice Storm Warning": 12,
    "Winter Storm Warning": 13,
    "Winter Weather Advisory": 14,
    "Winter Storm Watch": 15,
};

const warningListElement = document.getElementById('warningList');
const expirationElement = document.getElementById('expiration');
const eventTypeElement = document.getElementById('eventType');
const countiesElement = document.getElementById('counties');

const tornadoCountElement = document.getElementById('tornadoCount');
const thunderstormCountElement = document.getElementById('thunderstormCount');
const floodCountElement = document.getElementById('floodCount');
const winterWeatherCountElement = document.getElementById('winterWeatherCount'); // New element for winter weather counts

let previousWarningIds = new Set(); // Initialize as a Set to store previous warning IDs

const labels = {
    tornado: "TORNADO WARNINGS",
    thunderstorm: "SEVERE THUNDERSTORM WARNINGS",
    flood: "FLASH FLOOD WARNINGS",
    winter: "WINTER WEATHER WARNINGS"
};

let currentWarningIndex = 0;
let activeWarnings = [];
let previousWarnings = new Map();

document.body.addEventListener('click', enableSound);

function enableSound() {
    document.body.removeEventListener('click', enableSound);
    tornadoSound.play().catch(() => {});
}

// Create a header for the warning list
const headerElement = document.createElement('div');
headerElement.textContent = "Latest Alerts (James Pettus is a pussy):"; // Add colon at the end
headerElement.className = 'warning-list-header'; // Add a class for styling if needed

// Prepend the header to the warning list
warningListElement.prepend(headerElement);

const saveButton = document.getElementById('saveButton');
const checkboxContainer = document.querySelector('.checkbox-container');

let selectedAlerts = new Set(); // To store selected alerts

// Event listener for the save button
saveButton.addEventListener('click', () => {
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    selectedAlerts.clear(); // Clear previous selections
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedAlerts.add(checkbox.value); // Add selected alerts to the Set
        }
    });
    updateWarningList(activeWarnings); // Update the warning list based on selected alerts
});

// Fetch data from NWS API for active alerts
async function fetchWarnings() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active');
        const data = await response.json();
        const warnings = data.features.filter(feature =>
            selectedAlerts.has(feature.properties.event) // Use selected alerts for filtering
        );

        let tornadoCount = 0;
        let thunderstormCount = 0;
        let floodCount = 0;
        let winterWeatherCount = 0; // Counter for winter weather events

        warnings.forEach(warning => {
            const eventName = warning.properties.event;
            if (eventName === "Tornado Warning") {
                const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; // Get the first item in the array
                const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; // Get the first item in the array
                if (detectionType === "OBSERVED") {
                    if (damageThreat === "CONSIDERABLE") {
                        tornadoCount++; // Count as PDS Tornado Warning
                    } else if (damageThreat === "CATASTROPHIC") {
                        tornadoCount++; // Count as Tornado Emergency
                    } else {
                        tornadoCount++; // Count as Radar Indicated Tornado Warning
                    }
                } else {
                    tornadoCount++; // Count as Radar Indicated Tornado Warning
                }
            } else if (eventName === "Severe Thunderstorm Warning") {
                const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; // Get the first item in the array
                if (damageThreat === "CONSIDERABLE") {
                    thunderstormCount++; // Count as Considerable Severe Thunderstorm Warning
                } else if (damageThreat === "DESTRUCTIVE") {
                    thunderstormCount++; // Count as Destructive Severe Thunderstorm Warning (PDS)
                } else {
                    thunderstormCount++; // Count as regular Severe Thunderstorm Warning
                }
            } else if (eventName === "Flash Flood Warning") {
                floodCount++;
            } else if (eventName === "Winter Weather Advisory") {
                winterWeatherCount++; // Count winter weather advisories
            } else if (eventName === "Winter Storm Warning") {
                winterWeatherCount++; // Count winter storm warnings
            } else if (eventName === "Winter Storm Watch") {
                winterWeatherCount++; // Count winter storm watches
            }
            else if (eventName === "Ice Storm Warning") {
                winterWeatherCount++; // Count winter storm watches
            }
            else if (eventName === "Special Weather Statement") {
                thunderstormCount++;
            }
        });

        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`; // Update winter weather count

        // Sort warnings by issuance time (newest first)
        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));
        
        activeWarnings = warnings;

        updateWarningList(warnings);

        warnings.forEach(warning => {
            const warningId = warning.id;
            const eventName = getEventName(warning);

            // Check if the warning is new
            if (!previousWarningIds.has(warningId)) {
                previousWarningIds.add(warningId); // Add new warning ID to the Set
                showNotification(warning); // Notify for new warning
            } else {
                // Check for updates to existing warnings
                const previousEvent = previousWarnings.get(warningId);
                if (previousEvent && previousEvent !== eventName) {
                    showNotification(warning); // Notify for updated warning
                }
            }

            // Update the previous warnings map
            previousWarnings.set(warningId, eventName);
        });

    } catch (error) {
        console.error('Error fetching warnings:', error);
    }
}


function testNotification(eventName) {
    const warning = {
        properties: {
            event: eventName,
            areaDesc: "Washtenaw, MI" // Sample county for testing
        }
    };
    showNotification(warning);
    
    // Play sound based on the event type
    switch (eventName) {
        case "Radar Indicated Tornado Warning":
        case "Observed Tornado Warning":
        case "PDS Tornado Warning":
        case "Tornado Emergency":
        case "Severe Thunderstorm Warning":
        case "Flash Flood Warning":
            playSound('warning.wav');
            break;
        case "Tornado Watch":
        case "Severe Thunderstorm Watch":
        case "Winter Storm Watch":
            playSound('watch.wav');
            break;
        case "Winter Weather Advisory":
        case "Special Weather Statement":    
            playSound('advisory.wav');
            break;
        default:
            break;
    }
}


function testMostRecentAlert() {
    if (activeWarnings.length > 0) {
        const mostRecentWarning = activeWarnings[0]; // Assuming activeWarnings is sorted with the most recent first
        showNotification(mostRecentWarning);
    } else {
        alert("No active warnings to test.");
    }
}

// Helper function to determine the displayed event name
function getEventName(warning) {
    const eventName = warning.properties.event;
    if (eventName === "Tornado Warning") {
        const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; // Get the first item in the array
        const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; // Get the first item in the array
        if (detectionType === "OBSERVED") {
            if (damageThreat === "CONSIDERABLE") {
                return "PDS Tornado Warning"; // PDS
            } else if (damageThreat === "CATASTROPHIC") {
                return "Tornado Emergency"; // Tornado Emergency
            } else {
                return "Observed Tornado Warning"; // Confirmed but not PDS
            }
        } else {
            return "Radar Indicated Tornado Warning"; // Correct format
        }
    } else if (eventName === "Severe Thunderstorm Warning") {
        const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; // Get the first item in the array
        if (damageThreat === "CONSIDERABLE") {
            return "Considerable Severe Thunderstorm Warning"; // Considerable
        } else if (damageThreat === "DESTRUCTIVE") {
            return "Destructive Severe Thunderstorm Warning"; // Destructive
        }
    } else if (eventName === "Winter Weather Advisory") {
        return "Winter Weather Advisory"; // Winter Weather Advisory
    } else if (eventName === "Winter Storm Warning") {
        return "Winter Storm Warning"; // Winter Storm Warning
    } else if (eventName === "Winter Storm Watch") {
        return "Winter Storm Watch"; // Winter Storm Watch
    }
    else if (eventName === "Ice Storm Warning") {
        return "Ice Storm Warning"; // Winter Storm Watch
    }
    return eventName; // Return as is for other events
}

let currentCountyIndex = 0;

function updateDashboard() {
    if (activeWarnings.length === 0) {
        expirationElement.textContent = '';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = '';
        document.querySelector('.bottom-bar').style.backgroundColor = '#333'; // Default color
        return;
    }

    const warning = activeWarnings[currentWarningIndex];
    let eventName = getEventName(warning); // Use the helper function

    // Set the background color based on the alert type
    let alertColor;
    switch (eventName) {
        case "Radar Indicated Tornado Warning":
            alertColor = 'rgb(255, 0, 0)'; // Red
            break;
        case "Observed Tornado Warning":
            alertColor = 'rgb(139, 0, 0)'; // Dark Red
            break;
        case "PDS Tornado Warning":
            alertColor = 'rgb(128, 0, 128)'; // Purple
            break;
        case "Tornado Emergency":
            alertColor = 'rgb(255, 0, 255)'; // Magenta
            break;
        case "Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 166, 0)'; // Orange
            break;
        case "Flash Flood Warning":
            alertColor = 'rgb(0, 100, 0)'; // Dark Green
            break;
        case "Tornado Watch":
            alertColor = 'rgb(255, 238, 0)'; // Light Pink
            break;
        case "Severe Thunderstorm Watch":
            alertColor = 'rgb(255, 105, 180)'; // Gold
            break;
        case "Winter Weather Advisory":
            alertColor = 'rgb(169, 81, 220)'; // Light Purple
            break;
        case "Winter Storm Watch":
            alertColor = 'rgb(0, 0, 255)'; // Blue
            break;
        case "Winter Storm Warning":
            alertColor = 'rgb(255, 88, 233)'; // Pink
            break;
        case "Ice Storm Warning":
            alertColor = 'rgb(127, 33, 114)'; // Dark Pink
            break;    
        case "Special Weather Statement":
            alertColor = 'rgb(61, 200, 255)';
            break;
        default:
            alertColor = '#333'; // Default color
            break;
    }

    // Update the background color of the bottom bar with fading effect
    document.querySelector('.bottom-bar').style.backgroundColor = alertColor;

    // Continue with the rest of the function...
    const expirationDate = new Date(warning.properties.expires);
    const options = { 
        timeZoneName: 'short',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const formattedExpirationTime = expirationDate.toLocaleString('en-US', options);
    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    expirationElement.textContent = `Expires: ${formattedExpirationTime}`;
    eventTypeElement.textContent = eventName; // Correct format
    countiesElement.textContent = counties;
    currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
}






    


function formatCountiesTopBar(areaDesc) {
    const counties = areaDesc.split('; ');
    let formattedCounties = counties.slice(0, 4).map(county => {
        const parts = county.split(',');
        if (parts.length > 1) {
            return `${parts[0].trim()} County, ${parts[1].trim()}`; // Format: "County name County, State"
        }
        return county; // Fallback if the format is unexpected
    });
    if (counties.length > 4) {
        formattedCounties.push("...");
    }
    return formattedCounties.join('; ');
}

function updateWarningList(warnings) {
    const latestWarnings = warnings.slice(0, 5);
    const existingWarningElements = warningListElement.getElementsByClassName('warning-box');
    const existingWarningsMap = new Map();

    for (let element of existingWarningElements) {
        const warningId = element.getAttribute('data-warning-id');
        existingWarningsMap.set(warningId, element);
    }

    latestWarnings.forEach(warning => {
        const warningId = warning.id;
        const eventName = getEventName(warning); // Use the helper function
        const counties = formatCountiesTopBar(warning.properties.areaDesc);
        const displayText = `${eventName} - ${counties}`; // Update to the new format

        if (previousWarnings.has(warningId)) {
            const previousEvent = previousWarnings.get(warningId);
            if (previousEvent !== eventName) {
                upgradeSound.play().catch(error => console.error('Error playing upgrade sound:', error));
            }
        }

        if (existingWarningsMap.has(warningId)) {
            const warningElement = existingWarningsMap.get(warningId);
            warningElement.textContent = displayText;
            warningElement.className = `warning-box ${eventTypes[eventName]}`; // Ensure the correct class is set for styling

            // Manually set the background color based on event type
            if (eventName === "Winter Storm Warning") {
                warningElement.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningElement.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningElement.style.backgroundColor = "rgb(169, 81, 220)";
            }

        } else {
            const warningBox = document.createElement('div');
            warningBox.className = `warning-box ${eventTypes[eventName]}`; // Set the class based on event type
            warningBox.setAttribute('data-warning-id', warningId);
            warningBox.textContent = displayText;

            // Manually set the background color based on event type
            if (eventName === "Winter Storm Warning") {
                warningBox.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningBox.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningBox.style.backgroundColor = "rgb(169, 81, 220)";
            }

            // Flash the box for 5 seconds
            warningBox.style.animation = 'flash 0.5s alternate infinite'; // Add flash effect

            warningListElement.appendChild(warningBox);

            // Stop flashing after 5 seconds
            setTimeout(() => {
                warningBox.style.animation = ''; // Remove flash effect
            }, 5000);
        }

        previousWarnings.set(warningId, eventName);
    });

    for (let [warningId, element] of existingWarningsMap) {
        if (!latestWarnings.find(warning => warning.id === warningId)) {
            warningListElement.removeChild(element);
            previousWarnings.delete(warningId);
        }
    }
}

function playSound(soundFile) {
    const audio = new Audio(`Sounds/${soundFile}`); // Adjust the path to your audio files
    audio.play().catch(error => console.error('Error playing sound:', error));
}









function showNotification(warning) {
    const eventName = getEventName(warning);
    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    const callToAction = "Stay Safe!"; // Customize your call to action here

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification-popup'; // Base class for styling

    // Set background color based on event type
    let alertColor;
    switch (eventName) {
        case "Radar Indicated Tornado Warning":
            alertColor = 'rgba(255, 0, 0, 0.9)'; // Red
            playSound('warning.wav'); // Play warning sound
            break;
        case "Observed Tornado Warning":
            alertColor = 'rgba(139, 0, 0, 0.9)'; // Dark Red
            playSound('warning.wav'); // Play warning sound
            break;
        case "PDS Tornado Warning":
            alertColor = 'rgba(128, 0, 128, 0.9)'; // Purple
            playSound('warning.wav'); // Play warning sound
            break;
        case "Tornado Emergency":
            alertColor = 'rgba(255, 0, 255, 0.9)'; // Magenta
            playSound('warning.wav'); // Play warning sound
            break;
        case "Severe Thunderstorm Warning":
            alertColor = 'rgba(255, 165, 0, 0.9)'; // Orange
            playSound('warning.wav'); // Play warning sound
            break;
        case "Considerable Severe Thunderstorm Warning":
            alertColor = 'rgba(255, 140, 0, 0.9)';
            playSound('warning.wav');
            break;
        case "Destructive Severe Thunderstorm Warning":
            alertColor = 'rgba(255, 100, 0, 0.9)';
            playSound('warning.wav');
            break;
        case "Flash Flood Warning":
            alertColor = 'rgba(0, 100, 0, 0.9)'; // Dark Green
            playSound('warning.wav'); // Play warning sound
            break;
        case "Tornado Watch":
            alertColor = 'rgba(255, 105, 180, 0.9)'; // Light Pink
            playSound('watch.wav'); // Play watch sound
            break;
        case "Severe Thunderstorm Watch":
            alertColor = 'rgba(255, 215, 0, 0.9)'; // Gold
            playSound('watch.wav'); // Play watch sound
            break;
        case "Winter Weather Advisory":
            alertColor = 'rgba(169, 81, 220, 0.9)'; // Light Purple
            playSound('advisory.wav'); // Play advisory sound
            break;
        case "Winter Storm Watch":
            alertColor = 'rgba(0, 0, 255, 0.9)'; // Blue
            playSound('watch.wav'); // Play watch sound
            break;
        case "Winter Storm Warning":
            alertColor = 'rgba(255, 88, 233, 0.9)'; // Pink
            playSound('warning.wav'); // Play warning sound
            break;
        case "Ice Storm Warning":
            alertColor = 'rgba(145, 29, 129, 0.9)'; // Pink
            playSound('warning.wav'); // Play warning sound
            break;
        case "Special Weather Statement":
            alertColor = 'rgba(135, 223, 255, 0.9)';
            playSound('advisory.wav');
            break;
        default:
            alertColor = 'rgba(255, 255, 255, 0.9)'; // Default color
            break;
    }

    // Set the notification background color
    notification.style.backgroundColor = alertColor;

    // Create sections for title, counties, and call to action
    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = eventName;

    const countiesSection = document.createElement('div');
    countiesSection.className = 'notification-message';
    countiesSection.textContent = counties;

    const actionSection = document.createElement('div');
    actionSection.className = 'notification-message';
    actionSection.textContent = callToAction;

    // Append sections to notification
    notification.appendChild(title);
    notification.appendChild(countiesSection);
    notification.appendChild(actionSection);

    // Append notification to body
    document.body.appendChild(notification);

    // Fade in effect
    notification.style.opacity = 1;

    // Remove notification after a certain time with slide-out effect
    setTimeout(() => {
        notification.classList.add('slide-out'); // Add slide-out class
        setTimeout(() => {
            notification.remove(); // Remove after slide-out animation
        }, 500); // Match this duration with the slide-out animation duration
    }, 5000); // Adjust duration as needed
}

document.addEventListener('DOMContentLoaded', () => {
    fetchWarnings();
    updateDashboard();
});


// Fetch data and update every 3 seconds for immediate alert detection
setInterval(fetchWarnings, 3000);

// Update event display every 5 seconds
setInterval(updateDashboard, 5000);

fetchWarnings();
updateDashboard();
