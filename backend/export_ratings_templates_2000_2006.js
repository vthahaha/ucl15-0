import { supabase } from './supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportSeasonTemplate(season) {
  const displaySeason = `${season}-${String(season + 1).slice(-2)}`;
  console.log(`Fetching ${displaySeason} players from Supabase...`);
  
  let players = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, position, team_id, teams ( name )')
      .eq('ucl_season', season)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error(`Error fetching players for season ${season}:`, error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      players = players.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`Loaded ${players.length} players for season ${displaySeason}.`);

  if (players.length === 0) {
    console.log(`No players found for season ${displaySeason}. Skipping export.`);
    return;
  }

  // Group players by team
  const teamsData = {};
  players.forEach(p => {
    const teamName = p.teams?.name || 'Unknown';
    if (!teamsData[teamName]) {
      teamsData[teamName] = [];
    }
    teamsData[teamName].push(p);
  });

  // Sort teams alphabetically
  const sortedTeamNames = Object.keys(teamsData).sort();

  // Construct file content
  let fileContent = `Champions League ${displaySeason}\n\n`;

  sortedTeamNames.forEach(teamName => {
    fileContent += `${teamName} ${displaySeason}\n\n`;

    const teamPlayers = teamsData[teamName];
    // Sort players alphabetically
    teamPlayers.sort((a, b) => a.name.localeCompare(b.name));

    teamPlayers.forEach(p => {
      fileContent += `[${p.position}] ${p.name}: \n\n`;
    });

    fileContent += '\n'; // Extra blank line between teams
  });

  // Clean up double blank lines at the end
  fileContent = fileContent.trim() + '\n';

  const ratingsDir = path.resolve(__dirname, '..', 'Ratings');
  if (!fs.existsSync(ratingsDir)) {
    fs.mkdirSync(ratingsDir, { recursive: true });
  }

  const outputPath = path.join(ratingsDir, `${displaySeason}.txt`);
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`🎉 Ratings template exported successfully to: ${outputPath}`);
}

async function main() {
  const seasons = [2000, 2001, 2002, 2003, 2004, 2005, 2006];
  for (const season of seasons) {
    await exportSeasonTemplate(season);
  }
  console.log('🎉 ALL EXPORTS COMPLETED!');
}

main().catch(console.error);
