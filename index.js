const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');
const https = require('https'); // Use built-in https, no install needed

// --- CONFIG ---
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const DATA_FILE = './database.json';
const PING_URL = 'https://saveinfo.onrender.com'; // CHANGE THIS

// --- WEB SERVER ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Online!'));
app.listen(process.env.PORT || 3000, () => console.log('Server started.'));

// --- SELF-PING EVERY 5 SECONDS ---
setInterval(() => {
    https.get(PING_URL, (res) => {
        console.log(`Self-ping status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error('Ping failed. Make sure PING_URL is correct.');
    });
}, 5000); // 5000ms = 5 seconds

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
        console.log('Slash commands loaded.');
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
            .setColor('#FF0000');

        const items = data.slice(start, start + 10).map((it, i) => 
            `**ID:** \`${start + i + 1}\` | **User:** ${it.user} | **IP:** ${it.ip}`
        ).join('\n');
        
        embed.setDescription(items || 'No entries found.');
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
