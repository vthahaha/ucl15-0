import { supabase } from './supabaseClient.js';

async function main() {
  console.log('Fetching team seasons...');
  const { data: teamSeasons, error: tsError } = await supabase
    .from('team_seasons')
    .select('team_id, season, teams(name)');

  if (tsError) {
    console.error('Error fetching team seasons:', tsError.message);
    return;
  }

  console.log(`Checking team seasons for players...`);

  // Fetch all players using pagination
  const players = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching players page ${page + 1}...`);
    const { data, error } = await supabase
      .from('players')
      .select('team_id, ucl_season')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching players:', error.message);
      return;
    }

    players.push(...data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`Fetched ${players.length} players in total.`);

  // Count players per team_season
  const playerCountMap = {};
  players.forEach(p => {
    const key = `${p.team_id}|${p.ucl_season}`;
    playerCountMap[key] = (playerCountMap[key] || 0) + 1;
  });

  const emptyTeamSeasons = [];
  const populatedTeamSeasons = [];

  teamSeasons.forEach(ts => {
    const key = `${ts.team_id}|${ts.season}`;
    const count = playerCountMap[key] || 0;
    if (count === 0) {
      emptyTeamSeasons.push({
        team_id: ts.team_id,
        name: ts.teams?.name || 'Unknown',
        season: ts.season
      });
    } else {
      populatedTeamSeasons.push({
        team_id: ts.team_id,
        name: ts.teams?.name || 'Unknown',
        season: ts.season,
        player_count: count
      });
    }
  });

  console.log(`Summary:`);
  console.log(`  - Populated team seasons: ${populatedTeamSeasons.length}`);
  console.log(`  - Empty team seasons: ${emptyTeamSeasons.length}`);

  if (populatedTeamSeasons.length > 0) {
    console.log('\nSample populated team seasons:');
    console.log(populatedTeamSeasons.sort((a, b) => b.player_count - a.player_count).slice(0, 20));
  }

  if (emptyTeamSeasons.length > 0) {
    console.log('\nSample empty team seasons:');
    console.log(emptyTeamSeasons.slice(0, 20));
  }
  // Fetch player names for Bate Borisov (388) and Levski Sofia (646)
  const { data: samplePlayers, error: spError } = await supabase
    .from('players')
    .select('name, team_id, ucl_season')
    .in('team_id', [388, 646])
    .limit(30);

  if (spError) {
    console.error('Error fetching sample players:', spError.message);
    return;
  }

  console.log('\nSample players for Bate Borisov and Levski Sofia from DB:');
  console.log(samplePlayers);
}

main();






