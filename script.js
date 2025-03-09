const eventTypes = {
    "Radar Indicated Tornado Warning": "tornado-warning",
    "Observed Tornado Warning": "observed-tornado-warning",
    "PDS Tornado Warning": "pds-tornado-warning",
    "Tornado Emergency": "tornado-emergency",
    "Severe Thunderstorm Warning": "severe-thunderstorm-warning", 
    "Considerable Severe Thunderstorm Warning": "severe-thunderstorm-considerable", 
    "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning", 
    "Flash Flood Warning": "flash-flood-warning",
    "Tornado Watch": "tornado-watch",
    "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
    "Winter Weather Advisory": "winter-weather-advisory",
    "Winter Storm Watch": "winter-storm-watch",
    "Winter Storm Warning": "winter-storm-warning",
    "Special Weather Statement": "special-weather-statement",
    "Ice Storm Warning": "ice-storm-warning",
    "Blizzard Warning": "blizzard-warning"
};

const priority = {
    "Tornado Emergency": 1,
    "PDS Tornado Warning": 2,
    "Observed Tornado Warning": 3,
    "Radar Indicated Tornado Warning": 4,
    "Destructive Severe Thunderstorm Warning": 5, 
    "Considerable Severe Thunderstorm Warning": 6, 
    "Severe Thunderstorm Warning": 7, 
    "Special Weather Statement": 8,
    "Tornado Watch": 9,
    "Severe Thunderstorm Watch": 10,
    "Flash Flood Warning": 11,
    "Blizzard Warning": 12,
    "Ice Storm Warning": 13,
    "Winter Storm Warning": 14,
    "Winter Storm Watch": 15,
    "Winter Weather Advisory": 16,
};

const warningListElement = document.getElementById('warningList');
const expirationElement = document.getElementById('expiration');
const eventTypeElement = document.getElementById('eventType');
const countiesElement = document.getElementById('counties');

const tornadoCountElement = document.getElementById('tornadoCount');
const thunderstormCountElement = document.getElementById('thunderstormCount');
const floodCountElement = document.getElementById('floodCount');
const winterWeatherCountElement = document.getElementById('winterWeatherCount'); 

let previousWarningIds = new Set(); 

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

const headerElement = document.createElement('div');
headerElement.textContent = "Latest Alerts (James Pettus is a pussy):"; 
headerElement.className = 'warning-list-header'; 

warningListElement.prepend(headerElement);

const saveButton = document.getElementById('saveButton');
const checkboxContainer = document.querySelector('.checkbox-container');

let selectedAlerts = new Set(); 

saveButton.addEventListener('click', () => {
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    selectedAlerts.clear(); 
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedAlerts.add(checkbox.value); 
        }
    });
    updateWarningList(activeWarnings); 
});

async function fetchWarnings() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active');
        const data = await response.json();
        const warnings = data.features.filter(feature =>
            selectedAlerts.has(feature.properties.event) 
        );

        let tornadoCount = 0;
        let thunderstormCount = 0;
        let floodCount = 0;
        let winterWeatherCount = 0; 

        warnings.forEach(warning => {
            const eventName = warning.properties.event;
            if (eventName === "Tornado Warning") {
                const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; 
                const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; 
                if (detectionType === "OBSERVED") {
                    if (damageThreat === "CONSIDERABLE") {
                        tornadoCount++; 
                    } else if (damageThreat === "CATASTROPHIC") {
                        tornadoCount++; 
                    } else {
                        tornadoCount++; 
                    }
                } else {
                    tornadoCount++; 
                }
            } else if (eventName === "Severe Thunderstorm Warning") {
                const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; 
                if (damageThreat === "CONSIDERABLE") {
                    thunderstormCount++; 
                } else if (damageThreat === "DESTRUCTIVE") {
                    thunderstormCount++; 
                } else {
                    thunderstormCount++; 
                }
            } else if (eventName === "Flash Flood Warning") {
                floodCount++;
            } else if (eventName === "Winter Weather Advisory") {
                winterWeatherCount++; 
            } else if (eventName === "Winter Storm Warning") {
                winterWeatherCount++; 
            } else if (eventName === "Winter Storm Watch") {
                winterWeatherCount++; 
            }
            else if (eventName === "Blizzard Warning") {
                winterWeatherCount++; 
            }
            else if (eventName === "Ice Storm Warning") {
                winterWeatherCount++; 
            }
            else if (eventName === "Special Weather Statement") {
                
            }
        });

        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`; 

        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));

        activeWarnings = warnings;

        updateWarningList(warnings);

        warnings.forEach(warning => {
            const warningId = warning.id;
            const eventName = getEventName(warning);

            if (!previousWarningIds.has(warningId)) {
                previousWarningIds.add(warningId); 
                showNotification(warning); 
            } else {

                const previousEvent = previousWarnings.get(warningId);
                if (previousEvent && previousEvent !== eventName) {
                    showNotification(warning); 
                }
            }

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
            areaDesc: "Washtenaw, MI" 
        }
    };
    showNotification(warning);

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
        const mostRecentWarning = activeWarnings[0]; 
        showNotification(mostRecentWarning);
    } else {
        alert("No active warnings to test.");
    }
}

function getEventName(warning) {
    if (!warning || !warning.properties) {
        console.error('Warning object is undefined or missing properties:', warning);
        return 'Unknown Event'; // Return a default value or handle the error as needed
    }

    const eventName = warning.properties.event;
    if (eventName === "Tornado Warning") {
        const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; 
        const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; 
        if (detectionType === "OBSERVED") {
            if (damageThreat === "CONSIDERABLE") {
                return "PDS Tornado Warning"; 
            } else if (damageThreat === "CATASTROPHIC") {
                return "Tornado Emergency"; 
            } else {
                return "Observed Tornado Warning"; 
            }
        } else {
            return "Radar Indicated Tornado Warning"; 
        }
    } else if (eventName === "Severe Thunderstorm Warning") {
        const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; 
        if (damageThreat === "CONSIDERABLE") {
            return "Considerable Severe Thunderstorm Warning"; 
        } else if (damageThreat === "DESTRUCTIVE") {
            return "Destructive Severe Thunderstorm Warning"; 
        }
    } else if (eventName === "Winter Weather Advisory") {
        return "Winter Weather Advisory"; 
    } else if (eventName === "Winter Storm Warning") {
        return "Winter Storm Warning"; 
    } else if (eventName === "Winter Storm Watch") {
        return "Winter Storm Watch"; 
    } else if (eventName === "Ice Storm Warning") {
        return "Ice Storm Warning"; 
    } else if (eventName === "Blizzard Warning") {
        return "Blizzard Warning"; 
    }
    return eventName; 
}


let currentCountyIndex = 0;

function updateDashboard() {
    if (activeWarnings.length === 0) {
        expirationElement.textContent = '';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = '';
        document.querySelector('.bottom-bar').style.backgroundColor = '#333'; 
        return;
    }

    const warning = activeWarnings[currentWarningIndex];
    let eventName = getEventName(warning); 

    let alertColor;
    switch (eventName) {
        case "Radar Indicated Tornado Warning":
            alertColor = 'rgb(255, 0, 0)'; 
            break;
        case "Observed Tornado Warning":
            alertColor = 'rgb(139, 0, 0)'; 
            break;
        case "PDS Tornado Warning":
            alertColor = 'rgb(128, 0, 128)'; 
            break;
        case "Tornado Emergency":
            alertColor = 'rgb(255, 0, 255)'; 
            break;
        case "Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 166, 0)'; 
            break;
        case "Flash Flood Warning":
            alertColor = 'rgb(0, 100, 0)'; 
            break;
        case "Tornado Watch":
            alertColor = 'rgb(255, 238, 0)'; 
            break;
        case "Severe Thunderstorm Watch":
            alertColor = 'rgb(255, 105, 180)'; 
            break;
        case "Winter Weather Advisory":
            alertColor = 'rgb(169, 81, 220)'; 
            break;
        case "Winter Storm Watch":
            alertColor = 'rgb(0, 0, 255)'; 
            break;
        case "Winter Storm Warning":
            alertColor = 'rgb(255, 88, 233)'; 
            break;
        case "Ice Storm Warning":
            alertColor = 'rgb(127, 33, 114)'; 
            break;
        case "Blizzard Warning":
            alertColor = 'rgb(255, 72, 44)'; 
            break;    
        case "Special Weather Statement":
            alertColor = 'rgb(61, 200, 255)';
            break;
        default:
            alertColor = '#333'; 
            break;
    }

    document.querySelector('.bottom-bar').style.backgroundColor = alertColor;

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
    eventTypeElement.textContent = eventName; 
    countiesElement.textContent = counties;
    currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
}

function formatCountiesTopBar(areaDesc) {
    const counties = areaDesc.split('; ');
    let formattedCounties = counties.slice(0, 4).map(county => {
        const parts = county.split(',');
        if (parts.length > 1) {
            return `${parts[0].trim()} County, ${parts[1].trim()}`; 
        }
        return county; 
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
        const eventName = getEventName(warning); 
        const counties = formatCountiesTopBar(warning.properties.areaDesc);
        const displayText = `${eventName} - ${counties}`; 

        if (!previousWarningIds.has(warningId)) {
            previousWarningIds.add(warningId); 
            showNotification(warning); 
        } else {

            const previousEvent = previousWarnings.get(warningId);
            if (previousEvent && previousEvent !== eventName) {
                showNotification(warning); 
                upgradeSound.play().catch(error => console.error('Error playing upgrade sound:', error));
            }
        }

        if (existingWarningsMap.has(warningId)) {
            const warningElement = existingWarningsMap.get(warningId);
            warningElement.textContent = displayText;
            warningElement.className = `warning-box ${eventTypes[eventName]}`; 

            if (eventName === "Winter Storm Warning") {
                warningElement.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningElement.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningElement.style.backgroundColor = "rgb(169, 81, 220)";
            }

        } else {
            const warningBox = document.createElement('div');
            warningBox.className = `warning-box ${eventTypes[eventName]}`; 
            warningBox.setAttribute('data-warning-id', warningId);
            warningBox.textContent = displayText;

            if (eventName === "Winter Storm Warning") {
                warningBox.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningBox.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningBox.style.backgroundColor = "rgb(169, 81, 220)";
            }

            warningBox.style.animation = 'flash 0.5s alternate infinite'; 

            warningListElement.appendChild(warningBox);

            setTimeout(() => {
                warningBox.style.animation = ''; 
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
    const audio = new Audio(`Sounds/${soundFile}`); 
    audio.play().catch(error => console.error('Error playing sound:', error));
}

function showNotification(warning) {
    const eventName = getEventName(warning);
    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    const callToAction = "Stay Safe & Take Appropriate Action!"; 

    const notification = document.createElement('div');
    notification.className = 'notification-popup'; 

    let alertColor;
    switch (eventName) {
        case "Radar Indicated Tornado Warning":
            alertColor = 'rgb(255, 0, 0)'; 
            playSound('warning.wav'); 
            break;
        case "Observed Tornado Warning":
            alertColor = 'rgb(139, 0, 0)'; 
            playSound('warning.wav'); 
            break;
        case "PDS Tornado Warning":
            alertColor = 'rgb(128, 0, 128)'; 
            playSound('warning.wav'); 
            break;
        case "Tornado Emergency":
            alertColor = 'rgb(255, 0, 255)'; 
            playSound('warning.wav'); 
            break;
        case "Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 166, 0)'; 
            playSound('warning.wav'); 
            break;
        case "Considerable Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 140, 0)';
            playSound('warning.wav');
            break;
        case "Destructive Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 102, 0)';
            playSound('warning.wav');
            break;
        case "Flash Flood Warning":
            alertColor = 'rgb(0, 100, 0)'; 
            playSound('warning.wav'); 
            break;
        case "Tornado Watch":
            alertColor = 'rgb(255, 217, 0)'; 
            playSound('watch.wav'); 
            break;
        case "Severe Thunderstorm Watch":
            alertColor = 'rgb(225, 74, 180)'; 
            playSound('watch.wav'); 
            break;
        case "Winter Weather Advisory":
            alertColor = 'rgb(169, 81, 220)'; 
            playSound('advisory.wav'); 
            break;
        case "Winter Storm Watch":
            alertColor = 'rgb(0, 0, 255)'; 
            playSound('watch.wav'); 
            break;
        case "Blizzard Warning":
            alertColor = 'rgb(255, 74, 13)'; 
            playSound('warning.wav'); 
            break;    
        case "Winter Storm Warning":
            alertColor = 'rgb(255, 88, 233)'; 
            playSound('warning.wav'); 
            break;
        case "Ice Storm Warning":
            alertColor = 'rgb(145, 29, 130)'; 
            playSound('warning.wav'); 
            break;
        case "Special Weather Statement":
            alertColor = 'rgb(135, 223, 255)';
            playSound('advisory.wav');
            break;
        default:
            alertColor = 'rgba(255, 255, 255, 0.9)'; 
            break;
    }

    notification.style.backgroundColor = alertColor;

    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = eventName;

    const countiesSection = document.createElement('div');
    countiesSection.className = 'notification-message';
    countiesSection.textContent = counties;

    const actionSection = document.createElement('div');
    actionSection.className = 'notification-message';
    actionSection.textContent = callToAction;

    notification.appendChild(title);
    notification.appendChild(countiesSection);
    notification.appendChild(actionSection);

    document.body.appendChild(notification);

    notification.style.opacity = 1;

    setTimeout(() => {
        notification.classList.add('slide-out'); 
        setTimeout(() => {
            notification.remove(); 
        }, 500); 
    }, 10000); 
}

document.addEventListener('DOMContentLoaded', () => {
    fetchWarnings();
    updateDashboard();
});

setInterval(fetchWarnings, 3000);

setInterval(updateDashboard, 5000);

fetchWarnings();
updateDashboard();