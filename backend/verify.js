import { supabase } from './supabaseClient.js';

async function verify() {
  console.log('Verifying Supabase database insertion...');

  try {
    // 1. Check Teams Count
    const { count: teamCount, error: teamError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true });

    if (teamError) throw teamError;
    console.log(`✅ Total teams: ${teamCount}`);

    // 2. Check Team Seasons Count
    const { count: tsCount, error: tsError } = await supabase
      .from('team_seasons')
      .select('*', { count: 'exact', head: true });

    if (tsError) throw tsError;
    console.log(`✅ Total team-season entries: ${tsCount}`);

    // 3. Check Players Count
    const { count: playerCount, error: playerError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (playerError) throw playerError;
    console.log(`✅ Total players: ${playerCount}`);

    // 4. Print Team Seasons breakdown
    const { data: seasonsData, error: seasonsError } = await supabase
      .from('team_seasons')
      .select('season');

    if (seasonsError) throw seasonsError;
    const seasonCounts = {};
    seasonsData.forEach((ts) => {
      seasonCounts[ts.season] = (seasonCounts[ts.season] || 0) + 1;
    });
    console.log('\nTeams by Season breakdown:');
    Object.keys(seasonCounts).sort().forEach((s) => {
      console.log(`  - Season ${s}/${parseInt(s)+1}: ${seasonCounts[s]} teams`);
    });

    // 5. Get top 10 players by rating
    const { data: topPlayers, error: topError } = await supabase
      .from('players')
      .select(`
        name,
        rating,
        position,
        ucl_season,
        teams ( name )
      `)
      .order('rating', { ascending: false })
      .limit(10);

    if (topError) throw topError;
    console.log('\nTop 10 rated players in the Database:');
    topPlayers.forEach((p, idx) => {
      const teamName = p.teams?.name || 'Unknown';
      console.log(`  ${idx + 1}. ${p.name} (${p.position}) - OVR: ${p.rating} | Season: ${p.ucl_season} | Team: ${teamName}`);
    });

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verify();
