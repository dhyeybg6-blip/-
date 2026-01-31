const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalFollow = goals.GoalFollow;
const express = require('express'); // <-- Added Express

const numberOfBots = 1; 
const botBaseName = 'HolyBot__';
const botPassword = 'DhyeyBG7';
const botOwner = 'DhyeyBG';
const serverHost = 'play.krypticmc.net';
const serverPort = 25565;

// --- TOGGLE SETTINGS ---
const useLoginCommand = false;           
const commandafterlogin = '/server survival'; 

const useGuiClicker = true;            
const hotbarSlotToRightClick = 0;      
const guiSlotToClick = 11;             
const enableStressTestMovement = true; 
const movementRadius = 15;             
// -----------------------

let repeatMode = false;
let autoRaidMode = false;

function getAntiSpam() {
    return ` [${Math.random().toString(36).substring(2, 6)}]`;
}

function createBot(name) {
    console.log(`[${name}] Connecting...`);
    const bot = mineflayer.createBot({
        host: serverHost,
        port: serverPort,
        username: name,
        version: '1.8.8',
        auth: 'offline'
    });

    bot.loadPlugin(pathfinder);

    let guiInteractionLocked = false; 
    let hasRunSpawnLogic = false; 

    bot.on('messagestr', (message) => {
        const msg = message.toLowerCase();
        
        if (msg.includes('/register')) {
            bot.chat(`/register ${botPassword} ${botPassword}`);
        } else if (msg.includes('/login')) {
            bot.chat(`/login ${botPassword}`);
        }
    });

    bot.on('windowOpen', (window) => {
        if (!useGuiClicker || guiInteractionLocked) return;

        guiInteractionLocked = true; 
        console.log(`[${name}] Menu opened. Clicking GUI slot ${guiSlotToClick} (Iron Helmet)...`);
        
        setTimeout(() => {
            if (bot.currentWindow) {
                bot.clickWindow(guiSlotToClick, 0, 0); 
                console.log(`[${name}] Slot ${guiSlotToClick} clicked.`);
            }
        }, 2000);
    });
    
    function startRandomMovement(botInstance, name) {
        if (!enableStressTestMovement || !botInstance.entity || !hasRunSpawnLogic) return;

        botInstance.setControlState('sprint', true);
        
        const swingInterval = setInterval(() => {
            botInstance.swingArm();
        }, 400); 

        botInstance.once('end', () => clearInterval(swingInterval));

        const p = botInstance.entity.position;
        const targetX = p.x + (Math.random() - 0.5) * movementRadius;
        const targetZ = p.z + (Math.random() - 0.5) * movementRadius;
        const targetY = p.y;

        const goal = new goals.GoalNear(targetX, targetY, targetZ, 2); 
        
        botInstance.pathfinder.setGoal(goal);

        setTimeout(() => startRandomMovement(botInstance, name), 5000); 
    }


    bot.on('spawn', () => {
        console.log(`[${name}] Spawned!`);

        if (hasRunSpawnLogic) return;
        hasRunSpawnLogic = true;

        guiInteractionLocked = false; 
        const defaultMovements = new Movements(bot);
        bot.pathfinder.setMovements(defaultMovements);

        if (useLoginCommand) {
            console.log(`[${name}] Sending login command...`);
            bot.chat(commandafterlogin);
        }

        setTimeout(() => {
             if (enableStressTestMovement) {
                 startRandomMovement(bot, name);
             }
        }, useGuiClicker ? 4000 : 1000); 

        if (useGuiClicker) {
            setTimeout(() => {
                console.log(`[${name}] Selecting hotbar slot ${hotbarSlotToRightClick} and right-clicking...`);
                bot.setQuickBarSlot(hotbarSlotToRightClick); 
                bot.activateItem(); 
            }, 1500);
        }
    });

    bot.on('chat', (username, message) => {
        if (username !== botOwner) return;
        if (message === '!start') { repeatMode = true; bot.chat(`Enabled${getAntiSpam()}`); }
        if (message === '!stop') { repeatMode = false; autoRaidMode = false; bot.chat(`Disabled${getAntiSpam()}`); }
        if (message === '!auto') { autoRaidMode = true; startAutoRaid(bot); }
        if (message === '!come') {
            const target = bot.players[botOwner]?.entity;
            if (target) bot.pathfinder.setGoal(new GoalFollow(target, 1), true);
        }
    });

    bot.on('error', (err) => console.log(`[${name}] Error: ${err.message}`));
    bot.on('kicked', (reason) => console.log(`[${name}] Kicked: ${reason}`));
    
    bot.on('end', () => {
        console.log(`[${name}] Reconnecting in 10s...`);
        guiInteractionLocked = false; 
        hasRunSpawnLogic = false; 
        setTimeout(() => createBot(name), 10000);
    });
}

function startAutoRaid(botInstance) {
    if (!autoRaidMode) return;
    botInstance.chat(`Get Raided By Sprite! ${getAntiSpam()}`);
    setTimeout(() => startAutoRaid(botInstance), 2000); 
}

for (let i = 1; i <= numberOfBots; i++) {
    setTimeout(() => createBot(`${botBaseName}${i}`), i * 5000);
}


// --- Keep Alive Web Server for Render ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).send('Bot is running and kept alive.');
});

app.listen(port, () => {
  console.log(`Keep-alive web server listening on port ${port}`);
});
