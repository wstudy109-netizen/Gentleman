require('dotenv/config');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(process.env.VERIFY_CHANNEL_ID);
    const guild = channel.guild;

    console.log('Fetching all server members...');
    await guild.members.fetch();
    const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');

    if (!verifiedRole) {
      console.error('ERROR: Verified role not found.');
      return;
    }

    const yearRoles = ['1st year', '2nd year', '3rd year', '4th year'];
    const genderRoles = ['Male', 'Female', 'Other'];
    const branchPrefixes = ['CSE', 'ECE', 'EEE', 'EIE', 'EVL', 'MECH', 'IT', 'CIVIL'];

    let updatedCount = 0;

    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;

      const hasStudentRole = member.roles.cache.some((r) => {
        if (yearRoles.includes(r.name)) return true;
        if (genderRoles.includes(r.name)) return true;
        if (branchPrefixes.some((prefix) => r.name.startsWith(prefix + '-'))) return true;
        return false;
      });

      if (hasStudentRole && !member.roles.cache.has(verifiedRole.id)) {
        await member.roles.add(verifiedRole);
        console.log('Granted Verified role to: ' + member.user.tag + ' (' + member.displayName + ')');
        updatedCount++;
      }
    }

    console.log('DONE: Total existing members updated with Verified role: ' + updatedCount);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
