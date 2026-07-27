require('dotenv/config');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Events,
  EmbedBuilder,
} = require('discord.js');

const vicePrincipal = require('./vicePrincipal');

// Global state for multi-step verification
const verificationData = new Map();

// ----------------------------------------------------
// 1. THE COLOR DATABASE (20 Categories, 7 Shades each)
// ----------------------------------------------------
const colorDatabase = {
  red: [
    { label: 'Crimson', value: '#DC143C', emoji: '🩸' },
    { label: 'Ruby', value: '#E0115F', emoji: '♦️' },
    { label: 'Cherry', value: '#D2042D', emoji: '🍒' },
    { label: 'Rose', value: '#FF007F', emoji: '🌹' },
    { label: 'Brick', value: '#B22222', emoji: '🧱' },
    { label: 'Wine', value: '#722F37', emoji: '🍷' },
    { label: 'Blood', value: '#8A0303', emoji: '👺' },
  ],
  blue: [
    { label: 'Navy', value: '#000080', emoji: '⚓' },
    { label: 'Royal', value: '#4169E1', emoji: '👑' },
    { label: 'Ocean', value: '#00BFFF', emoji: '🌊' },
    { label: 'Sky', value: '#87CEEB', emoji: '☁️' },
    { label: 'Azure', value: '#007FFF', emoji: '🌀' },
    { label: 'Cobalt', value: '#0047AB', emoji: '🧿' },
    { label: 'Sapphire', value: '#0F52BA', emoji: '💎' },
  ],
  green: [
    { label: 'Forest', value: '#228B22', emoji: '🌲' },
    { label: 'Emerald', value: '#50C878', emoji: '❇️' },
    { label: 'Lime', value: '#32CD32', emoji: '🍋' },
    { label: 'Mint', value: '#98FF98', emoji: '🍃' },
    { label: 'Olive', value: '#808000', emoji: '🫒' },
    { label: 'Sage', value: '#8A9A5B', emoji: '🌿' },
    { label: 'Hunter', value: '#355E3B', emoji: '🐍' },
  ],
  purple: [
    { label: 'Amethyst', value: '#9966CC', emoji: '🔮' },
    { label: 'Lavender', value: '#E6E6FA', emoji: '🪻' },
    { label: 'Plum', value: '#DDA0DD', emoji: '🍇' },
    { label: 'Grape', value: '#6F2DA8', emoji: '👾' },
    { label: 'Orchid', value: '#DA70D6', emoji: '🌸' },
    { label: 'Eggplant', value: '#614051', emoji: '🍆' },
    { label: 'Indigo', value: '#4B0082', emoji: '🌌' },
  ],
  pink: [
    { label: 'Hot Pink', value: '#FF69B4', emoji: '💖' },
    { label: 'Bubblegum', value: '#FFC1CC', emoji: '🍬' },
    { label: 'Fuschia', value: '#FF00FF', emoji: '🎆' },
    { label: 'Blush', value: '#DE5D83', emoji: '😳' },
    { label: 'Watermelon', value: '#FC6C85', emoji: '🍉' },
    { label: 'Flamingo', value: '#FC8EAC', emoji: '🦩' },
    { label: 'Salmon', value: '#FA8072', emoji: '🍣' },
  ],
  orange: [
    { label: 'Tangerine', value: '#F28500', emoji: '🍊' },
    { label: 'Amber', value: '#FFBF00', emoji: '🍯' },
    { label: 'Carrot', value: '#ED9121', emoji: '🥕' },
    { label: 'Tiger', value: '#FD6A02', emoji: '🐅' },
    { label: 'Rust', value: '#B7410E', emoji: '🍁' },
    { label: 'Bronze', value: '#CD7F32', emoji: '🥉' },
    { label: 'Mango', value: '#F4BB44', emoji: '🥭' },
  ],
  yellow: [
    { label: 'Lemon', value: '#FFF700', emoji: '🍋' },
    { label: 'Gold', value: '#FFD700', emoji: '⭐' },
    { label: 'Mustard', value: '#FFDB58', emoji: '🌭' },
    { label: 'Banana', value: '#FFE135', emoji: '🍌' },
    { label: 'Butter', value: '#FFFDD0', emoji: '🧈' },
    { label: 'Honey', value: '#FFC30B', emoji: '🐝' },
    { label: 'Sunflower', value: '#FFDA03', emoji: '🌻' },
  ],
  teal: [
    { label: 'Aqua', value: '#00FFFF', emoji: '💧' },
    { label: 'Turquoise', value: '#40E0D0', emoji: '🪼' },
    { label: 'Cyan', value: '#00FFFF', emoji: '💠' },
    { label: 'Peacock', value: '#33A1C9', emoji: '🦚' },
    { label: 'Sea', value: '#2E8B57', emoji: '🐢' },
    { label: 'Lagoon', value: '#4C9A2A', emoji: '🏝️' },
    { label: 'Teal', value: '#008080', emoji: '🍵' },
  ],
  brown: [
    { label: 'Chocolate', value: '#7B3F00', emoji: '🍫' },
    { label: 'Mocha', value: '#492000', emoji: '☕' },
    { label: 'Caramel', value: '#FFD59A', emoji: '🍮' },
    { label: 'Walnut', value: '#773F1A', emoji: '🌰' },
    { label: 'Chestnut', value: '#954535', emoji: '🪵' },
    { label: 'Coffee', value: '#6F4E37', emoji: '🤎' },
    { label: 'Cinnamon', value: '#D2691E', emoji: '🍂' },
  ],
  gray: [
    { label: 'Slate', value: '#708090', emoji: '🪨' },
    { label: 'Ash', value: '#B2BEB5', emoji: '🌋' },
    { label: 'Charcoal', value: '#36454F', emoji: '🎱' },
    { label: 'Silver', value: '#C0C0C0', emoji: '🥈' },
    { label: 'Smoke', value: '#738276', emoji: '💨' },
    { label: 'Iron', value: '#A19D94', emoji: '⚓' },
    { label: 'Graphite', value: '#383838', emoji: '✏️' },
  ],
  pastel_warm: [
    { label: 'Pastel Red', value: '#FF6961', emoji: '🎨' },
    { label: 'Pastel Orange', value: '#FFB347', emoji: '🎨' },
    { label: 'Pastel Yellow', value: '#FDFD96', emoji: '🎨' },
    { label: 'Pastel Peach', value: '#FFDAB9', emoji: '🎨' },
    { label: 'Pastel Pink', value: '#FFD1DC', emoji: '🎨' },
    { label: 'Pastel Rose', value: '#F4C2C2', emoji: '🎨' },
    { label: 'Pastel Coral', value: '#F88379', emoji: '🎨' },
  ],
  pastel_cool: [
    { label: 'Pastel Blue', value: '#AEC6CF', emoji: '❄️' },
    { label: 'Pastel Green', value: '#77DD77', emoji: '❄️' },
    { label: 'Pastel Purple', value: '#B39EB5', emoji: '❄️' },
    { label: 'Pastel Mint', value: '#AAF0D1', emoji: '❄️' },
    { label: 'Pastel Aqua', value: '#B0E0E6', emoji: '❄️' },
    { label: 'Pastel Indigo', value: '#7B68EE', emoji: '❄️' },
    { label: 'Pastel Teal', value: '#87CEFA', emoji: '❄️' },
  ],
  neon: [
    { label: 'Neon Green', value: '#39FF14', emoji: '🔋' },
    { label: 'Neon Pink', value: '#FF10F0', emoji: '🎸' },
    { label: 'Neon Blue', value: '#1F51FF', emoji: '⚡' },
    { label: 'Neon Yellow', value: '#E0E722', emoji: '⚠️' },
    { label: 'Neon Orange', value: '#FF5F1F', emoji: '🔥' },
    { label: 'Neon Purple', value: '#BC13FE', emoji: '👾' },
    { label: 'Neon Cyan', value: '#0FF0FC', emoji: '🥏' },
  ],
  cyberpunk: [
    { label: 'Synthwave', value: '#FF007F', emoji: '🕹️' },
    { label: 'Matrix', value: '#00FF41', emoji: '💻' },
    { label: 'Hologram', value: '#F0F8FF', emoji: '💽' },
    { label: 'Laser', value: '#FF0055', emoji: '🔫' },
    { label: 'Plasma', value: '#00FFFF', emoji: '🧬' },
    { label: 'Neon City', value: '#8A2BE2', emoji: '🌃' },
    { label: 'Overdrive', value: '#FF4500', emoji: '🏎️' },
  ],
  oceanic: [
    { label: 'Deep Sea', value: '#00008B', emoji: '🐋' },
    { label: 'Coral Reef', value: '#FF7F50', emoji: '🪸' },
    { label: 'Seaweed', value: '#2E8B57', emoji: '🌿' },
    { label: 'Tide', value: '#4682B4', emoji: '🌊' },
    { label: 'Abyss', value: '#00005C', emoji: '🦑' },
    { label: 'Foam', value: '#F0FFFF', emoji: '🫧' },
    { label: 'Wave', value: '#5F9EA0', emoji: '🏄' },
  ],
  sunset: [
    { label: 'Dusk', value: '#4B3621', emoji: '🌆' },
    { label: 'Twilight', value: '#E6E6FA', emoji: '🌇' },
    { label: 'Horizon', value: '#FF7E00', emoji: '🌅' },
    { label: 'Sundown', value: '#FD5E53', emoji: '🌞' },
    { label: 'Golden Hour', value: '#FFDF00', emoji: '✨' },
    { label: 'Crimson Sky', value: '#990000', emoji: '☁️' },
    { label: 'Evening', value: '#696969', emoji: '🌙' },
  ],
  jewel: [
    { label: 'Ruby', value: '#E0115F', emoji: '💍' },
    { label: 'Sapphire', value: '#0F52BA', emoji: '💍' },
    { label: 'Emerald', value: '#50C878', emoji: '💍' },
    { label: 'Amethyst', value: '#9966CC', emoji: '💍' },
    { label: 'Topaz', value: '#FFC87C', emoji: '💍' },
    { label: 'Onyx', value: '#353839', emoji: '💍' },
    { label: 'Garnet', value: '#733635', emoji: '💍' },
  ],
  earth: [
    { label: 'Clay', value: '#B66A50', emoji: '🏺' },
    { label: 'Sand', value: '#C2B280', emoji: '🏜️' },
    { label: 'Dirt', value: '#9B7653', emoji: '🌱' },
    { label: 'Moss', value: '#8A9A5B', emoji: '🪨' },
    { label: 'Bark', value: '#402905', emoji: '🌳' },
    { label: 'Stone', value: '#877F6C', emoji: '🗿' },
    { label: 'Terracotta', value: '#E2725B', emoji: '🧱' },
  ],
  goth: [
    { label: 'Vampire', value: '#800000', emoji: '🧛' },
    { label: 'Midnight', value: '#191970', emoji: '🦇' },
    { label: 'Raven', value: '#050301', emoji: '⬛' },
    { label: 'Cobweb', value: '#B6B6B4', emoji: '🕸️' },
    { label: 'Poison', value: '#8A2BE2', emoji: '☠️' },
    { label: 'Blood Moon', value: '#FE4164', emoji: '🩸' },
    { label: 'Obsidian', value: '#020403', emoji: '🖤' },
  ],
  royal: [
    { label: 'Majestic Blue', value: '#003366', emoji: '👑' },
    { label: 'Imperial Red', value: '#ED2939', emoji: '⚜️' },
    { label: 'Regal Purple', value: '#522D80', emoji: '🏰' },
    { label: 'Crown Gold', value: '#D4AF37', emoji: '🛡️' },
    { label: 'Velvet', value: '#800B47', emoji: '🪑' },
    { label: 'Palace', value: '#F9E5BC', emoji: '🏛️' },
    { label: 'Monarch', value: '#8B0000', emoji: '⚔️' },
  ],
};

const categoryEmojis = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  purple: '🟣',
  pink: '🩷',
  orange: '🟠',
  yellow: '🟡',
  teal: '🩵',
  brown: '🤎',
  gray: '🩶',
  pastel_warm: '🎨',
  pastel_cool: '❄️',
  neon: '⚡',
  cyberpunk: '🕹️',
  oceanic: '🌊',
  sunset: '🌅',
  jewel: '💎',
  earth: '🌱',
  goth: '🖤',
  royal: '👑',
};

function formatCategoryName(key) {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Startup Setup
client.once(Events.ClientReady, async () => {
  console.log('Bot is online and ready!');

  // Initialize AI for Vice Principal persona
  if (vicePrincipal && typeof vicePrincipal.initAI === 'function') {
    vicePrincipal.initAI();
  }

  // 1. Verification Channel Setup
  const verifyChannelId = process.env.VERIFY_CHANNEL_ID || '1530078863621881946';
  try {
    const channel = await client.channels.fetch(verifyChannelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎓 Student Verification & Customization')
          .setDescription('Welcome to the server! Click the buttons below to verify your details or pick your custom name color.')
          .setColor('#3498DB');

        const verifyBtn = new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel('Start Verification')
          .setStyle(ButtonStyle.Primary);

        const colorBtn = new ButtonBuilder()
          .setCustomId('pick_color_button')
          .setLabel('Pick Name Color')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(verifyBtn, colorBtn);

        await channel.send({
          embeds: [embed],
          components: [row],
        });
        console.log('Verification prompt message sent in verification channel.');
      }
    } else {
      console.warn(`Verification channel (${verifyChannelId}) not found or is not text-based.`);
    }
  } catch (error) {
    console.error('Error setting up verification channel prompt:', error);
  }

  // 2. Color Roles Channel Setup
  const colorChannelId = process.env.COLOR_CHANNEL_ID || '1531094959141163078';
  try {
    const colorChannel = await client.channels.fetch(colorChannelId).catch(() => null);
    if (colorChannel && colorChannel.isTextBased() && colorChannelId !== verifyChannelId) {
      const messages = await colorChannel.messages.fetch({ limit: 10 }).catch(() => new Map());
      if (messages.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎨 Custom Name Color')
          .setDescription('Click the button below to pick a custom name color from 20 unique vibes!')
          .setColor('#9B59B6');

        const colorBtn = new ButtonBuilder()
          .setCustomId('pick_color_button')
          .setLabel('Pick Name Color')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(colorBtn);

        await colorChannel.send({
          embeds: [embed],
          components: [row],
        });
        console.log('Color picker prompt message sent in color roles channel.');
      }
    }
  } catch (error) {
    console.error('Error setting up color roles channel prompt:', error);
  }
});

// Interaction Handling
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ----------------------------------------------------
    // A. INITIAL VERIFICATION BUTTON
    // ----------------------------------------------------
    if (interaction.isButton() && interaction.customId === 'verify_button') {
      const selectYear = new StringSelectMenuBuilder()
        .setCustomId('select_year')
        .setPlaceholder('Select your Year')
        .addOptions([
          { label: '1st Year', value: '1' },
          { label: '2nd Year', value: '2' },
          { label: '3rd Year', value: '3' },
          { label: '4th Year', value: '4' },
        ]);

      const row = new ActionRowBuilder().addComponents(selectYear);

      await interaction.reply({
        content: 'Please select your academic year:',
        components: [row],
        ephemeral: true,
      });
    }

    // ----------------------------------------------------
    // B. CUSTOM COLOR BUTTON TRIGGER (Step 1 Base Category)
    // ----------------------------------------------------
    else if (interaction.isButton() && interaction.customId === 'pick_color_button') {
      const categoryKeys = Object.keys(colorDatabase);

      const baseOptions = categoryKeys.map((key) => ({
        label: formatCategoryName(key),
        value: key,
        emoji: categoryEmojis[key] || '🎨',
      }));

      const baseMenu = new StringSelectMenuBuilder()
        .setCustomId('select_base_color')
        .setPlaceholder('Pick a Color Vibe...')
        .addOptions(baseOptions);

      const row = new ActionRowBuilder().addComponents(baseMenu);

      await interaction.reply({
        content: 'Choose a color category to explore shades:',
        components: [row],
        ephemeral: true,
      });
    }

    // ----------------------------------------------------
    // C. DROPDOWN STEPS
    // ----------------------------------------------------
    else if (interaction.isStringSelectMenu()) {
      // 1. Student Verification Steps
      if (interaction.customId === 'select_year') {
        const selectedYear = interaction.values[0];
        verificationData.set(interaction.user.id, { year: selectedYear });

        const branches = [
          'CSE',
          'CSE-DS',
          'CSE-AIML',
          'CSE-CSBS',
          'CSE-CS',
          'MECH',
          'EVL',
          'EEE',
          'EIE',
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

        const nextBtn = new ButtonBuilder()
          .setCustomId('open_final_modal')
          .setLabel('Enter Name & Section')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(nextBtn);

        await interaction.update({
          content: 'Selection recorded! Click the button below to fill in your name and section:',
          components: [row],
        });
      }

      // 2. Custom Color Flow - Step 1: Base Category Selected
      else if (interaction.customId === 'select_base_color') {
        const base = interaction.values[0];
        const shades = colorDatabase[base];

        if (!shades) {
          return interaction.reply({
            content: 'Selected color category not found.',
            ephemeral: true,
          });
        }

        const categoryName = formatCategoryName(base);

        const shadeOptions = shades.map((s) => {
          const opt = {
            label: s.label,
            value: s.value,
            description: `Hex: ${s.value}`,
          };
          if (s.emoji) opt.emoji = s.emoji;
          return opt;
        });

        const shadeMenu = new StringSelectMenuBuilder()
          .setCustomId('select_shade_color')
          .setPlaceholder(`Choose your ${categoryName} shade...`)
          .addOptions(shadeOptions);

        const row = new ActionRowBuilder().addComponents(shadeMenu);

        await interaction.update({
          content: `Now pick your exact **${categoryName}** shade:`,
          components: [row],
        });
      }

      // 3. Custom Color Flow - Step 2: Shade Selected & Role Assignment
      else if (interaction.customId === 'select_shade_color') {
        const hex = interaction.values[0];
        const roleName = `Color-${hex.toUpperCase()}`;

        // CRITICAL ROLE LOGIC:
        // 1. Remove ANY role starting with "Color-" from member so they don't stack up
        const oldColorRoles = interaction.member.roles.cache.filter((r) => r.name.startsWith('Color-'));
        if (oldColorRoles.size > 0) {
          await interaction.member.roles.remove(oldColorRoles).catch((err) => {
            console.warn(`Could not remove old color roles: ${err.message}`);
          });
        }

        // 2. Check if requested shade role ALREADY EXISTS in the server
        let role = interaction.guild.roles.cache.find((r) => r.name === roleName);

        // 3. If role does NOT exist, create it
        if (!role) {
          role = await interaction.guild.roles.create({
            name: roleName,
            color: hex,
            reason: 'Custom User Color',
          });
        }

        // Elevate the color role position so it displays over Admin/Moderator role colors
        try {
          const me = await interaction.guild.members.fetchMe();
          if (me && me.roles && me.roles.highest && me.roles.highest.position > 1) {
            const targetPos = Math.max(1, me.roles.highest.position - 1);
            if (role.position < targetPos) {
              await role.setPosition(targetPos).catch((posErr) => {
                console.warn(`Could not set role position for ${roleName}:`, posErr.message);
              });
            }
          }
        } catch (e) {
          console.warn('Error fetching bot member for role positioning:', e.message);
        }

        // 4. Give the user the role
        await interaction.member.roles.add(role).catch((err) => {
          console.error('Error assigning color role:', err);
        });

        // 5. Remove the dropdowns and confirm success
        await interaction.update({
          content: `Success! Your name color is officially locked in to \`${hex.toUpperCase()}\`.`,
          components: [],
        });
      }
    }

    // ----------------------------------------------------
    // D. MODAL LAUNCHERS & SUBMISSIONS (VERIFICATION)
    // ----------------------------------------------------
    else if (interaction.isButton() && interaction.customId === 'open_final_modal') {
      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('Student Verification');

      const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setLabel('Full Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your real full name')
        .setRequired(true);

      const sectionInput = new TextInputBuilder()
        .setCustomId('section_input')
        .setLabel('Section (e.g. A, B, C)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. A, B, C')
        .setMaxLength(5)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(nameInput);
      const secondRow = new ActionRowBuilder().addComponents(sectionInput);

      modal.addComponents(firstRow, secondRow);

      await interaction.showModal(modal);
    } else if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
      const name = interaction.fields.getTextInputValue('name_input').trim();
      const section = interaction.fields.getTextInputValue('section_input').trim().toUpperCase();

      const userSelections = verificationData.get(interaction.user.id) || {};
      const year = userSelections.year || '1';
      const branch = userSelections.branch || 'CSE';
      const gender = userSelections.gender || 'Male';

      const yearMap = {
        '1': '1st year',
        '2': '2nd year',
        '3': '3rd year',
        '4': '4th year',
      };

      const yearRoleName = yearMap[year] || `${year} year`;
      const branchSectionRoleName = `${branch}-${section}`;
      const genderRoleName = gender;

      const getOrCreateRole = async (roleName, isHoisted = false) => {
        let role = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          role = await interaction.guild.roles.create({
            name: roleName,
            hoist: isHoisted,
            reason: 'Verification role auto-created',
          });
        }
        return role;
      };

      const yearRole = await getOrCreateRole(yearRoleName, true);
      const branchSectionRole = await getOrCreateRole(branchSectionRoleName, false);
      const genderRole = await getOrCreateRole(genderRoleName, false);
      const verifiedRole = await getOrCreateRole('Verified', false);

      await interaction.member.roles.add([yearRole, branchSectionRole, genderRole, verifiedRole]).catch((err) => {
        console.error('Error assigning roles:', err);
      });

      // Update server nickname to provided name
      await interaction.member.setNickname(name).catch((err) => {
        console.warn(`Could not set nickname for ${interaction.user.tag}:`, err.message);
      });

      await interaction.reply({
        content: 'Verified successfully! Welcome to the server.',
        ephemeral: true,
      });

      // Clean up map
      verificationData.delete(interaction.user.id);
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

// Vice Principal Bot Event Handlers
client.on(Events.MessageCreate, (message) => {
  if (vicePrincipal && typeof vicePrincipal.handleMessage === 'function') {
    vicePrincipal.handleMessage(message, client);
  }
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (vicePrincipal && typeof vicePrincipal.handleVoiceStateUpdate === 'function') {
    vicePrincipal.handleVoiceStateUpdate(oldState, newState, client);
  }
});

// Bot Login
client.login(process.env.DISCORD_TOKEN);
