const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');
const https = require('https');

// --- CONFIG ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1430412815730081905'; 
const PING_URL = 'https://saveinfo.onrender.com';
const DATA_FILE = './database.json';

// --- WEB SERVER ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Live'));
app.listen(process.env.PORT || 3000);

// --- SELF-PING ---
setInterval(() => {
    https.get(PING_URL, (res) => console.log(`Ping: ${res.statusCode}`)).on('error', () => {});
}, 5000);

// --- BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

const commands = [
    {
        name: 'help',
        description: 'Show commands'
    },
    {
        name: 'save',
        description: 'Save user info',
        options: [
            { name: 'ip', description: 'IP', type: 3, required: true },
            { name: 'user', description: 'User', type: 3, required: true }
        ],
        default_member_permissions: "8" // Administrator Only
    },
    {
        name: 'list',
        description: 'Show database',
        options: [{ name: 'page', description: 'Page', type: 4, required: false }],
        default_member_permissions: "8"
    },
    {
        name: 'remove',
        description: 'Delete by ID',
        options: [{ name: 'id', description: 'ID', type: 4, required: true }],
        default_member_permissions: "8"
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing slash commands...');
        // This line forces the commands into your specific server
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Successfully reloaded slash commands.');
    } catch (error) {
        console.error('ERROR REGISTERING COMMANDS:', error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    let data = JSON.parse(fs.readFileSync(DATA_FILE));

    if (interaction.commandName === 'help') {
        await interaction.reply({ content: 'Commands: `/save`, `/list`, `/remove`', ephemeral: true });
    }

    if (interaction.commandName === 'save') {
        const ip = interaction.options.getString('ip');
        const user = interaction.options.getString('user');
        data.push({ ip, user });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `✅ Saved ${user} (ID: ${data.length})`, ephemeral: true });
    }

    if (interaction.commandName === 'list') {
        if (!data.length) return interaction.reply('List is empty.');
        const page = interaction.options.getInteger('page') || 1;
        const start = (page - 1) * 10;
        const items = data.slice(start, start + 10).map((it, i) => `#${start + i + 1} | ${it.user} | ${it.ip}`).join('\n');
        await interaction.reply({ content: `**List Page ${page}**\n${items || 'No data.'}` });
    }

    if (interaction.commandName === 'remove') {
        const id = interaction.options.getInteger('id');
        if (id < 1 || id > data.length) return interaction.reply('Invalid ID.');
        const del = data.splice(id - 1, 1);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply(`🗑️ Removed ${del[0].user}`);
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(TOKEN);
