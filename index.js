const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

// ================= CONFIG =================
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found!");
  process.exit(1);
}

const raidChannelId = "1464548057067819150";

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ================= RAID ROTATION =================
// Subway → Infernal → Insect → Igris → Demon Castle → Elves → Goblin
const raids = [
  "Subway",
  "Infernal",
  "Insect",
  "Igris",
  "Demon Castle",
  "Elves",
  "Goblin",
];

// 🔥 START SETUP
// First ACTIVE at :00 / :30 = DEMON CASTLE
let currentIndex = raids.indexOf("Demon Castle");
let reminderMessage = null;
let pingSent = false;

// anti-double-post locks
let lastActiveKey = null;
let lastReminderKey = null;

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  "Demon Castle": "https://cdn.discordapp.com/attachments/1410965755742130247/1463577590039183431/image.png",
};

// ================= ROLE IDS =================
const raidRoles = {
  Infernal: "1464695497771192609",
  Igris: "1464698522342392065",
  Insect: "1464696827159773338",
  "Demon Castle": "1464698772557664387",
  Elves: "1464698910110122058",
  Goblin: "1464699108819206298",
  Subway: "1464699199118377075",
};

// ================= FUNCTIONS =================
const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

async function postReminder(channel, dungeon, secondsLeft) {
  pingSent = false;

  const updateEmbed = async () => {
    const red = secondsLeft <= 180;

    const embed = new EmbedBuilder()
      .setColor(red ? 0xff0000 : 0x11162a)
      .setTitle("「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          `⏱️ Starts in: ${formatTime(secondsLeft)}`,
          red ? "🔴 **RED ALERT!**" : "",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[dungeon])
      .setTimestamp();

    if (!reminderMessage) {
      reminderMessage = await channel.send({ embeds: [embed] });
    } else {
      await reminderMessage.edit({ embeds: [embed] });
    }
  };

  await updateEmbed();

  const timer = setInterval(async () => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      clearInterval(timer);
      return;
    }

    if (secondsLeft === 180 && !pingSent && raidRoles[dungeon]) {
      pingSent = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    await updateEmbed();
  }, 1000);
}

// ================= MAIN LOOP =================
async function mainLoop() {
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH time

  const h = ph.getHours();
  const m = ph.getMinutes();
  const s = ph.getSeconds();

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const activeKey = `${h}:${m}:active`;
  const reminderKey = `${h}:${m}:reminder`;

  // ===== ACTIVE DUNGEON (:00 / :30) =====
  if ((m % 30 === 0) && s === 0 && lastActiveKey !== activeKey) {
    lastActiveKey = activeKey;

    const active = raids[currentIndex];
    const upcoming = raids[(currentIndex + 1) % raids.length];

    const embed = new EmbedBuilder()
      .setColor(0x05070f)
      .setTitle("「 SYSTEM — DUNGEON STATUS 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**⚔️ ACTIVE DUNGEON**",
          `> ${active}`,
          "",
          "**➡️ NEXT DUNGEON**",
          `> ${upcoming}`,
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[active])
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    currentIndex = (currentIndex + 1) % raids.length;
    reminderMessage = null;
  }

  // ===== REMINDER (:20 / :50) =====
  if (
    ((m % 30 === 20) || (m % 30 === 50)) &&
    s === 0 &&
    lastReminderKey !== reminderKey
  ) {
    lastReminderKey = reminderKey;

    const upcoming = raids[currentIndex];
    const secondsLeft = 600; // 10 minutes

    if (!reminderMessage) {
      await postReminder(channel, upcoming, secondsLeft);
    }
  }
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`First ACTIVE => ${raids[currentIndex]}`);
  setInterval(mainLoop, 200); // ✅ 5x check
});

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
