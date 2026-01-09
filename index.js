const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// --- INSERT YOUR INFO HERE ---
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const DATA_FILE = './database.json';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize database file
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// --- COMMAND REGISTRATION ---
const commands = [
    new SlashCommandBuilder()
        .setName('save')
        .setDescription('Save user info')
        .addStringOption(opt => opt.setName('ip').setDescription('The IP address').setRequired(true))
        .addStringOption(opt => opt.setName('user').setDescription('The username').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Show saved records')
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove by ID')
        .addIntegerOption(opt => opt.setName('id').setDescription('The ID number').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
})();

// --- BOT LOGIC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Load data every time to ensure it is fresh
    let data = JSON.parse(fs.readFileSync(DATA_FILE));

    if (interaction.commandName === 'save') {
        const ip = interaction.options.getString('ip');
        const user = interaction.options.getString('user');
        
        data.push({ ip, user });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        await interaction.reply({ content: `✅ **Saved:** ${user} | **Assigned ID:** ${data.length}`, ephemeral: true });
    }

    if (interaction.commandName === 'list') {
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;
        const start = (page - 1) * perPage;
        
        if (data.length === 0) return interaction.reply('The list is empty.');

        const embed = new EmbedBuilder()
            .setTitle(`Admin List - Page ${page}`)
            .setColor('#ff0000')
            .setTimestamp();

        const items = data.slice(start, start + perPage);
        const listText = items.map((item, index) => {
            return `**ID:** \`${start + index + 1}\` | **User:** ${item.user} | **IP:** ${item.ip}`;
        }).join('\n');

        embed.setDescription(listText || 'No more entries found.');
        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'remove') {
        const id = interaction.options.getInteger('id');
        
        if (id < 1 || id > data.length) {
            return interaction.reply({ content: '❌ Invalid ID. Check `/list` for correct numbers.', ephemeral: true });
        }

        const removed = data.splice(id - 1, 1);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        await interaction.reply({ content: `🗑️ Deleted ID \`${id}\` (User: ${removed[0].user})`, ephemeral: true });
    }
});

client.login(TOKEN);
