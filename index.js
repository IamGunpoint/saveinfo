const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const express = require('express');

// --- CONFIG ---
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const DATA_FILE = './database.json';

// --- RENDER HEALTH CHECK ---
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// --- COMMANDS ---
const commands = [
    new SlashCommandBuilder()
        .setName('save')
        .setDescription('Save info')
        .addStringOption(o => o.setName('ip').setDescription('IP').setRequired(true))
        .addStringOption(o => o.setName('user').setDescription('User').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Show list')
        .addIntegerOption(o => o.setName('page').setDescription('Page'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove by ID')
        .addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Commands Ready');
    } catch (e) { console.error(e); }
})();

// --- LOGIC ---
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
        if (!data.length) return interaction.reply('Empty.');

        const embed = new EmbedBuilder().setTitle(`List P.${page}`).setColor('#FF0000');
        const items = data.slice(start, start + 10).map((it, i) => `\`#${start + i + 1}\` **${it.user}** - ${it.ip}`).join('\n');
        
        embed.setDescription(items || 'No entries.');
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
