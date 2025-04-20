const eventTypes = {
    "Tornado Warning": "tornado-warning",
    "Observed Tornado Warning": "observed-tornado-warning",
    "PDS Tornado Warning": "pds-tornado-warning",
    "Tornado Emergency": "tornado-emergency",
    "Severe Thunderstorm Warning": "severe-thunderstorm-warning", 
    "Considerable Severe Thunderstorm Warning": "severe-thunderstorm-considerable", 
    "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning", 
    "Flash Flood Warning": "flash-flood-warning",
    "Flash Flood Emergency": "flash-flood-emergency",
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
    "Tornado Warning": 4,
    "Destructive Severe Thunderstorm Warning": 5, 
    "Considerable Severe Thunderstorm Warning": 6, 
    "Severe Thunderstorm Warning": 7, 
    "Special Weather Statement": 8,
    "Tornado Watch": 9,
    "Severe Thunderstorm Watch": 10,
    "Flash Flood Emergency": 11,
    "Flash Flood Warning": 12,
    "Blizzard Warning": 13,
    "Ice Storm Warning": 14,
    "Winter Storm Warning": 15,
    "Winter Storm Watch": 16,
    "Winter Weather Advisory": 17,
};

let currentTimeZone = 'ET';

const warningListElement = document.getElementById('warningList');
const expirationElement = document.getElementById('expiration');
const eventTypeElement = document.getElementById('eventType');
const countiesElement = document.getElementById('counties');

const tornadoCountElement = document.getElementById('tornadoCount');
const thunderstormCountElement = document.getElementById('thunderstormCount');
const floodCountElement = document.getElementById('floodCount');
const winterWeatherCountElement = document.getElementById('winterWeatherCount'); 

const socket = new WebSocket("ws://localhost:8080");


socket.addEventListener("message", (event) => {
    const warning = JSON.parse(event.data);
    activeWarnings.push({ properties: warning });
    displayNotification({ properties: warning });
    updateDashboard();
});

let previousWarningIds = new Set(); 

const labels = {
    tornado: "🌪️TORNADO WARNINGS",
    thunderstorm: "⛈️SEVERE THUNDERSTORM WARNINGS",
    flood: "💦FLASH FLOOD WARNINGS",
    winter: "❄️WINTER WEATHER WARNINGS"
};

let currentWarningIndex = 0;
let activeWarnings = [];

let previousWarnings = new Map();

document.body.addEventListener('click', enableSound);

function enableSound() {
    document.body.removeEventListener('click', enableSound);
}

const headerElement = document.createElement('div');
headerElement.textContent = "Latest Alerts:"; 
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

function toggleSlider() {
    var slider = document.getElementById('sliderContainer');
    var body = document.body;

    if (slider.style.transform === 'translateY(0%)') {
        slider.style.transform = 'translateY(-100%)';
        body.classList.remove('overlay');
    } else {
        slider.style.transform = 'translateY(0%)';
        body.classList.add('overlay');
    }
}

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
        });

        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`;

        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));

        activeWarnings = warnings;

        updateWarningList(warnings);

        const currentWarningIds = new Set(warnings.map(w => w.id));

        warnings.forEach(warning => {
            const warningId = warning.id;
            const eventName = getEventName(warning);

            if (!warning.properties || !warning.properties.event) {
                console.warn('Warning is missing properties:', warning);
                return;
            }
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

        previousWarningIds.forEach(id => {
            if (!currentWarningIds.has(id)) {
                console.log(`⚠️ Warning expired: ${previousWarnings.get(id)} (ID: ${id})`);
                notifyWarningExpired(previousWarnings.get(id), id);
                previousWarnings.delete(id);
                previousWarningIds.delete(id);
            }
        });
        

    } catch (error) {
        console.error('❌ Error fetching warnings:', error);
    }
}

function notifyWarningExpired(eventName, warningId, areaDesc = "N/A") {
    const expiredWarning = {
        properties: {
            event: `A weather alert expired - This was a ${eventName} near ${areaDesc}`,
            id: warningId,
            areaDesc: `This was a ${eventName} near ${areaDesc}`,
            alertColor: '#FFE4C4'
        }
    };
}

function testNotification(eventName) {
    const warning = {
        properties: {
            event: eventName, 
            areaDesc: "TESTING - Washtenaw, MI; Lenawee, MI; Monroe, MI; Wayne, MI; Oakland, MI; Macomb, MI; Livingston, MI; Genesee, MI; Ingham, MI; Jackson, MI; Hillsdale, MI; Calhoun, MI; Eaton, MI; Shiawassee, MI; Clinton, MI; Lapeer, MI; St. Clair, MI; Barry, MI;", 
            actionSection: "THIS IS A TEST MESSAGE. DO NOT TAKE ACTION ON THIS MESSAGE." 
        }
    };
    showNotification(warning);
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
        return 'Unknown Event'; 
    }

    const eventName = warning.properties.event;
    const description = warning.properties.description || "";

    if (eventName === "Tornado Warning") {
        const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; 
        const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; 
        if (description.includes("This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!")) {
            return "PDS Tornado Warning"; 
        } else if (detectionType === "OBSERVED") {
            if (damageThreat === "CONSIDERABLE") {
                return "PDS Tornado Warning"; 
            } else if (damageThreat === "CATASTROPHIC") {
                return "Tornado Emergency"; 
            } else {
                return "Observed Tornado Warning"; 
            }
        } else {
            return "Tornado Warning"; 
        }
    } else if (eventName === "Severe Thunderstorm Warning") {
        const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; 
        if (damageThreat === "CONSIDERABLE") {
            return "Considerable Severe Thunderstorm Warning"; 
        } else if (damageThreat === "DESTRUCTIVE") {
            return "Destructive Severe Thunderstorm Warning"; 
        }
    } else if (eventName === "Flash Flood Warning") {
        if (description.includes("FLASH FLOOD EMERGENCY")) {
            return "Flash Flood Emergency";
        }
    } else if (["Winter Weather Advisory", "Winter Storm Warning", "Winter Storm Watch", "Ice Storm Warning", "Blizzard Warning"].includes(eventName)) {
        return eventName; 
    } else if (description.includes("TORNADO EMERGENCY")) {
        return "Tornado Emergency"; 
    }
    return eventName; 
}

let currentCountyIndex = 0;

let isNotificationQueueEnabled = false; 
let notificationQueue = []; 
let isShowingNotification = false; 

document.getElementById('singleNotificationToggleButton').addEventListener('click', () => {
    isNotificationQueueEnabled = !isNotificationQueueEnabled; 
    const buttonText = isNotificationQueueEnabled ? "Disable Single Notification Queue" : "Enable Single Notification Queue";
    document.getElementById('singleNotificationToggleButton').textContent = buttonText; 
});

function showNotification(warning) {
    if (isNotificationQueueEnabled) {
        notificationQueue.push(warning); 
        processNotificationQueue(); 
    } else {
        displayNotification(warning);
    }
}

function processNotificationQueue() {
    if (isShowingNotification || notificationQueue.length === 0) {
        return; 
    }

    isShowingNotification = true; 
    const warning = notificationQueue.shift(); 
    displayNotification(warning); 

    setTimeout(() => {
        isShowingNotification = false; 
        processNotificationQueue(); 
    }, 5000); 
}

function typeEffect(element, text, delay = 25, startDelay = 150) {
    element.textContent = '';
    let index = 0;

    setTimeout(() => {
        const typingInterval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, delay);
    }, startDelay);
}



function getHighestActiveAlert() {
    if (activeWarnings.length === 0) {
        return { alert: 'N/A', color: 'rgba(255, 255, 255, 0.9)' };
    }

    const highestAlert = activeWarnings.reduce((prev, current) => {
        return priority[current.properties.event] < priority[prev.properties.event] ? current : prev;
    });

    return {
        alert: highestAlert.properties.event,
        color: getAlertColor(highestAlert.properties.event)
    };
}

function updateClock() {
    const now = new Date();
  
    const displayTime = new Date(now.getTime() - (currentTimeZone === 'CT' ? 1 : 0) * 60 * 60 * 1000);
  
    let hours = displayTime.getHours();
    const minutes = displayTime.getMinutes().toString().padStart(2, '0');
    const seconds = displayTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
  
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm} ${currentTimeZone}`;
    const dateString = `${(displayTime.getMonth() + 1).toString().padStart(2, '0')}/${displayTime.getDate().toString().padStart(2, '0')}/${(displayTime.getFullYear() % 100).toString().padStart(2, '0')}`;
  
    document.getElementById('clockDisplay').textContent = `${timeString}   ${dateString}`;
  }
  
  function toggleTimeZone() {
    if (currentTimeZone === 'ET') {
      currentTimeZone = 'CT';
      document.getElementById('toggleTimeZone').textContent = 'Switch to Eastern Time';
    } else {
      currentTimeZone = 'ET';
      document.getElementById('toggleTimeZone').textContent = 'Switch to Central Time';
    }
    updateClock();
  }

  
  setInterval(updateClock, 1000);
  updateClock();
  
function updateAlertBar() {
    const highestAlert = getHighestActiveAlert();
    const alertBar = document.getElementById('alertBar');
    const alertText = document.getElementById('highestAlertText');

    if (highestAlert.alert === 'N/A') {
        alertText.textContent = 'MICHIGAN STORM CHASERS';
        alertBar.style.backgroundColor = '#1F2593';
        alertBar.style.setProperty('--glow-color', 'rgba(255, 255, 255, 0.6)');
    } else {
        alertText.textContent = `${highestAlert.alert}`;
        alertBar.style.backgroundColor = highestAlert.color;

        alertBar.style.setProperty('--glow-color', highestAlert.color);
    }
}

setInterval(updateAlertBar, 5000);

function getAlertColor(eventName) {
    switch (eventName) {
        case "Tornado Warning":
            return '#FF0000';
        case "Observed Tornado Warning":
            return '#FF00FF';
        case "PDS Tornado Warning":
            return '#FF00FF';
        case "Tornado Emergency":
            return '#FF0080';
        case "Severe Thunderstorm Warning":
            return '#FF8000';
        case "Considerable Severe Thunderstorm Warning":
            return '#FF8000';
        case "Destructive Severe Thunderstorm Warning":
            return '#FF8000';
        case "Flash Flood Warning":
            return '#228B22';
        case "Flash Flood Emergency":
            return '#8B0000';
        case "Tornado Watch":
            return '#FFFF00';
        case "Severe Thunderstorm Watch":
            return '#DB7093';
        case "Winter Weather Advisory":
            return '#7B68EE';
        case "Winter Storm Warning":
            return '#FF69B4';
        case "Winter Storm Watch":
            return '#0000FF';
        case "Ice Storm Warning":
            return '#8B008B';
        case "Blizzard Warning":
            return '#FF4500';
        case "Special Weather Statement":
            return '#FFE4B5';
        default:
            return 'rgba(255, 255, 255, 0.9)';
    }
}

setInterval(updateAlertBar, 5000);

const audioElements = {
    TorIssSound: new Audio("https://audio.jukehost.co.uk/ClbCqxfWssr6dlRXqx3lXVqKQPPVeRgQ"),
    TorPDSSound: new Audio("https://audio.jukehost.co.uk/kL1u7N03VA1UW8BsPzuYWHXGBaJINmJ6"),
    PDSSVRSound: new Audio("https://audio.jukehost.co.uk/DvWZ5IjakUW0fHpqc3t2ozBS1BGFxDN4"),
    SVRCSound: new Audio("https://audio.jukehost.co.uk/Xkv300KaF6MJghFS9oQ5BMTWfSDle4IW"),
    TORUPG: new Audio("https://audio.jukehost.co.uk/o6LRilMzywJkfY9QVreGyUjobxERtgwV"),
    TOREISS: new Audio("https://audio.jukehost.co.uk/aCEN5hTIGdOgWPEqok5pYP28fomDUWuY"),
    TOAWatch: new Audio("https://audio.jukehost.co.uk/MZxVbo8EmFP4XP6vTKaGPtUfGIU6IFdK"),
    SVAWatch: new Audio("https://audio.jukehost.co.uk/vOROpwVlXRik9TS2wXvJvtYInR8o2qMQ")
};

function playSoundById(soundId) {
    const sound = audioElements[soundId];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => console.error('Error playing sound:', error));
    } else {
        audioElements.SVRCSound.currentTime = 0;
        audioElements.SVRCSound.play().catch(error => console.error('Error playing fallback sound:', error));
    }
}

function displayNotification(warning) {
    const eventName = getEventName(warning);
    // Use the notification-specific formatting function here
    const counties = formatCountiesNotification(warning.properties.areaDesc);
    
    const notification = document.createElement('div');
    notification.className = 'notification-popup'; 
    notification.style.bottom = '125';

    // Add the notification pulse to the logo
        // Add the notification pulse to the logo
    const logo = document.getElementById('pulseLogo');
    if (logo) {
    // Remove any existing animation class
    logo.classList.remove('notification-pulse');
    
    // Trigger reflow to restart animation
    void logo.offsetWidth;
    
    // Add the notification pulse class
    logo.classList.add('notification-pulse');
    
    // Remove the notification pulse class after animation completes
    setTimeout(() => {
        logo.classList.remove('notification-pulse');
        // No need to set an animation back since we want no animation between notifications
    }, 2000);
 }


    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = eventName; 

    const countiesSection = document.createElement('div');
    countiesSection.className = 'notification-message';
    countiesSection.textContent = counties; 

    notification.appendChild(title);
    notification.appendChild(countiesSection);
    document.body.appendChild(notification);

    notification.style.transform = 'translateY(100%)';
    setTimeout(() => {
        notification.style.transform = 'translateY(53%)';
    }, 10);

    if (eventName.includes("Tornado Emergency")) {
        playSoundById('TOREISS');
    } else if (eventName.includes("PDS Tornado Warning")) {
        playSoundById('TorPDSSound');
    } else if (eventName.includes("Tornado Warning")) {
        playSoundById('TorIssSound');
    } else if (eventName.includes("Severe Thunderstorm Warning") && eventName.includes("Considerable")) {
        playSoundById('SVRCSound');
    } else if (eventName.includes("Destructive Severe Thunderstorm Warning")) {
        playSoundById('PDSSVRSound');
    } else if (eventName.includes("Tornado Watch")) {
        playSoundById('TOAWatch');
    } else if (eventName.includes("Severe Thunderstorm Watch")) {
        playSoundById('SVAWatch');
    } else {
        playSoundById('SVRCSound');
    }

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

    let alertColor = getAlertColor(eventName); 
    notification.style.backgroundColor = alertColor; 
    notification.style.opacity = 1; 

    setTimeout(() => {
        notification.style.transform = 'translateY(100%)';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 7000);
}



document.getElementById('testCustomWarningButton').addEventListener('click', () => {
    const customWarningText = document.getElementById('customWarningInput').value;
    if (customWarningText) {
        testNotification(customWarningText);
    } else {
        alert("Please enter a warning to test.");
    }
});

document.getElementById('tacticalModeButton').addEventListener('click', () => {
    tacticalMode();
    setInterval(fetchWarnings, 3000);
});





function isWarningActive(warning) {
    const expirationDate = new Date(warning.properties.expires);
    return expirationDate > new Date();
}

function getEventNameFromText(warningText) {
    if (warningText.includes("Tornado Warning")) {
        if (warningText.includes("This is a PARTICULARLY DANGEROUS SITUATION. TAKE COVER NOW!")) {
            return "PDS Tornado Warning";
        } else if (warningText.includes("TORNADO EMERGENCY")) {
            return "Tornado Emergency";
        } else {
            return "Observed Tornado Warning";
        }
    } else if (warningText.includes("Severe Thunderstorm Warning")) {
        if (warningText.includes("THUNDERSTORM DAMAGE THREAT...CONSIDERABLE")) {
            return "Considerable Severe Thunderstorm Warning";
        } else if (warningText.includes("THUNDERSTORM DAMAGE THREAT...DESTRUCTIVE")) {
            return "Destructive Severe Thunderstorm Warning";
        } else {
            return "Severe Thunderstorm Warning";
        }
    } else if (warningText.includes("Flash Flood Warning")) {
        return "Flash Flood Warning";
    } else {
        return "Unknown Event";
    }
}

function extractCounties(warningText) {
    const countyRegex = /(?:\* Locations impacted include\.\.\.\s*)([\s\S]*?)(?=\n\n)/;
    const match = warningText.match(countyRegex);
    return match ? match[1].trim() : "N/A";
}

// For the dashboard display (limit to 4 counties)
function formatCountiesTopBar(areaDesc) {
    if (!areaDesc) return "Unknown Area";
    
    // Split the counties string and clean each part
    const parts = areaDesc.split(';').map(part => part.trim());
    
    // If we have more than 4 counties, only show the first 4 with an ellipsis
    if (parts.length > 4) {
        return parts.slice(0, 4).join(', ') + '...';
    }
    
    return parts.join(', ');
}

// For notifications (show all counties)
function formatCountiesNotification(areaDesc) {
    if (!areaDesc) return "Unknown Area";
    
    // Split the counties string and clean each part
    const parts = areaDesc.split(';').map(part => part.trim());
    
    // Show all counties in notifications
    return parts.join(', ');
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
            }
        }

        if (existingWarningsMap.has(warningId)) {
            const warningElement = existingWarningsMap.get(warningId);
            warningElement.textContent = displayText;
            warningElement.className = `warning-box ${eventTypes[eventName]}`; 
        } else {
            const warningBox = document.createElement('div');
            warningBox.className = `warning-box ${eventTypes[eventName]}`; 
            warningBox.setAttribute('data-warning-id', warningId);
            warningBox.textContent = displayText;

            warningListElement.appendChild(warningBox);
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

function getCallToAction(eventName) {
    switch (eventName) {
        case "Tornado Warning":
        case "Observed Tornado Warning":
            return "Seek shelter now!";
        case "PDS Tornado Warning":
        case "Tornado Emergency":
            return "Seek shelter now! You are in a life-threatening situation!";
        case "Severe Thunderstorm Warning":
        case "Considerable Severe Thunderstorm Warning":
        case "Destructive Severe Thunderstorm Warning":
            return "Seek shelter indoors away from windows!";
        case "Flash Flood Warning":
            return "Seek higher ground now!";
        case "Tornado Watch":
        case "Severe Thunderstorm Watch":
        case "Winter Weather Advisory":
        case "Winter Storm Watch":
        case "Blizzard Warning":
        case "Winter Storm Warning":
        case "Ice Storm Warning":
            return "Stay tuned for further info!";
        default:
            return "Take Appropriate Action!";
    }
}

function updateDashboard() {
    if (activeWarnings.length === 0) {
        expirationElement.textContent = 'N/A';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = 'N/A';
        document.querySelector('.event-type-bar').style.backgroundColor = '#333';
        return;
    }

    const warning = activeWarnings[currentWarningIndex];

    if (!warning || !warning.properties) {
        console.error('Warning object is undefined or missing properties:', warning);
        return;
    }

    let eventName = getEventName(warning); 

    let alertColor = getAlertColor(eventName); 
    document.querySelector('.event-type-bar').style.backgroundColor = alertColor;

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
    countiesElement.textContent = `Counties: ${counties}`;
    currentWarningIndex = (currentWarningIndex + 1) % activeWarnings.length;
}

document.addEventListener('DOMContentLoaded', () => {
    fetchWarnings();
    updateDashboard();
});

setInterval(fetchWarnings, 3000);
setInterval(updateDashboard, 5000);
