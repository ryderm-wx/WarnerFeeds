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
    "Blizzard Warning": "blizzard-warning",
    "Flash Flood Emergency": "flash-flood-emergency"
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
    "Flash Flood Emergency": 11,
    "Flash Flood Warning": 12,
    "Blizzard Warning": 13,
    "Ice Storm Warning": 14,
    "Winter Storm Warning": 15,
    "Winter Storm Watch": 16,
    "Winter Weather Advisory": 17,
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

async function fetchWarnings() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active');
        const data = await response.json();
        const warnings = data.features.filter(feature =>
            selectedAlerts.has(feature.properties.event) // Filter selected alerts
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
        });

        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`; // Update winter weather count

        // Sort warnings by issuance time (newest first)
        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));

        activeWarnings = warnings;

        updateWarningList(warnings);

        const currentWarningIds = new Set(warnings.map(w => w.id));

        warnings.forEach(warning => {
            const warningId = warning.id;
            const eventName = getEventName(warning);

            if (!warning.properties || !warning.properties.event) {
                console.warn('Warning is missing properties:', warning);
                return; // Skip this warning if it doesn't have the necessary properties
            }
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

        // Detect expired warnings (warnings that were previously active but are no longer in the current set)
        previousWarningIds.forEach(id => {
            if (!currentWarningIds.has(id)) {
                console.log(`⚠️ Warning expired: ${previousWarnings.get(id)} (ID: ${id})`);
                notifyWarningExpired(previousWarnings.get(id), id); // Call the new function
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
            event: `A weather alert expired - This was a ${eventName} near ${areaDesc}`, // Updated string interpolation
            id: warningId,
            areaDesc: `This was a ${eventName} near ${areaDesc}`, // Updated areaDesc
            alertColor: 'rgb(203, 165, 107)'
        }
    };
}




// Example usage
 // Replace with actual event name and ID






 function testNotification(eventName) {
    const warning = {
        properties: {
            event: eventName, 
            areaDesc: "Washtenaw, MI; Lenawee, MI; Monroe, MI; Wayne, MI", // Added comma here
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
    const description = warning.properties.description || ""; // Get the description field

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
            return "Radar Indicated Tornado Warning"; 
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
            return "Flash Flood Emergency"; // Corrected line
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
    element.textContent = ''; // Clear the existing text
    let index = 0;

    // Start typing after the specified startDelay
    setTimeout(() => {
        const typingInterval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, delay);
    }, startDelay); // Delay before starting the typing effect
}


function displayNotification(warning) {
    const eventName = getEventName(warning);
    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    const callToAction = getCallToAction(eventName);
    
    const notification = document.createElement('div');
    notification.className = 'notification-popup'; 

    // Create the test message element
    const testMessage = document.createElement('div');
    testMessage.className = 'test-message';
    testMessage.textContent = "THIS IS A TEST MESSAGE";

    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = eventName; 

    const countiesSection = document.createElement('div');
    countiesSection.className = 'notification-message';
    countiesSection.textContent = counties; 

    const actionSection = document.createElement('div');
    actionSection.className = 'notification-calltoaction';
    actionSection.textContent = callToAction; 

    // Append elements
    notification.appendChild(testMessage);
    notification.appendChild(title);
    notification.appendChild(countiesSection);
    notification.appendChild(actionSection);
    document.body.appendChild(notification); // Ensure it's in the DOM

    // Check the checkbox state to show or hide the test message
    const testMessageCheckbox = document.getElementById('testMessageCheckbox');
    testMessage.style.display = testMessageCheckbox.checked ? 'block' : 'none';

    // Apply typing effect
    typeEffect(title, eventName);
    typeEffect(actionSection, callToAction);

    // Add 'show' class after a slight delay
    setTimeout(() => {
        notification.classList.add('show', 'slide-in'); // Ensure slide-in effect
    }, 50);

    // Play sounds based on alert type
    if (eventName.includes("Emergency")) {
        playSound('emergency.wav');
    } else if (eventName.includes("Warning") && !eventName.includes("PDS Tornado Warning")) {
        playSound('warning.wav');
    } else if (eventName.includes("Watch")) {
        playSound('watch.wav');
    } else if (eventName.includes("Advisory") || eventName.includes("Statement")) {
        playSound('advisory.wav');
    }

    // Set expiration time without typing effect
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
            playSound('emergency.wav'); 
            break;
        case "Tornado Emergency":
            alertColor = 'rgb(255, 0, 255)'; 
            break;
        case "Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 166, 0)'; 
            break;
        case "Considerable Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 132, 0)'; 
            break;
        case "Destructive Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 110, 0)'; 
            break;
        case "Flash Flood Warning":
            alertColor = 'rgb(0, 100, 0)'; 
            break;
        case "Flash Flood Emergency":
            alertColor = 'rgb(39, 176, 39)'; 
            break;    
        case "Tornado Watch":
            alertColor = 'rgb(255, 217, 0)'; 
            break;
        case "Severe Thunderstorm Watch":
            alertColor = 'rgb(211, 90, 175)'; 
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
            alertColor = 'rgb(145, 29, 130)'; 
            break;
        case "Blizzard Warning":
            alertColor = 'rgb(255, 72, 44)'; 
            break;
        case "Special Weather Statement":
            alertColor = 'rgb(61, 200, 255)'; 
            break;
        default:
            alertColor = 'rgba(255, 255, 255, 0.9)'; 
            break;
    }

    notification.style.backgroundColor = alertColor; 
    notification.style.opacity = 1; 

    // Default timeout for other alerts
    setTimeout(() => {
        notification.classList.add('slide-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 7000);
}

document.getElementById('testCustomWarningButton').addEventListener('click', () => {
    const customWarningText = document.getElementById('customWarningInput').value;
    if (customWarningText) {
        testNotification(customWarningText); // Call the existing testNotification function
    } else {
        alert("Please enter a warning to test.");
    }
});


document.getElementById('tacticalModeButton').addEventListener('click', () => {
    tacticalMode(); // Call the tacticalMode function
    setInterval(fetchWarnings, 3000); // Fetch warnings every 3 seconds
});


async function tacticalMode() {
    try {
        console.log('Fetching tactical warnings index from warnings.allisonhouse.com...');
        const indexResponse = await fetch('https://warnings.allisonhouse.com/');

        if (!indexResponse.ok) {
            console.error('Failed to fetch warnings index. Status:', indexResponse.status);
            return;
        }

        const indexText = await indexResponse.text();
        const parser = new DOMParser();
        const indexDoc = parser.parseFromString(indexText, 'text/html');
        const warningLinks = indexDoc.querySelectorAll('a');

        console.log(`Found ${warningLinks.length} warning links.`);

        for (const link of warningLinks) {
            const warningUrl = `https://warnings.allisonhouse.com/${link.href}`; // Use the correct base URL

            console.log(`Fetching warning file: ${warningUrl}`);
            const warningResponse = await fetch(warningUrl, { mode: 'cors' }); // Ensure CORS is handled

            if (!warningResponse.ok) {
                console.error('Failed to fetch warning file. Status:', warningResponse.status);
                continue;
            }

            const warningText = await warningResponse.text();
            const eventName = getEventNameFromText(warningText);
            const counties = extractCounties(warningText);

            // Display or use the extracted data as needed
            showNotification({
                properties: {
                    event: eventName,
                    areaDesc: counties,
                    expires: new Date().toISOString() // Set expiration as needed
                }
            });
        }
    } catch (error) {
        console.error('Error fetching tactical warnings:', error);
    }
}




//nodemon server.js to run.


// Helper function to check if a warning is active
function isWarningActive(warning) {
    const expirationDate = new Date(warning.properties.expires);
    return expirationDate > new Date(); // Check if the warning has not expired
}




// Helper function to extract event name from warning text
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
            return "Severe Thunderstorm Warning"; // Default return for Severe Thunderstorm Warning
        }
    } else if (warningText.includes("Flash Flood Warning")) {
        return "Flash Flood Warning";
    } else {
        return "Unknown Event";
    }
}


// Helper function to extract counties from the warning text
function extractCounties(warningText) {
    const countyRegex = /(?:\* Locations impacted include\.\.\.\s*)([\s\S]*?)(?=\n\n)/; // Regex to capture counties
    const match = warningText.match(countyRegex);
    return match ? match[1].trim() : "N/A"; // Return counties or "N/A" if not found
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
        case "Radar Indicated Tornado Warning":
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
        expirationElement.textContent = '';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = '';
        document.querySelector('.bottom-bar').style.backgroundColor = '#333'; 
        return;
    }

    const warning = activeWarnings[currentWarningIndex];

    // Check if the warning object is defined and has properties
    if (!warning || !warning.properties) {
        console.error('Warning object is undefined or missing properties:', warning);
        return; // Exit the function if the warning is invalid
    }

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
        case "Considerable Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 132, 0)'; 
            break;
        case "Destructive Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 110, 0)'; 
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

document.addEventListener('DOMContentLoaded', () => {
    fetchWarnings();
    updateDashboard();
});

setInterval(fetchWarnings, 3000);
setInterval(updateDashboard, 5000);
