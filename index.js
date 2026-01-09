const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');
const axios = require('axios');

// --- CONFIG ---
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const DATA_FILE = './database.json';
const PING_URL = 'https://your-app-name.onrender.com'; // CHANGE THIS TO YOUR RENDER URL

// --- WEB SERVER & SELF-PING ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Online!'));
app.listen(process.env.PORT || 3000, () => {
    console.log('Web server listening for health checks.');
});

// Self-ping every 14 minutes to prevent Render sleep
setInterval(async () => {
    try {
        await axios.get(PING_URL);
        console.log('Self-ping successful: Keeping bot awake.');
    } catch (e) {
        console.error('Self-ping failed (this is normal if URL is not set yet).');
    }
}, 14 * 60 * 1000); 

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

const commands = [
    new SlashCommandBuilder()
        .setName('save')
        .setDescription('Admin only: Save user info')
        .addStringOption(o => o.setName('ip').setDescription('IP').setRequired(true))
        .addStringOption(o => o.setName('user').setDescription('User').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Admin only: Show records')
        .addIntegerOption(o => o.setName('page').setDescription('Page number'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Admin only: Remove by ID')
        .addIntegerOption(o => o.setName('id').setDescription('ID to remove').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Commands Registered');
    } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    let data = JSON.parse(fs.readFileSync(DATA_FILE));

    if (interaction.commandName === 'save') {
        data.push({ ip: interaction.options.getString('ip'), user: interaction.options.getString('user') });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `✅ Saved. ID: ${data.length}`, ephemeral: true });
    }

    if (interaction.commandName === 'list') {
        const page = interaction.options.getInteger('page') || 1;
        const start = (page - 1) * 10;
        if (!data.length) return interaction.reply('List is empty.');

        const embed = new EmbedBuilder()
            .setTitle(`Admin Records - Page ${page}`)
            .setColor('#FF0000')
            .setTimestamp();

        const items = data.slice(start, start + 10).map((it, i) => 
            `**ID:** \`${start + i + 1}\` | **User:** ${it.user} | **IP:** ${it.ip}`
        ).join('\n');
        
        embed.setDescription(items || 'No entries on this page.');
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'remove') {
        const id = interaction.options.getInteger('id');
        if (id < 1 || id > data.length) return interaction.reply({ content: 'Invalid ID', ephemeral: true });

        const deleted = data.splice(id - 1, 1);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `🗑️ Removed #${id} (${deleted[0].user})`, ephemeral: true });
    }
});

client.login(TOKEN);
