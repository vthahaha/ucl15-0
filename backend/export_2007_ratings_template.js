import { supabase } from './supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Fetching 2007 players from Supabase...');
  
  let players = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, position, team_id, teams ( name )')
      .eq('ucl_season', 2007)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching players:', error.message);
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

  console.log(`Loaded ${players.length} players for season 2007.`);

  if (players.length === 0) {
    console.log('No players found for season 2007. Ensure you run ingest_2007_season.js --write first.');
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
  let fileContent = 'Champions League 2007-08\n\n';

  sortedTeamNames.forEach(teamName => {
    fileContent += `${teamName} 2007-08\n\n`;

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

  const outputPath = path.join(ratingsDir, '2007-08.txt');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`🎉 ratings template exported successfully to: ${outputPath}`);
}

main().catch(console.error);
