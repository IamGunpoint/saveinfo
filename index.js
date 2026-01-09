const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');
const https = require('https');

// --- HARDCODED CONFIG ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = '1430412815730081905'; // Your Server ID
const PING_URL = 'https://saveinfo.onrender.com'; // Your Render URL
const DATA_FILE = './database.json';

const startTime = Date.now();

// --- WEB SERVER ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Online and Pinging!'));
app.listen(process.env.PORT || 3000);

// --- SELF-PING (5 SECONDS) ---
setInterval(() => {
    https.get(PING_URL, (res) => {
        console.log(`Self-Ping Sent: ${res.statusCode}`);
    }).on('error', (e) => console.error('Ping failed - Check if Render URL is correct.'));
}, 5000);

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show commands and bot status'),
    new SlashCommandBuilder()
        .setName('save')
        .setDescription('Admin: Save user info')
        .addStringOption(o => o.setName('ip').setDescription('The IP address').setRequired(true))
        .addStringOption(o => o.setName('user').setDescription('The username').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Admin: Show database')
        .addIntegerOption(o => o.setName('page').setDescription('Page number'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Admin: Delete by ID')
        .addIntegerOption(o => o.setName('id').setDescription('Numeric ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Pushing commands to Guild...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Commands deployed to server 1430412815730081905');
    } catch (e) { console.error(e); }
})();

// --- LOGIC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    let data = JSON.parse(fs.readFileSync(DATA_FILE));

    if (interaction.commandName === 'help') {
        const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
        const embed = new EmbedBuilder()
            .setTitle('Admin Bot Help')
            .setColor('#5865F2')
            .addFields(
                { name: '`/save`', value: 'Add IP & User to list.', inline: true },
                { name: '`/list`', value: 'View the saved data.', inline: true },
                { name: '`/remove`', value: 'Delete an entry by ID.', inline: true },
                { name: 'Bot Status', value: `Uptime: ${uptime} minutes\nPinging: ${PING_URL}` }
            );
        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'save') {
        const ip = interaction.options.getString('ip');
        const user = interaction.options.getString('user');
        data.push({ ip, user });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `✅ **Success!** Saved ${user} at ID: \`${data.length}\``, ephemeral: true });
    }

    if (interaction.commandName === 'list') {
        const page = interaction.options.getInteger('page') || 1;
        const start = (page - 1) * 10;
        if (!data.length) return interaction.reply('The list is empty.');

        const embed = new EmbedBuilder().setTitle(`Records (Page ${page})`).setColor('#FF0000');
        const items = data.slice(start, start + 10).map((it, i) => `**#${start + i + 1}** | **User:** ${it.user} | **IP:** \`${it.ip}\``).join('\n');
        
        embed.setDescription(items || 'No data found on this page.');
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'remove') {
        const id = interaction.options.getInteger('id');
        if (id < 1 || id > data.length) return interaction.reply({ content: '❌ Error: That ID does not exist.', ephemeral: true });

        const removed = data.splice(id - 1, 1);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `🗑️ Deleted ID \`${id}\` (${removed[0].user})`, ephemeral: true });
    }
});

client.login(TOKEN);
