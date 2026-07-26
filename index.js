require('dotenv/config');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
} = require('discord.js');

const vicePrincipal = require('./vicePrincipal');

const verificationData = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log('Bot is online and ready!');
  vicePrincipal.initAI();

  if (!process.env.VERIFY_CHANNEL_ID) {
    console.error('VERIFY_CHANNEL_ID is not set in environment variables.');
    return;
  }

  try {
    const channel = await client.channels.fetch(process.env.VERIFY_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error('Verification channel not found or is not a text channel.');
      return;
    }

    const messages = await channel.messages.fetch({ limit: 10 });
    if (messages.size === 0) {
      const button = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Start Verification')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await channel.send({
        content: 'Welcome! Click the button below to verify your student details and gain access to the server.',
        components: [row],
      });
      console.log('Verification prompt message sent.');
    }
  } catch (error) {
    console.error('Error during ready event verification setup:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === 'verify_button') {
      const selectYear = new StringSelectMenuBuilder()
        .setCustomId('select_year')
        .setPlaceholder('Select your Year')
        .addOptions([
          { label: '1', value: '1' },
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
        ]);

      const row = new ActionRowBuilder().addComponents(selectYear);

      await interaction.reply({
        content: 'Please select your year:',
        components: [row],
        ephemeral: true,
      });
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_year') {
        const selectedYear = interaction.values[0];
        verificationData.set(interaction.user.id, { year: selectedYear });

        const branches = [
          'CSE',
          'CSE-DS',
          'CSE-AIML',
          'CSE-CSBS',
          'CSE-CS',
          'ECE',
          'EEE',
          'EIE',
          'EVL',
          'MECH',
          'IT',
          'CIVIL',
        ];

        const selectBranch = new StringSelectMenuBuilder()
          .setCustomId('select_branch')
          .setPlaceholder('Select your Branch')
          .addOptions(branches.map((b) => ({ label: b, value: b })));

        const row = new ActionRowBuilder().addComponents(selectBranch);

        await interaction.update({
          content: 'Please select your branch:',
          components: [row],
        });
      } else if (interaction.customId === 'select_branch') {
        const selectedBranch = interaction.values[0];
        const data = verificationData.get(interaction.user.id) || {};
        data.branch = selectedBranch;
        verificationData.set(interaction.user.id, data);

        const selectGender = new StringSelectMenuBuilder()
          .setCustomId('select_gender')
          .setPlaceholder('Select Gender')
          .addOptions([
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' },
          ]);

        const row = new ActionRowBuilder().addComponents(selectGender);

        await interaction.update({
          content: 'Please select your gender:',
          components: [row],
        });
      } else if (interaction.customId === 'select_gender') {
        const selectedGender = interaction.values[0];
        const data = verificationData.get(interaction.user.id) || {};
        data.gender = selectedGender;
        verificationData.set(interaction.user.id, data);

        const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

        const selectSection = new StringSelectMenuBuilder()
          .setCustomId('select_section')
          .setPlaceholder('Select your Section')
          .addOptions(sections.map((s) => ({ label: `Section ${s}`, value: s })));

        const row = new ActionRowBuilder().addComponents(selectSection);

        await interaction.update({
          content: 'Please select your section:',
          components: [row],
        });
      } else if (interaction.customId === 'select_section') {
        const section = interaction.values[0];
        const data = verificationData.get(interaction.user.id) || {};
        const year = data.year || '1';
        const branch = data.branch || 'CSE';
        const gender = data.gender || 'Other';

        const yearMap = {
          '1': '1st year',
          '2': '2nd year',
          '3': '3rd year',
          '4': '4th year',
        };
        const yearRoleName = yearMap[year] || `${year} year`;
        const branchSectionRoleName = `${branch}-${section.toUpperCase()}`;
        const genderRoleName = gender;

        const getOrCreateRole = async (roleName, isHoisted = false) => {
          let role = interaction.guild.roles.cache.find((r) => r.name === roleName);
          if (!role) {
            role = await interaction.guild.roles.create({
              name: roleName,
              hoist: isHoisted,
            });
          }
          return role;
        };

        const yearRole = await getOrCreateRole(yearRoleName, true);
        const branchSectionRole = await getOrCreateRole(branchSectionRoleName, false);
        const genderRole = await getOrCreateRole(genderRoleName, false);
        const verifiedRole = await getOrCreateRole('Verified', false);

        await interaction.member.roles.add([yearRole, branchSectionRole, genderRole, verifiedRole]);

        await interaction.update({
          content: 'Verified successfully!',
          components: [],
        });

        verificationData.delete(interaction.user.id);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'There was an error processing your request. Please try again.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, (message) => {
  vicePrincipal.handleMessage(message, client);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  vicePrincipal.handleVoiceStateUpdate(oldState, newState, client);
});

client.login(process.env.DISCORD_TOKEN);
