import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabaseClient.js';
import axios from 'axios';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Helper: Translate era names to start/end seasons
const getEraRange = (era) => {
  switch (era) {
    case '2000s':
      return { start: 2000, end: 2009 };
    case '2010s':
      return { start: 2010, end: 2019 };
    case '2020s':
      return { start: 2020, end: 2025 };
    default: // All-Time
      return { start: 1992, end: 2025 };
  }
};

// 1. GET /api/teams
// Fetches all seeded teams for a specific era with calculated team ratings
app.get('/api/teams', async (req, res) => {
  try {
    const { era } = req.query;
    const { start, end } = getEraRange(era);

    const { data, error } = await supabase
      .from('team_seasons')
      .select('season, teams (id, name, logo_url)')
      .gte('season', start)
      .lte('season', end);

    if (error) throw error;

    // Map each team participation to a unique team-season object
    const teamSeasons = [];
    data.forEach((item) => {
      if (item.teams) {
        teamSeasons.push({
          id: item.teams.id,
          name: `${item.teams.name} (${item.season})`, // E.g. "Manchester City (2024)"
          logo_url: item.teams.logo_url,
          season: item.season,
          rating: 78 // Default starting rating, will be recalculated dynamically by the frontend
        });
      }
    });

    teamSeasons.sort((a, b) => a.name.localeCompare(b.name));
    res.json(teamSeasons);
  } catch (err) {
    console.error('Error fetching teams:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/players
// Fetches players filterable by team, era/season, position, and search query
app.get('/api/players', async (req, res) => {
  try {
    const { teamId, era, generic_position, search, season } = req.query;

    let query = supabase
      .from('players')
      .select('*, teams (id, name, logo_url)');

    if (season) {
      query = query.eq('ucl_season', parseInt(season, 10));
    } else if (era) {
      const { start, end } = getEraRange(era);
      query = query.gte('ucl_season', start).lte('ucl_season', end);
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (generic_position) {
      query = query.eq('generic_position', generic_position);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Sort by rating descending
    query = query.order('rating', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching players:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/players/batch
// Fetches player rosters for a list of team IDs in a batch call, optionally filtering by era/seasons
app.get('/api/players/batch', async (req, res) => {
  try {
    const { teamIds, era, teamSeasons } = req.query;
    if (!teamIds && !teamSeasons) {
      return res.status(400).json({ error: 'Either teamIds or teamSeasons is required' });
    }

    // Fetch all players using pagination to bypass Supabase's 1000-row limit
    const allPlayers = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('players')
        .select('name, team_id, ucl_season, rating, generic_position')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (teamSeasons) {
        const pairs = teamSeasons.split(',').map(p => {
          const [teamId, season] = p.split(':');
          return { teamId: parseInt(teamId, 10), season: parseInt(season, 10) };
        });
        const validPairs = pairs.filter(p => !isNaN(p.teamId) && !isNaN(p.season));
        if (validPairs.length > 0) {
          const orFilter = validPairs.map(p => `and(team_id.eq.${p.teamId},ucl_season.eq.${p.season})`).join(',');
          query = query.or(orFilter);
        } else {
          return res.status(400).json({ error: 'Invalid teamSeasons format' });
        }
      } else {
        const teamIdList = teamIds.split(',').map(id => parseInt(id, 10));
        query = query.in('team_id', teamIdList);
        if (era) {
          const { start, end } = getEraRange(era);
          query = query.gte('ucl_season', start).lte('ucl_season', end);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      allPlayers.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    res.json(allPlayers);
  } catch (err) {
    console.error('Error fetching batch players:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/seed
// Trigger a seed run for a specific season via API
app.post('/api/seed', async (req, res) => {
  try {
    const { season } = req.body;
    if (!season || isNaN(season)) {
      return res.status(400).json({ error: 'Valid season parameter is required.' });
    }

    // Call seed.js as a child process or respond that seed is initiated.
    // For local development, we can run it asynchronously or inline.
    // Let's trigger a command line run of seed.js via child_process so it runs in background
    const { exec } = await import('child_process');
    const child = exec(`node seed.js --seasons=${season}`);
    
    child.stdout.on('data', (data) => {
      console.log(`[Seed Log]: ${data.trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[Seed Error]: ${data.trim()}`);
    });

    res.json({ message: `Seeding started in background for season ${season}. Check server logs for progress.` });
  } catch (err) {
    console.error('Error starting seed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 UEFA Champions League Draft Backend listening on port ${PORT}`);
});
