import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from './supabaseClient.js';

// Configure dotenv to load from the same directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_PROVIDER = process.env.API_PROVIDER || 'api-sports'; // 'api-sports' or 'rapidapi'
const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com';
const UCL_LEAGUE_ID = parseInt(process.env.UCL_LEAGUE_ID || '2', 10);
const START_SEASON = parseInt(process.env.START_SEASON || '1992', 10);
const END_SEASON = parseInt(process.env.END_SEASON || '2025', 10);

// Determine request configuration dynamically
const isRapidApi = API_PROVIDER === 'rapidapi';
const apiBaseUrl = isRapidApi 
  ? `https://${RAPIDAPI_HOST}/v3` 
  : 'https://v3.football.api-sports.io';

const apiHeaders = isRapidApi 
  ? { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST } 
  : { 'x-apisports-key': API_SPORTS_KEY };

const hasValidKey = isRapidApi ? !!RAPIDAPI_KEY : !!API_SPORTS_KEY;

// Helper function to sleep (to avoid rate limits)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const KNOWN_PLAYERS = {
  // Attackers
  'haaland': 'ST',
  'lewandowski': 'ST',
  'mbappé': 'ST',
  'mbappe': 'ST',
  'kane': 'ST',
  'benzema': 'ST',
  'ronaldo': 'ST',
  'messi': 'RW',
  'neymar': 'LW',
  'vinícius': 'LW',
  'vinicius': 'LW',
  'rodrygo': 'RW',
  'salah': 'RW',
  'saka': 'RW',
  'griezmann': 'ST',
  'osimhen': 'ST',
  'álvarez': 'ST', // Julian
  'alvarez': 'ST',
  'morata': 'ST',
  'giroud': 'ST',
  'lukaku': 'ST',
  'vlahović': 'ST',
  'vlahovic': 'ST',
  'thuram': 'ST',
  'gyökeres': 'ST',
  'gyokeres': 'ST',
  'david': 'ST', // Jonathan David
  'guirassy': 'ST',
  'openda': 'ST',
  'šeško': 'ST',
  'sesko': 'ST',
  'boniface': 'ST',
  'son': 'LW', // Son Heung-min
  'heung-min': 'LW',
  'luis díaz': 'LW',
  'luis diaz': 'LW',
  'leão': 'LW',
  'leao': 'LW',
  'rashford': 'LW',
  'gnabry': 'RW',
  'sané': 'RW',
  'sane': 'RW',
  'coman': 'LW',
  'martinelli': 'LW',
  'dembélé': 'RW',
  'dembele': 'RW',
  'raphinha': 'RW',
  'højlund': 'ST',
  'hojlund': 'ST',
  'nunez': 'ST', // Darwin Nunez
  'núñez': 'ST',
  'diogo jota': 'ST',
  'd. jota': 'ST',
  'guler': 'CAM',
  'güler': 'CAM',
  'yamal': 'RW',

  // Midfielders
  'rodri': 'CDM',
  'rice': 'CDM',
  'tchouaméni': 'CDM',
  'tchouameni': 'CDM',
  'camavinga': 'CM',
  'valverde': 'CM',
  'kroos': 'CM',
  'modrić': 'CM',
  'modric': 'CM',
  'pedri': 'CM',
  'gavi': 'CM',
  'çalhanoğlu': 'CDM',
  'calhanoglu': 'CDM',
  'barella': 'CM',
  'ødegaard': 'CAM',
  'odegaard': 'CAM',
  'bruno fernandes': 'CAM',
  'b. fernandes': 'CAM',
  'bernardo': 'CM', // Bernardo Silva
  'gündoğan': 'CM',
  'gundogan': 'CM',
  'mac allister': 'CM',
  'szoboszlai': 'CAM',
  'gravenberch': 'CDM',
  'foden': 'CAM',
  'bellingham': 'CAM',
  'de bruyne': 'CAM',
  'musiala': 'CAM',
  'wirtz': 'CAM',
  'palhinha': 'CDM',
  'laimer': 'CDM',
  'goretzka': 'CM',
  'casemiro': 'CDM',
  'eriksen': 'CM',
  'mount': 'CAM',
  'mctominay': 'CM',
  'kovacic': 'CM',
  'kovacić': 'CM',
  'jorginho': 'CDM',
  'havertz': 'ST', // Kai Havertz
  'merino': 'CM',
  'partey': 'CDM',

  // Defenders
  'van dijk': 'CB',
  'rüdiger': 'CB',
  'rudiger': 'CB',
  'militão': 'CB',
  'militao': 'CB',
  'dias': 'CB', // Ruben Dias
  'saliba': 'CB',
  'gabriel': 'CB',
  'stones': 'CB',
  'walker': 'RB',
  'carvajal': 'RB',
  'frimpong': 'RB',
  'grimaldo': 'LB',
  'hernández': 'LB', // Theo Hernandez
  'hernandez': 'LB',
  'davies': 'LB',
  'alexander-arnold': 'RB',
  'arnold': 'RB',
  'robertson': 'LB',
  'hakimi': 'RB',
  'nuno mendes': 'LB',
  'mendes': 'LB',
  'white': 'RB', // Ben White
  'jurriën timber': 'CB',
  'jurrien timber': 'CB',
  'j. timber': 'CB',
  'zinchenko': 'LB',
  'kiwior': 'CB',
  'akanji': 'CB',
  'ake': 'CB',
  'aké': 'CB',
  'gvardiol': 'LB',
  'le normand': 'CB',
  'upamecano': 'CB',
  'min-jae': 'CB', // Kim Min-jae
  'kim': 'CB',
  'mazraoui': 'RB',
  'de ligt': 'CB',
  'koundé': 'CB',
  'kounde': 'CB',
  'araujo': 'CB',
  'araújo': 'CB',
  'christensen': 'CB',
  'balde': 'LB',
  'cancelo': 'RB',
  'schlotterbeck': 'CB',
  'hummels': 'CB',
  'maatsen': 'LB',
  'ryerson': 'RB',
  'bastoni': 'CB',
  'acerbi': 'CB',
  'pavard': 'CB',
  'darmian': 'RB',
  'dimarco': 'LB',
  'dumfries': 'RB',

  // Goalkeepers
  'courtois': 'GK',
  'ederson': 'GK',
  'ter stegen': 'GK',
  'neuer': 'GK',
  'oblak': 'GK',
  'donnarumma': 'GK',
  'alisson': 'GK',
  'maignan': 'GK',
  'sommer': 'GK',
  'raya': 'GK',
  'kobel': 'GK',
  'vicario': 'GK',
  'provedel': 'GK',
  'meret': 'GK'
};

function findKnownPosition(playerName, teamName) {
  const nameLower = playerName.toLowerCase();
  const teamLower = teamName ? teamName.toLowerCase() : '';

  // Handle special case: Amadou Onana vs Andre Onana
  if (nameLower.includes('onana')) {
    if (teamLower.includes('villa') || teamLower.includes('lille') || teamLower.includes('everton')) {
      return 'CDM'; // Amadou Onana is a midfielder
    }
    return 'GK'; // Andre Onana is a goalkeeper
  }

  // Handle special case: Emiliano Martínez vs Lautaro Martínez vs Josep Martínez
  if (nameLower.includes('martinez') || nameLower.includes('martínez')) {
    if (nameLower.includes('lautaro') || nameLower.includes('l. mart')) {
      return 'ST'; // Lautaro Martinez is a striker
    }
    if (nameLower.includes('emiliano') || nameLower.includes('e. mart') || teamLower.includes('villa') || teamLower.includes('arsenal')) {
      return 'GK'; // Emiliano Martinez is a goalkeeper
    }
    if (nameLower.includes('josep') || nameLower.includes('j. mart') || teamLower.includes('inter')) {
      return 'GK'; // Josep Martinez is a goalkeeper
    }
  }

  // Handle special case: Luuk de Jong vs Frenkie de Jong
  if (nameLower.includes('de jong')) {
    if (nameLower.includes('frenkie') || nameLower.includes('f. de jong')) {
      return 'CM'; // Frenkie is CM
    }
    if (nameLower.includes('luuk') || nameLower.includes('l. de jong')) {
      return 'ST'; // Luuk is ST
    }
  }

  // Handle special case: Pierre-Gabriel (skip CB override)
  if (nameLower.includes('pierre-gabriel')) {
    return null;
  }

  for (const [key, pos] of Object.entries(KNOWN_PLAYERS)) {
    const regex = new RegExp('\\b' + key + '\\b', 'i');
    if (regex.test(nameLower)) {
      return pos;
    }
  }
  return null;
}

// Helper: Map positions from API-Football to tactical positions
function mapPosition(apiPosition, playerStats, playerName, teamName) {
  // Try known player database first
  const knownPos = findKnownPosition(playerName, teamName);
  if (knownPos) {
    let generic = 'Midfielder';
    if (['GK'].includes(knownPos)) generic = 'Goalkeeper';
    else if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(knownPos)) generic = 'Defender';
    else if (['ST', 'LW', 'RW', 'CF'].includes(knownPos)) generic = 'Attacker';
    
    const posMapped = knownPos === 'CF' ? 'ST' : knownPos;
    return { position: posMapped, generic: generic };
  }

  // Fallback to statistical & probabilistic mapping
  const goals = playerStats.goals?.total || 0;
  const assists = playerStats.goals?.assists || 0;
  const tackles = playerStats.tackles?.total || 0;

  switch (apiPosition) {
    case 'Goalkeeper':
      return { position: 'GK', generic: 'Goalkeeper' };
    
    case 'Defender':
      if (assists > 0) {
        return { position: Math.random() > 0.5 ? 'RB' : 'LB', generic: 'Defender' };
      }
      const randDef = Math.random();
      if (randDef < 0.5) return { position: 'CB', generic: 'Defender' };
      if (randDef < 0.75) return { position: 'LB', generic: 'Defender' };
      return { position: 'RB', generic: 'Defender' };

    case 'Midfielder':
      if (goals > 2 || assists > 2) {
        return { position: 'CAM', generic: 'Midfielder' };
      }
      if (tackles > 8) {
        return { position: 'CDM', generic: 'Midfielder' };
      }
      const randMid = Math.random();
      if (randMid < 0.35) return { position: 'CDM', generic: 'Midfielder' };
      if (randMid < 0.8) return { position: 'CM', generic: 'Midfielder' };
      return { position: 'CAM', generic: 'Midfielder' };

    case 'Attacker':
      if (goals > 0 && goals >= assists) {
        return { position: 'ST', generic: 'Attacker' };
      }
      const randAtt = Math.random();
      if (randAtt < 0.45) return { position: 'ST', generic: 'Attacker' };
      if (randAtt < 0.725) return { position: 'LW', generic: 'Attacker' };
      return { position: 'RW', generic: 'Attacker' };

    default:
      const randDefault = Math.random();
      if (randDefault < 0.3) return { position: 'CB', generic: 'Defender' };
      if (randDefault < 0.6) return { position: 'CM', generic: 'Midfielder' };
      return { position: 'ST', generic: 'Attacker' };
  }
}

// Helper: Get competitive strength base rating tier for a team
function getTeamBaseRating(teamName) {
  const name = teamName.toLowerCase();
  
  // Elite Tiers (Base 84)
  const elite = [
    'manchester city', 'real madrid', 'bayern munich', 'paris saint germain', 'psg',
    'liverpool', 'barcelona', 'arsenal', 'inter milan', 'internazionale'
  ];
  
  // Contenders (Base 80)
  const contenders = [
    'atletico madrid', 'atlético madrid', 'borussia dortmund', 'juventus', 'ac milan',
    'bayer leverkusen', 'chelsea', 'manchester united', 'man united', 'tottenham',
    'benfica', 'porto', 'sporting cp', 'napoli', 'rb leipzig', 'aston villa'
  ];
  
  // Mid-tier (Base 77)
  const midTier = [
    'sevilla', 'ajax', 'psv eindhoven', 'feyenoord', 'real sociedad', 'villarreal',
    'atalanta', 'lazio', 'roma', 'monaco', 'marseille', 'lille', 'lyon',
    'club brugge', 'shakhtar donetsk', 'salzburg', 'celtic', 'newcastle',
    'lens', 'girona', 'stuttgart', 'bologna', 'brest', 'sturm graz',
    'dynamo kyiv', 'eintracht frankfurt'
  ];

  // Helper to check substring match
  if (elite.some(t => name.includes(t))) return 84;
  if (contenders.some(t => name.includes(t))) return 80;
  if (midTier.some(t => name.includes(t))) return 77;
  
  // Lower / Qualifying teams / Default (Base 70)
  return 70;
}

const SUPERSTAR_RATINGS = {
  'haaland': 91,
  'mbappé': 91,
  'mbappe': 91,
  'kane': 90,
  'bellingham': 90,
  'vinícius': 91,
  'vinicius': 91,
  'dembélé': 93, // Ballon D'or winner!
  'dembele': 93,
  'de bruyne': 91,
  'rodri': 91,
  'salah': 90,
  'saka': 89,
  'wirtz': 89,
  'yamal': 87,
  'raphinha': 86,
  'lewandowski': 88,
  'messi': 90,
  'ronaldo': 88,
  'griezmann': 88,
  'lautaro': 89,
  'osimhen': 88,
  'musiala': 88,
  'foden': 89,
  'kimmich': 86,
  'kroos': 88,
  'modric': 86,
  'modrić': 86,
  'van dijk': 89,
  'saliba': 88,
  'dias': 88,
  'courtois': 90,
  'alisson': 89,
  'kobel': 87,
  'neuer': 86,
  'matheus nunes': 80,
  'darwin nunez': 84,
  'darwin núñez': 84,
  'bernardo silva': 88,
  'valverde': 88,
  'declan rice': 87,
  'rodrygo': 86,
  'gyökeres': 84,
  'gyokeres': 84,
  'sane': 85,
  'sané': 85,
  'coman': 84,
  'leão': 86,
  'leao': 86,
  'luis díaz': 84,
  'luis diaz': 84,
  'gündoğan': 85,
  'gundogan': 85,
  'pedri': 86,
  'gavi': 84,
  'frenkie de jong': 86,
  'tchouaméni': 85,
  'tchouameni': 85,
  'camavinga': 84,
  'vitinha': 85,
  'hakimi': 85
};

function getSuperstarRatingOverride(playerName) {
  const nameLower = playerName.toLowerCase();
  for (const [key, val] of Object.entries(SUPERSTAR_RATINGS)) {
    if (nameLower.includes(key)) {
      return val;
    }
  }
  return null;
}

// Helper: Calculate standard FIFA OVR rating (60-99) using original simple formula
function calculateRating(playerObj, statistics, teamName) {
  const games = statistics.games || {};
  const goals = statistics.goals || {};
  const tackles = statistics.tackles || {};
  const apps = games.appearences || 0;
  
  let rating = 72; // Default base rating

  // If match rating is available (e.g. "7.15")
  if (games.rating) {
    const rawRating = parseFloat(games.rating);
    if (!isNaN(rawRating) && rawRating > 0) {
      // 6.0 is average (70 OVR), 7.0 is very good (80 OVR), 8.0 is world class (90 OVR)
      rating = 70 + (rawRating - 6.0) * 10;
    }
  } else {
    // Fallback: Calculate based on stats and appearances
    if (apps > 0) {
      rating = 70;
      if (apps > 5) rating += 3;
      if (apps > 15) rating += 5;

      const pos = games.position;
      if (pos === 'Attacker') {
        const g = goals.total || 0;
        const a = goals.assists || 0;
        rating += g * 1.5 + a * 1.0;
      } else if (pos === 'Midfielder') {
        const g = goals.total || 0;
        const a = goals.assists || 0;
        rating += g * 2.0 + a * 1.5;
      } else if (pos === 'Defender') {
        const t = tackles.total || 0;
        rating += Math.min(8, t * 0.1);
      }
    } else {
      rating = 65 + Math.floor(Math.random() * 5); // Bench warmer fallback
    }
  }

  // Round rating to nearest integer
  rating = Math.round(rating);

  // Apply appearance caps to avoid sample size bias (e.g. 1 match rating of 9.0)
  if (apps === 0) {
    rating = Math.min(72, rating);
  } else if (apps === 1) {
    rating = Math.min(78, rating);
  } else if (apps === 2) {
    rating = Math.min(82, rating);
  } else if (apps <= 4) {
    rating = Math.min(86, rating);
  }

  // Cap absolute ratings between 60 and 99
  return Math.min(99, Math.max(60, rating));
}

// Fetch standings to identify group/Swiss stage teams for a season
async function fetchGroupStageTeamIds(season) {
  console.log(`Fetching standings to identify group/Swiss stage teams for season ${season}...`);
  try {
    const response = await axios.get(`${apiBaseUrl}/standings`, {
      headers: apiHeaders,
      params: {
        league: UCL_LEAGUE_ID,
        season: season,
      },
    });

    if (!response.data || !response.data.response || response.data.response.length === 0) {
      console.warn(`No standings response found for season ${season}. Standings might not be available.`);
      return null;
    }

    const standingsData = response.data.response[0]?.league?.standings;
    if (!standingsData || !Array.isArray(standingsData)) {
      console.warn(`Standings array not found in response for season ${season}.`);
      return null;
    }

    const teamIds = new Set();
    // standingsData is a 2D array (array of groups/league phase)
    for (const group of standingsData) {
      if (Array.isArray(group)) {
        for (const row of group) {
          if (row.team && row.team.id) {
            teamIds.add(row.team.id);
          }
        }
      }
    }

    console.log(`Found ${teamIds.size} unique group/Swiss stage team IDs for season ${season}.`);
    return teamIds;
  } catch (error) {
    console.error(`Error fetching group stage team IDs for season ${season}:`, error.message);
    return null;
  }
}


// Fetch all teams for a season
async function fetchTeams(season) {
  console.log(`Fetching teams for season ${season}...`);
  const response = await axios.get(`${apiBaseUrl}/teams`, {
    headers: apiHeaders,
    params: {
      league: UCL_LEAGUE_ID,
      season: season,
    },
  });

  if (!response.data || !response.data.response) {
    throw new Error(`Invalid response from API-Football for season ${season}`);
  }

  return response.data.response;
}

// Fetch players for a team in a season
async function fetchPlayers(teamId, season) {
  let allPlayers = [];
  let page = 1;
  let totalPages = 1;

  console.log(`Fetching players for team ${teamId} in season ${season}...`);

  while (page <= totalPages) {
    const response = await axios.get(`${apiBaseUrl}/players`, {
      headers: apiHeaders,
      params: {
        team: teamId,
        league: UCL_LEAGUE_ID,
        season: season,
        page: page,
      },
    });

    if (!response.data || !response.data.response) {
      throw new Error(`Invalid response for team ${teamId} page ${page}`);
    }

    allPlayers = allPlayers.concat(response.data.response);
    totalPages = response.data.paging?.total || 1;
    page++;

    if (page <= totalPages) {
      await sleep(1500); // Wait between page loads
    }
  }

  return allPlayers;
}

function getTeamLimitForSeason(season) {
  if (season <= 1993) return 16;
  if (season <= 1996) return 16;
  if (season <= 1998) return 24;
  if (season <= 2023) return 32;
  return 36; // 2024-2026 Swiss teams
}

// Seed Real API Data
async function runRealSeeding(seasons) {
  console.log(`Starting real seeding for seasons: ${seasons.join(', ')}`);
  
  for (const season of seasons) {
    try {
      const teamRecords = await fetchTeams(season);
      const groupStageTeamIds = await fetchGroupStageTeamIds(season);

      let teamsToIngest = [];
      if (groupStageTeamIds && groupStageTeamIds.size > 0) {
        teamsToIngest = teamRecords.filter(record => groupStageTeamIds.has(record.team.id));
        console.log(`Filtered team list from ${teamRecords.length} down to ${teamsToIngest.length} group/Swiss stage teams.`);
      }

      if (teamsToIngest.length === 0) {
        const limit = getTeamLimitForSeason(season);
        teamsToIngest = teamRecords.slice(0, limit);
        console.log(`Fallback: Ingesting top ${teamsToIngest.length} teams in season ${season} (no standing filters).`);
      } else {
        console.log(`Ingesting ${teamsToIngest.length} filtered teams for season ${season}.`);
      }

      // Track season-wide player records in memory for deduplication
      const seasonPlayersMap = new Map();

      for (const record of teamsToIngest) {
        const teamData = record.team;
        
        // 1. Insert/Upsert Team
        const { error: teamError } = await supabase
          .from('teams')
          .upsert({
            id: teamData.id,
            name: teamData.name,
            logo_url: teamData.logo,
          });

        if (teamError) {
          console.error(`Error upserting team ${teamData.name}:`, teamError.message);
          continue;
        }

        // 2. Insert/Upsert Team Season
        const { error: tsError } = await supabase
          .from('team_seasons')
          .upsert({
            team_id: teamData.id,
            season: season,
          });

        if (tsError) {
          console.error(`Error upserting team season for ${teamData.name} - ${season}:`, tsError.message);
        }

        // 3. Fetch Players for this team-season
        await sleep(1500); // rate limiting safety
        let playersList = [];
        try {
          playersList = await fetchPlayers(teamData.id, season);
        } catch (err) {
          console.error(`Failed to fetch players for team ${teamData.name}:`, err.message);
          continue;
        }

        console.log(`Fetched ${playersList.length} players for ${teamData.name}`);

        // Map and save to our in-memory season map for deduplication
        for (const pRecord of playersList) {
          const p = pRecord.player;
          const stats = pRecord.statistics[0] || {};
          const apps = stats.games?.appearences || 0;
          const minutes = stats.games?.minutes || 0;
          
          const rating = calculateRating(p, stats, teamData.name);
          const mappedPos = mapPosition(stats.games?.position, stats, p.name, teamData.name);

          const newRecord = {
            api_id: p.id,
            team_id: teamData.id,
            ucl_season: season,
            name: p.name,
            rating: rating,
            position: mappedPos.position,
            generic_position: mappedPos.generic,
            photo_url: p.photo,
            _apps: apps,
            _minutes: minutes
          };

          const existing = seasonPlayersMap.get(p.id);
          // Keep the record that played more minutes/appearances in this season
          if (
            !existing || 
            newRecord._minutes > existing._minutes || 
            (newRecord._minutes === existing._minutes && newRecord._apps > existing._apps)
          ) {
            // Keep the maximum calculated rating if the player has multiple records
            const finalRating = existing ? Math.max(newRecord.rating, existing.rating) : newRecord.rating;
            seasonPlayersMap.set(p.id, { ...newRecord, rating: finalRating });
          }
        }

        // Safe cooldown between teams to respect rate limits
        await sleep(2000);
      }

      // 4. Batch Insert Deduplicated Players for the season
      const finalPlayerInserts = Array.from(seasonPlayersMap.values()).map(({ _apps, _minutes, ...p }) => p);
      if (finalPlayerInserts.length > 0) {
        console.log(`Inserting ${finalPlayerInserts.length} deduplicated players for season ${season}...`);
        const chunkSize = 200;
        for (let i = 0; i < finalPlayerInserts.length; i += chunkSize) {
          const chunk = finalPlayerInserts.slice(i, i + chunkSize);
          const { error: playerError } = await supabase
            .from('players')
            .upsert(chunk, { onConflict: 'api_id, team_id, ucl_season' });

          if (playerError) {
            console.error(`Error inserting player chunk starting at ${i}:`, playerError.message);
          }
        }
        console.log(`Successfully seeded players for season ${season}!`);
      }
    } catch (error) {
      console.error(`Error seeding season ${season}:`, error.message);
    }
  }
}

// Seed Mock Data
async function runMockSeeding() {
  console.log('--- RUNNING IN MOCK MODE ---');
  console.log('Seeding Supabase with high-quality mock data for Real Madrid, Manchester City, and Bayern Munich.');

  const mockTeams = [
    { id: 541, name: 'Real Madrid', logo_url: 'https://media.api-sports.io/football/teams/541.png' },
    { id: 50, name: 'Manchester City', logo_url: 'https://media.api-sports.io/football/teams/50.png' },
    { id: 157, name: 'Bayern Munich', logo_url: 'https://media.api-sports.io/football/teams/157.png' },
  ];

  // Insert teams
  for (const team of mockTeams) {
    const { error } = await supabase.from('teams').upsert(team);
    if (error) {
      console.error(`Failed to insert mock team ${team.name}:`, error.message);
      return;
    }
    // Set seasons
    for (let season = 2020; season <= 2025; season++) {
      await supabase.from('team_seasons').upsert({ team_id: team.id, season });
    }
  }
  console.log('Mock teams and team seasons created successfully.');

  const mockPlayers = [
    // Real Madrid
    { api_id: 22221, team_id: 541, ucl_season: 2024, name: 'Vinicius Junior', rating: 91, position: 'LW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/22221.png' },
    { api_id: 22222, team_id: 541, ucl_season: 2024, name: 'Jude Bellingham', rating: 90, position: 'CAM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/22222.png' },
    { api_id: 22223, team_id: 541, ucl_season: 2024, name: 'Rodrygo', rating: 86, position: 'RW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/22223.png' },
    { api_id: 22224, team_id: 541, ucl_season: 2024, name: 'Federico Valverde', rating: 88, position: 'CM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/22224.png' },
    { api_id: 22225, team_id: 541, ucl_season: 2024, name: 'Aurelien Tchouameni', rating: 85, position: 'CDM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/22225.png' },
    { api_id: 22226, team_id: 541, ucl_season: 2024, name: 'Antonio Rudiger', rating: 87, position: 'CB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/22226.png' },
    { api_id: 22227, team_id: 541, ucl_season: 2024, name: 'Dani Carvajal', rating: 85, position: 'RB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/22227.png' },
    { api_id: 22228, team_id: 541, ucl_season: 2024, name: 'Ferland Mendy', rating: 82, position: 'LB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/22228.png' },
    { api_id: 22229, team_id: 541, ucl_season: 2024, name: 'Eder Militao', rating: 84, position: 'CB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/22229.png' },
    { api_id: 22230, team_id: 541, ucl_season: 2024, name: 'Thibaut Courtois', rating: 90, position: 'GK', generic_position: 'Goalkeeper', photo_url: 'https://media.api-sports.io/football/players/22230.png' },
    
    // Man City
    { api_id: 11111, team_id: 50, ucl_season: 2024, name: 'Erling Haaland', rating: 91, position: 'ST', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/11111.png' },
    { api_id: 11112, team_id: 50, ucl_season: 2024, name: 'Kevin De Bruyne', rating: 91, position: 'CAM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/11112.png' },
    { api_id: 11113, team_id: 50, ucl_season: 2024, name: 'Rodri', rating: 92, position: 'CDM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/11113.png' },
    { api_id: 11114, team_id: 50, ucl_season: 2024, name: 'Bernardo Silva', rating: 87, position: 'CM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/11114.png' },
    { api_id: 11115, team_id: 50, ucl_season: 2024, name: 'Phil Foden', rating: 89, position: 'RW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/11115.png' },
    { api_id: 11116, team_id: 50, ucl_season: 2024, name: 'Jeremy Doku', rating: 83, position: 'LW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/11116.png' },
    { api_id: 11117, team_id: 50, ucl_season: 2024, name: 'Ruben Dias', rating: 89, position: 'CB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/11117.png' },
    { api_id: 11118, team_id: 50, ucl_season: 2024, name: 'Kyle Walker', rating: 84, position: 'RB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/11118.png' },
    { api_id: 11119, team_id: 50, ucl_season: 2024, name: 'Josko Gvardiol', rating: 83, position: 'LB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/11119.png' },
    { api_id: 11120, team_id: 50, ucl_season: 2024, name: 'Ederson', rating: 86, position: 'GK', generic_position: 'Goalkeeper', photo_url: 'https://media.api-sports.io/football/players/11120.png' },

    // Bayern Munich
    { api_id: 33331, team_id: 157, ucl_season: 2024, name: 'Harry Kane', rating: 90, position: 'ST', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/33331.png' },
    { api_id: 33332, team_id: 157, ucl_season: 2024, name: 'Jamal Musiala', rating: 88, position: 'CAM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/33332.png' },
    { api_id: 33333, team_id: 157, ucl_season: 2024, name: 'Joshua Kimmich', rating: 86, position: 'CDM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/33333.png' },
    { api_id: 33334, team_id: 157, ucl_season: 2024, name: 'Leon Goretzka', rating: 83, position: 'CM', generic_position: 'Midfielder', photo_url: 'https://media.api-sports.io/football/players/33334.png' },
    { api_id: 33335, team_id: 157, ucl_season: 2024, name: 'Leroy Sane', rating: 84, position: 'RW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/33335.png' },
    { api_id: 33336, team_id: 157, ucl_season: 2024, name: 'Kingsley Coman', rating: 84, position: 'LW', generic_position: 'Attacker', photo_url: 'https://media.api-sports.io/football/players/33336.png' },
    { api_id: 33337, team_id: 157, ucl_season: 2024, name: 'Matthijs de Ligt', rating: 84, position: 'CB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/33337.png' },
    { api_id: 33338, team_id: 157, ucl_season: 2024, name: 'Kim Min-jae', rating: 84, position: 'CB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/33338.png' },
    { api_id: 33339, team_id: 157, ucl_season: 2024, name: 'Alphonso Davies', rating: 83, position: 'LB', generic_position: 'Defender', photo_url: 'https://media.api-sports.io/football/players/33339.png' },
    { api_id: 33340, team_id: 157, ucl_season: 2024, name: 'Manuel Neuer', rating: 85, position: 'GK', generic_position: 'Goalkeeper', photo_url: 'https://media.api-sports.io/football/players/33340.png' },
  ];

  const { error } = await supabase
    .from('players')
    .upsert(mockPlayers, { onConflict: 'api_id, team_id, ucl_season' });

  if (error) {
    console.error('Failed to insert mock players:', error.message);
  } else {
    console.log(`Successfully seeded ${mockPlayers.length} mock players.`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const isMockMode = args.includes('--mock') || !hasValidKey;

  if (isMockMode) {
    await runMockSeeding();
  } else {
    // Parse seasons to fetch
    let seasonsToFetch = [];
    const seasonsArg = args.find(arg => arg.startsWith('--seasons='));
    
    if (seasonsArg) {
      const seasonsStr = seasonsArg.split('=')[1];
      seasonsToFetch = seasonsStr.split(',').map(s => parseInt(s.trim(), 10));
    } else {
      // Fetch default range specified in .env
      for (let s = START_SEASON; s <= END_SEASON; s++) {
        seasonsToFetch.push(s);
      }
    }

    console.log(`Seasons configured for ingestion: ${seasonsToFetch.join(', ')}`);
    console.log(`Warning: Requesting data from API-Football. Respecting 1.5s delay to prevent 429 errors.`);
    
    await runRealSeeding(seasonsToFetch);
  }

  console.log('Seeding process complete!');
  await exportSeededData();
}

async function exportSeededData() {
  console.log('Exporting database tables to JSON files...');
  try {
    // 1. Export Teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    if (teamsError) throw teamsError;
    fs.writeFileSync(
      path.resolve(__dirname, 'teams_export.json'),
      JSON.stringify(teams, null, 2),
      'utf-8'
    );
    console.log(`✅ Exported ${teams.length} teams to backend/teams_export.json`);

    // 2. Export Players season-by-season to players data directory
    const playersBySeason = {};
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    let totalFetched = 0;

    console.log('Fetching all players for export in chunks...');
    while (hasMore) {
      const { data: chunk, error: chunkError } = await supabase
        .from('players')
        .select('name, ucl_season, teams ( name )')
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (chunkError) throw chunkError;
      if (!chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        totalFetched += chunk.length;
        for (const p of chunk) {
          const season = p.ucl_season;
          if (!playersBySeason[season]) {
            playersBySeason[season] = [];
          }
          playersBySeason[season].push({
            name: p.name,
            team: p.teams?.name || 'Unknown',
            ucl_season: season,
            rating: "" // Blanked rating
          });
        }
        if (chunk.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    console.log(`Successfully fetched ${totalFetched} total players for export.`);

    const dirPath = path.resolve(__dirname, 'players data');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    for (const [seasonStr, seasonPlayers] of Object.entries(playersBySeason)) {
      const season = parseInt(seasonStr, 10);
      const suffix = `${season}${String(season + 1).slice(2)}`;
      const filePath = path.join(dirPath, `players_export_${suffix}.json`);
      
      const output = {
        total_players: seasonPlayers.length,
        players: seasonPlayers
      };

      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`✅ Exported ${seasonPlayers.length} players to backend/players data/players_export_${suffix}.json`);
    }
  } catch (error) {
    console.error('❌ Failed to export data:', error.message);
  }
}

main().catch((err) => {
  console.error('Fatal error in seeding script:', err);
});
