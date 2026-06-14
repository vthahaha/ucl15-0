import { supabase } from './supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Fetching all players from Supabase database...');
  let dbPlayers = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('players')
      .select('name, ucl_season, rating, position, teams ( name )')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching players:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      dbPlayers = dbPlayers.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`Fetched ${dbPlayers.length} total players from Supabase.`);

  // Group players by season
  const playersBySeason = {};
  for (const p of dbPlayers) {
    const season = p.ucl_season;
    
    // Only process seasons 2020-2025
    if (season < 2020 || season > 2025) continue;

    if (!playersBySeason[season]) {
      playersBySeason[season] = [];
    }

    // Reconstruct position array from comma-separated string
    let positionArray = [];
    if (p.position) {
      positionArray = p.position.split(',').map(pos => pos.trim()).filter(Boolean);
    }

    playersBySeason[season].push({
      name: p.name,
      team: p.teams?.name || 'Unknown',
      ucl_season: season,
      rating: String(p.rating),
      position: positionArray
    });
  }

  const dirPath = path.resolve(__dirname, 'players data');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  for (const [seasonStr, seasonPlayers] of Object.entries(playersBySeason)) {
    const season = parseInt(seasonStr, 10);
    const suffix = `${season}${String(season + 1).slice(2)}`;
    const filePath = path.join(dirPath, `players_export_${suffix}.json`);

    // Sort players alphabetically by name (case-insensitive)
    seasonPlayers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const output = {
      total_players: seasonPlayers.length,
      players: seasonPlayers
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ Restored ${seasonPlayers.length} players to: ${filePath}`);
  }

  console.log('\n🎉 ALL JSON FILES RESTORED SUCCESSFULLY FROM SUPABASE!');
}

main().catch(console.error);
