// Browser-friendly XMPP client using stanza.io (XMPP global)
function startXmppClient(onAlertReceived) {
    const xmpp = XMPP.createClient({
        jid: 'ryder.moesta@weather.gov',
        password: '[REDACTED]',
        server: 'nwws-oi.weather.gov',
        transport: 'websocket'
    });

    const ROOM_JID = 'nwws@conference.nwws-oi.weather.gov';
    const NICKNAME = 'ryder.moesta';

    xmpp.on('session:started', () => {
        console.log('✅ XMPP session started.');
        xmpp.sendPresence({ to: `${ROOM_JID}/${NICKNAME}` });
        xmpp.joinRoom(ROOM_JID, NICKNAME);
    });

    xmpp.on('groupchat', (message) => {
        try {
            const warning = parseXmppMessage(message);
            if (warning) {
                console.log('📩 Received warning:', warning);
                onAlertReceived(warning);
                showNotification(warning);
                updateDashboard();
            }
        } catch (err) {
            console.error('❌ Error handling XMPP message:', err);
        }
    });

    xmpp.on('disconnected', () => {
        console.warn('⚠️ XMPP disconnected. Attempting reconnect...');
        xmpp.connect().catch(console.error);
    });

    xmpp.on('stream:error', (err) => {
        console.error('🚨 XMPP stream error:', err);
    });

    xmpp.connect().catch((err) => {
        console.error('❌ Failed to connect to XMPP:', err);
    });
}

function parseXmppMessage(message) {
    const event = message.getChildText('event');
    const areaDesc = message.getChildText('areaDesc');
    const expires = message.getChildText('expires');

    if (event && areaDesc) {
        return { event, areaDesc, expires };
    }

    return null;
}

function getDamageThreat(stanza) {
    const valueNames = stanza.getChildren('valueName');
    const values = stanza.getChildren('value');

    for (let i = 0; i < valueNames.length; i++) {
        const name = valueNames[i].textContent;
        const value = values[i]?.textContent;

        if (name === 'tornadoDamageThreat' || name === 'thunderstormDamageThreat') {
            return value;
        }
    }

    return null;
}

function tacticalMode() {
    console.log('🛰️ Initializing XMPP Tactical Mode');
    document.body.classList.add('tactical-mode');

    const handleXmppAlert = (warning) => {
        activeWarnings.push({ properties: warning });
        showNotification(warning);
        updateDashboard();
    };

    startXmppClient(handleXmppAlert);

    const alertBar = document.getElementById('alertBar');
    const alertText = document.getElementById('highestAlertText');

    alertText.textContent = 'XMPP TACTICAL MODE ACTIVE';
    alertBar.style.backgroundColor = '#1F2593';

    setTimeout(updateAlertBar, 3000);

    return true;
}

// Activate tactical mode on button click
document.getElementById('tacticalModeButton').addEventListener('click', () => {
    tacticalMode();
    setInterval(fetchWarnings, 3000); // If fetchWarnings is already defined
});
