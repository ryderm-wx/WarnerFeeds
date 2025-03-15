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
    "James Pettus Being A Pussy Warning": "james-pettus-warning",
    "Ryder Saying Nigger Warning": "blayne-warning"
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
    "James Pettus Being A Pussy Warning": 17,
    "Ryder Saying Nigger Warning": 18,
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
            } else if (eventName === "Blizzard Warning") {
                winterWeatherCount++; 
            } else if (eventName === "Ice Storm Warning") {
                winterWeatherCount++; 
            }
        });

        // Update the counts in the UI
        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`; 

        // Sort warnings by sent date
        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));

        activeWarnings = warnings;

        updateWarningList(warnings);

        warnings.forEach(warning => {
            const warningId = warning.id;
            const eventName = getEventName(warning);
            const previousEvent = previousWarnings.get(warningId);

            // Check if the warning is new or upgraded
            if (!previousWarningIds.has(warningId)) {
                // New warning
                previousWarningIds.add(warningId);
                showNotification(warning); // Show notification for new warnings
            } else if (previousEvent && previousEvent !== eventName) {
                // Check if the warning has been upgraded
                const previousDamageThreat = previousWarnings.get(`${warningId}-threat`);
                const currentDamageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0] || warning.properties.parameters?.thunderstormDamageThreat?.[0];

                if (previousDamageThreat !== currentDamageThreat) {
                    showNotification(warning); // Show notification for upgraded warnings
                }
            }

            // Update previous warnings
            previousWarnings.set(warningId, eventName);
            previousWarnings.set(`${warningId}-threat`, warning.properties.parameters?.tornadoDamageThreat?.[0] || warning.properties.parameters?.thunderstormDamageThreat?.[0]);
        });

    } catch (error) {
        console.error('Error fetching warnings:', error);
    }
}



function testNotification(eventName) {
    const warning = {
        properties: {
            event: eventName,
            areaDesc: "Washtenaw, MI; Lenawee, MI; Monroe, MI; Wayne, MI" 
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
    } else if (eventName === "James Pettus Being A Pussy Warning") {
        return "James Pettus Being A Pussy Warning"; 
    } else if (eventName === "Ryder Saying Nigger Warning") {
        return "Ryder Saying Nigger Warning"; 
    }
    return eventName; 
}


let currentCountyIndex = 0;

let isNotificationQueueEnabled = false; // Flag to track the state of the notification queue
let notificationQueue = []; // Array to hold notifications that are waiting to be displayed
let isShowingNotification = false; // Flag to indicate if a notification is currently being shown

document.getElementById('singleNotificationToggleButton').addEventListener('click', () => {
    isNotificationQueueEnabled = !isNotificationQueueEnabled; // Toggle the state
    const buttonText = isNotificationQueueEnabled ? "Disable Single Notification Que" : "Enable Single Notification Que";
    document.getElementById('singleNotificationToggleButton').textContent = buttonText; // Update button text
});

// Your existing showNotification, processNotificationQueue, and displayNotification functions go here


function showNotification(warning) {
    // If the notification queue is enabled, add the warning to the queue
    if (isNotificationQueueEnabled) {
        notificationQueue.push(warning); // Add the warning to the queue
        processNotificationQueue(); // Start processing the queue
    } else {
        // If the queue is not enabled, display the notification immediately
        displayNotification(warning);
    }
}

function processNotificationQueue() {
    // Check if a notification is already being shown or if there are no notifications in the queue
    if (isShowingNotification || notificationQueue.length === 0) {
        return; // Exit the function if a notification is being shown or the queue is empty
    }

    isShowingNotification = true; // Set the flag to indicate a notification is being shown
    const warning = notificationQueue.shift(); // Get the next warning from the queue
    displayNotification(warning); // Call the function to display the notification

    // Set a timeout to remove the notification after a specified duration
    setTimeout(() => {
        isShowingNotification = false; // Reset the flag to allow the next notification to be shown
        processNotificationQueue(); // Process the next notification in the queue
    }, 5000); // Display each notification for 10 seconds
}

function displayNotification(warning) {
    // Extract the event name and counties from the warning object
    const eventName = getEventName(warning);
    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    const callToAction = getCallToAction(eventName);
    
    // Create a new notification element
    const notification = document.createElement('div');
    notification.className = 'notification-popup'; // Set the class for styling

    let alertColor; // Variable to hold the background color based on the event type
    // Set alert color based on event name
    switch (eventName) {
        case "Ryder Saying Nigger Warning":
            alertColor = 'rgb(104, 66, 23)'; 
            playSound('warning.wav'); 
            break;
        case "James Pettus Being A Pussy Warning":
            alertColor = 'rgb(230, 0, 255)'; 
            playSound('warning.wav'); 
            break;
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
            alertColor = 'rgb(255, 132, 0)'; 
            playSound('warning.wav'); 
            break;
        case "Destructive Severe Thunderstorm Warning":
            alertColor = 'rgb(255, 110, 0)'; 
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
            alertColor = 'rgb(211, 90, 175)'; 
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
        case "Winter Storm Warning":
            alertColor = 'rgb(255, 88, 233)'; 
            playSound('warning.wav'); 
            break;
        case "Ice Storm Warning":
            alertColor = 'rgb(145, 29, 130)'; 
            playSound('warning.wav'); 
            break;
        case "Blizzard Warning":
            alertColor = 'rgb(255, 72, 44)'; 
            playSound('warning.wav'); 
            break;
        case "Special Weather Statement":
            alertColor = 'rgb(61, 200, 255)'; 
            playSound('advisory.wav'); 
            break;
        default:
            alertColor = 'rgba(255, 255, 255, 0.9)'; // Default color for unspecified events
            break;
    }

    notification.style.backgroundColor = alertColor; // Set the background color of the notification

    // Create and append the title element
    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = eventName; // Set the title text to the event name

    // Create and append the counties section
    const countiesSection = document.createElement('div');
    countiesSection.className = 'notification-message';
    countiesSection.textContent = counties; // Set the text to the formatted counties

    // Create and append the call-to-action section
    const actionSection = document.createElement('div');
    actionSection.className = 'notification-calltoaction';
    actionSection.textContent = callToAction; // Set the text to the call to action

    // Append all sections to the notification element
    notification.appendChild(title);
    notification.appendChild(countiesSection);
    notification.appendChild(actionSection);

    // Add the notification to the document body
    document.body.appendChild(notification);
    notification.style.opacity = 1; // Set the opacity to make it visible

    // Set a timeout to remove the notification after a specified duration
    setTimeout(() => {
        notification.classList.add('slide-out'); // Add a class for slide-out animation
        setTimeout(() => {
            notification.remove(); // Remove the notification from the DOM
        }, 500); // Wait for the animation to finish before removing
    }, 5000); // Display for 10 seconds
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


function getCallToAction(eventName) {
    switch (eventName) {
        case "Ryder Saying Nigger Warning":
            return "Go kiss a black man!";
        case "James Pettus Being A Pussy Warning":
            return "GET OFF WXTWITTER IMMEDIATELY!!";
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

    // Check if the warning is defined
    if (!warning || !warning.properties) {
        console.error('Warning object is undefined or missing properties:', warning);
        return; // Exit if the warning is not valid
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

fetchWarnings();
updateDashboard();