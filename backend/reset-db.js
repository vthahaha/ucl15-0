import { supabase } from './supabaseClient.js';

async function reset() {
  console.log('Starting Supabase database wipe...');
  try {
    const { error: pErr } = await supabase.from('players').delete().gt('id', 0);
    if (pErr) throw pErr;
    console.log('Deleted all players.');

    const { error: tsErr } = await supabase.from('team_seasons').delete().gt('season', 0);
    if (tsErr) throw tsErr;
    console.log('Deleted all team seasons.');

    const { error: tErr } = await supabase.from('teams').delete().gt('id', 0);
    if (tErr) throw tErr;
    console.log('Deleted all teams.');

    console.log('✨ Database reset successfully!');
  } catch (err) {
    console.error('❌ Error resetting database:', err.message);
  }
}

reset();
