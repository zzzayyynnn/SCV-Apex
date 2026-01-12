const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// --- Discord Bot Token ---
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found! Set it in Render Environment Variables!");
  process.exit(1);
}

// --- CHANNEL ID ---
const raidChannelId = "1460195261258268856";

// --- Discord Client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// --- RAID ROTATION (ORDER IS IMPORTANT) ---
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];

// ✅ STARTING PORTAL = INFERNAL
let currentIndex = raids.indexOf("Infernal");
if (currentIndex === -1) currentIndex = 0;

// --- RAID ROLE IDS (UPDATED) ---
const raidRoles = {
  Goblin: "1460200107709300757",
  Igris: "1460200234264039640",
  Infernal: "1460200362970447944",
  Subway: "1460200571746254930",
  Insect: "1460200741678616659",
  Elves: "1460200673185366158",
};

// --- Prevent double posts ---
let lastPostedQuarter = null;

// --- READY ---
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

// --- MAIN LOOP ---
async function checkTimeAndPost() {
  const now = new Date();

  // PH Time (UTC+8)
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // only exact quarter times
  if (second !== 0) return;
  if (![0, 15, 30, 45].includes(minute)) return;

  // unique key per post
  const currentQuarter =
    phTime.getFullYear() +
    String(phTime.getMonth() + 1).padStart(2, "0") +
    String(phTime.getDate()).padStart(2, "0") +
    String(phTime.getHours()).padStart(2, "0") +
    String(minute).padStart(2, "0");

  if (lastPostedQuarter === currentQuarter) return;
  lastPostedQuarter = currentQuarter;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  // --- PORTAL UPDATE (00 & 30) ---
  if (minute === 0 || minute === 30) {
    const currentPortal = raids[currentIndex];
    const nextPortal = raids[(currentIndex + 1) % raids.length];

    const roleId = raidRoles[currentPortal];
    const rolePing = roleId ? `<@&${roleId}>` : "";

    const message = `
🌀 **PORTAL UPDATE** 🌀

🗡️ **Current Portal**
➤ **${currentPortal}**

⏭️ **Next Portal**
➤ **${nextPortal}**

💪 No fear. No retreat. Only victory.

🔔 ${rolePing}
    `;

    await channel.send(message);

    // move to next portal
    currentIndex = (currentIndex + 1) % raids.length;
  }
  // --- REMINDER (15 & 45) ---
  else {
    await channel.send("⏰ **PORTAL Reminder!** Get ready for the next portal!");
  }
}

// --- EXPRESS SERVER (RENDER KEEP-ALIVE) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord Bot is running ✅");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- LOGIN ---
client.login(token);
