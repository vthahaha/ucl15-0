import React, { useState, useEffect, useRef } from 'react';
import { Play, Trophy, Medal, ArrowRight, Table, Users, Clock, Activity, BarChart2, Calendar, Star, Info, X, Shuffle } from 'lucide-react';
import { checkPositionEligibility } from '../utils/positionRules';

const generateFallbackSquad = (teamName) => {
  // Return a fallback squad composed of real historical UEFA Champions League players
  const fallbackLegends = [
    { name: 'Jerzy Dudek', rating: 80, generic_position: 'GK' },
    { name: 'Jamie Carragher', rating: 81, generic_position: 'DEF' },
    { name: 'John Terry', rating: 82, generic_position: 'DEF' },
    { name: 'Roberto Carlos', rating: 83, generic_position: 'DEF' },
    { name: 'Javier Zanetti', rating: 82, generic_position: 'DEF' },
    { name: 'Steven Gerrard', rating: 85, generic_position: 'MID' },
    { name: 'Frank Lampard', rating: 84, generic_position: 'MID' },
    { name: 'Andrea Pirlo', rating: 84, generic_position: 'MID' },
    { name: 'Ronaldinho', rating: 86, generic_position: 'MID' },
    { name: 'Kaká', rating: 86, generic_position: 'MID' },
    { name: 'Thierry Henry', rating: 87, generic_position: 'FWD' },
    { name: 'Raúl', rating: 85, generic_position: 'FWD' },
    { name: 'Adriano', rating: 84, generic_position: 'FWD' },
    { name: 'Didier Drogba', rating: 85, generic_position: 'FWD' },
    { name: 'Wayne Rooney', rating: 84, generic_position: 'FWD' }
  ];
  return fallbackLegends;
};

const generateSwissPairings = (standings) => {
  const n = standings.length;
  // Shuffle copy of standings to randomize pairing order
  const shuffledTeams = [...standings].sort(() => Math.random() - 0.5);

  const matched = new Array(n).fill(false);
  const pairings = [];

  const solve = (startIndex) => {
    let i = startIndex;
    while (i < n && matched[i]) {
      i++;
    }
    if (i === n) return true;

    const teamA = shuffledTeams[i];
    const played = teamA.playedAgainst || [];

    // Find candidates for teamA: unmatched teams that teamA hasn't played against yet
    const candidates = [];
    for (let j = i + 1; j < n; j++) {
      if (!matched[j]) {
        const teamB = shuffledTeams[j];
        if (!played.includes(teamB.id)) {
          candidates.push({ index: j, team: teamB });
        }
      }
    }

    // Shuffle candidates to keep pairings random
    candidates.sort(() => Math.random() - 0.5);

    for (const cand of candidates) {
      const j = cand.index;
      matched[i] = true;
      matched[j] = true;
      pairings.push([teamA, cand.team]);

      if (solve(i + 1)) {
        return true;
      }

      // Backtrack
      matched[i] = false;
      matched[j] = false;
      pairings.pop();
    }

    return false;
  };

  const success = solve(0);
  if (!success) {
    console.error("Failed to find a valid random Swiss matching!");
    // Fallback: match sequentially
    const fallbackPairings = [];
    const fallbackMatched = new Set();
    for (let i = 0; i < shuffledTeams.length; i++) {
      if (fallbackMatched.has(shuffledTeams[i].id)) continue;
      let opp = null;
      for (let j = i + 1; j < shuffledTeams.length; j++) {
        if (!fallbackMatched.has(shuffledTeams[j].id)) {
          opp = shuffledTeams[j];
          break;
        }
      }
      if (!opp) {
        opp = shuffledTeams.find(t => t.id !== shuffledTeams[i].id);
      }
      fallbackPairings.push([shuffledTeams[i], opp]);
      fallbackMatched.add(shuffledTeams[i].id);
      fallbackMatched.add(opp.id);
    }
    return fallbackPairings;
  }

  return pairings;
};

const Simulator = ({ userSquad, userTeamName, era, onReset }) => {
  const [activeUserSquad, setActiveUserSquad] = useState(userSquad);
  const [showLineupManager, setShowLineupManager] = useState(false);
  const [selectedSwapPlayerKey, setSelectedSwapPlayerKey] = useState(null);

  const [tournamentState, setTournamentState] = useState('INIT'); // 'INIT', 'SWISS', 'PLAYOFFS', 'RO16', 'QF', 'SF', 'FINAL', 'CHAMPION'
  const [swissStandings, setSwissStandings] = useState([]);
  const [swissRound, setSwissRound] = useState(1);
  const [upcomingPairings, setUpcomingPairings] = useState([]);
  const [recentFixtures, setRecentFixtures] = useState([]);
  
  const [swissRoundSimulated, setSwissRoundSimulated] = useState(false);
  const [knockoutSimulated, setKnockoutSimulated] = useState(false);
  const [knockoutBracket, setKnockoutBracket] = useState(null);
  const [knockoutStages, setKnockoutStages] = useState(null);

  // Sync knockoutBracket updates into the full knockoutStages history tree
  useEffect(() => {
    if (knockoutBracket) {
      setKnockoutStages(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [knockoutBracket.stage]: knockoutBracket.pairs,
          qualifiedTop8: knockoutBracket.qualifiedTop8,
          champion: knockoutBracket.champion || prev.champion
        };
      });
    }
  }, [knockoutBracket]);

  // Live Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMinute, setSimMinute] = useState(0);
  const [simType, setSimType] = useState(''); // 'SWISS', 'KNOCKOUT_2LEGS', 'FINAL'
  const [liveMatches, setLiveMatches] = useState([]);
  const [nextSwissStandings, setNextSwissStandings] = useState(null);
  const [nextSwissRound, setNextSwissRound] = useState(null);
  const [nextTournamentState, setNextTournamentState] = useState(null);
  const [nextKnockoutBracket, setNextKnockoutBracket] = useState(null);

  // Overhaul State variables
  const [squadsMap, setSquadsMap] = useState({});
  const [featuredMatchIndex, setFeaturedMatchIndex] = useState(0);
  const [tournamentGoals, setTournamentGoals] = useState({});
  const [tournamentAssists, setTournamentAssists] = useState({});
  const [userCampaignStats, setUserCampaignStats] = useState({
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gs: 0,
    ga: 0,
    highestStage: 'Swiss Stage', // 'Swiss Stage', 'Play-offs', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Runner-up', 'Champion'
    scorers: {},
    assists: {},
  });
  const [activeTab, setActiveTab] = useState('STANDINGS'); // 'STANDINGS', 'SCORERS', 'ASSISTS'

  const timelineContainerRef = useRef(null);
  const lastRoundRef = useRef(null);
  const lastStateRef = useRef(null);
  const lastKoStageRef = useRef(null);

  // Auto-scroll timeline to bottom on updates
  useEffect(() => {
    if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollTop = timelineContainerRef.current.scrollHeight;
    }
  }, [simMinute, featuredMatchIndex]);

  // Helper to generate goal minutes
  const generateGoalMinutes = (numGoals, maxMinutes = 90, offset = 0) => {
    const mins = [];
    for (let i = 0; i < numGoals; i++) {
      mins.push(Math.floor(Math.random() * maxMinutes) + 1 + offset);
    }
    return mins.sort((a, b) => a - b);
  };

  // Live simulation ticker incrementer
  useEffect(() => {
    let intervalId = null;
    if (isSimulating) {
      const maxMin = simType === 'KNOCKOUT_LEG2' ? 180 : 90;
      const step = 1;
      const intervalSpeed = 20; // 20ms per tick

      intervalId = setInterval(() => {
        setSimMinute((prev) => {
          if (prev >= maxMin) {
            clearInterval(intervalId);
            return maxMin;
          }
          return prev + step;
        });
      }, intervalSpeed);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSimulating, simType]);

  // Live simulation completion handler
  useEffect(() => {
    const maxMin = simType === 'KNOCKOUT_LEG2' ? 180 : 90;
    if (isSimulating && simMinute === maxMin) {
      const timer = setTimeout(() => {
        setIsSimulating(false);
        if (simType === 'SWISS') {
          setSwissStandings(nextSwissStandings);
          const roundFixtures = liveMatches.map((m) => ({
            teamA: m.teamA.name,
            teamB: m.teamB.name,
            scoreA: m.finalScoreA,
            scoreB: m.finalScoreB,
            isUser: m.isUser,
          }));
          setRecentFixtures(roundFixtures);
          setSwissRound(nextSwissRound);
          setTournamentState(nextTournamentState);
          
          if (nextSwissRound <= 8 && nextTournamentState === 'SWISS') {
            const nextPairings = generateSwissPairings(nextSwissStandings);
            setUpcomingPairings(nextPairings);
          }
        } else if (simType === 'KNOCKOUT_LEG1') {
          setKnockoutBracket(nextKnockoutBracket);
        } else if (simType === 'KNOCKOUT_LEG2' || simType === 'FINAL') {
          setKnockoutBracket(nextKnockoutBracket);
          setKnockoutSimulated(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [simMinute, isSimulating, simType, nextSwissStandings, nextSwissRound, nextTournamentState, nextKnockoutBracket, liveMatches]);

  // Calculate User Team overall rating from starting XI only
  const startingPlayers = Object.entries(activeUserSquad)
    .filter(([key, p]) => !key.startsWith('sub') && !!p)
    .map(([key, p]) => p);
  const userRating = Math.round(
    startingPlayers.reduce((sum, p) => sum + p.rating, 0) / Math.max(1, startingPlayers.length)
  );

  // Update user team (id: 7777) rating dynamically in standings and pairings
  useEffect(() => {
    if (swissStandings.length > 0) {
      setSwissStandings(prev =>
        prev.map(team => team.id === 7777 ? { ...team, rating: userRating } : team)
      );
    }
    if (upcomingPairings.length > 0) {
      setUpcomingPairings(prev =>
        prev.map(([tA, tB]) => [
          tA.id === 7777 ? { ...tA, rating: userRating } : tA,
          tB.id === 7777 ? { ...tB, rating: userRating } : tB,
        ])
      );
    }
  }, [userRating]);

  const handleSwapPlayers = (keyA, keyB) => {
    const isKeyASub = keyA.startsWith('sub');
    const isKeyBSub = keyB.startsWith('sub');

    if (isKeyASub && isKeyBSub) {
      setActiveUserSquad((prev) => {
        const next = { ...prev };
        const temp = next[keyA];
        next[keyA] = next[keyB];
        next[keyB] = temp;
        return next;
      });
      setSelectedSwapPlayerKey(null);
      return;
    }

    if (!isKeyASub && !isKeyBSub) {
      const playerA = activeUserSquad[keyA];
      const playerB = activeUserSquad[keyB];
      
      const roleA = keyA.replace(/\d+$/, '').toUpperCase();
      const roleB = keyB.replace(/\d+$/, '').toUpperCase();

      if (playerB && !checkPositionEligibility(playerB.position, roleA)) {
        alert(`Incompatible Position! A ${playerB.position} cannot play at ${roleA}.`);
        return;
      }
      if (playerA && !checkPositionEligibility(playerA.position, roleB)) {
        alert(`Incompatible Position! A ${playerA.position} cannot play at ${roleB}.`);
        return;
      }

      setActiveUserSquad((prev) => {
        const next = { ...prev };
        const temp = next[keyA];
        next[keyA] = next[keyB];
        next[keyB] = temp;
        return next;
      });
      setSelectedSwapPlayerKey(null);
      return;
    }

    const starterKey = isKeyASub ? keyB : keyA;
    const subKey = isKeyASub ? keyA : keyB;

    const starterPlayer = activeUserSquad[starterKey];
    const subPlayer = activeUserSquad[subKey];

    const starterRole = starterKey.replace(/\d+$/, '').toUpperCase();

    if (subPlayer && !checkPositionEligibility(subPlayer.position, starterRole)) {
      alert(`Incompatible Position! A ${subPlayer.position} cannot play at ${starterRole}.`);
      return;
    }

    setActiveUserSquad((prev) => {
      const next = { ...prev };
      const temp = next[starterKey];
      next[starterKey] = next[subKey];
      next[subKey] = temp;
      return next;
    });
    setSelectedSwapPlayerKey(null);
  };

  const renderTeamNameWithYear = (fullName, isUser = false) => {
    if (!fullName) return null;
    const match = fullName.match(/^(.*?)\s*\((\d{4})\)$/);
    if (match) {
      const [, name, year] = match;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', overflow: 'hidden', minWidth: 0, flexShrink: 1 }}>
          <span style={{ fontWeight: isUser ? '700' : '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '400', flexShrink: 0 }}>({year})</span>
        </span>
      );
    }
    return <span style={{ fontWeight: isUser ? '700' : '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fullName}</span>;
  };

  const getCleanGenericPos = (pos) => {
    if (!pos) return 'MID';
    const p = pos.toUpperCase();
    if (p === 'GK' || p.includes('GOAL')) return 'GK';
    if (p === 'DEF' || p.includes('DEF')) return 'DEF';
    if (p === 'MID' || p.includes('MID')) return 'MID';
    if (p === 'FWD' || p.includes('ATT') || p.includes('FWD')) return 'FWD';
    return 'MID';
  };

  const getTeamSquad = (team) => {
    if (team.isUser || team.id === 7777) {
      return Object.values(activeUserSquad).map(p => ({
        name: p.name,
        rating: p.rating,
        generic_position: p.generic_position
      }));
    }
    const dbSquad = squadsMap[`${team.id}|${team.season}`];
    if (dbSquad && dbSquad.length > 0) {
      return dbSquad;
    }
    return generateFallbackSquad(team.name);
  };

  const getTeamRoster = (team) => {
    if (team.isUser || team.id === 7777) {
      const starters = [];
      const subs = [];
      Object.entries(activeUserSquad).forEach(([key, p]) => {
        if (!p) return;
        const playerObj = {
          name: p.name,
          rating: p.rating,
          generic_position: p.generic_position
        };
        if (key.startsWith('sub')) {
          subs.push(playerObj);
        } else {
          starters.push(playerObj);
        }
      });
      return { starters, subs };
    }

    const dbSquad = squadsMap[`${team.id}|${team.season}`];
    if (dbSquad && dbSquad.length > 0) {
      const sorted = [...dbSquad].sort((a, b) => b.rating - a.rating);
      return {
        starters: sorted.slice(0, 11).map(p => ({
          name: p.name,
          rating: p.rating,
          generic_position: p.generic_position
        })),
        subs: sorted.slice(11, 18).map(p => ({
          name: p.name,
          rating: p.rating,
          generic_position: p.generic_position
        }))
      };
    }

    const fallback = generateFallbackSquad(team.name);
    return {
      starters: fallback.slice(0, 11),
      subs: fallback.slice(11, 15)
    };
  };

  const pickScorer = (squad) => {
    const outfield = squad.filter(p => getCleanGenericPos(p.generic_position) !== 'GK');
    const pool = outfield.length > 0 ? outfield : squad;
    
    const weighted = [];
    pool.forEach(p => {
      const cleanPos = getCleanGenericPos(p.generic_position);
      let baseWeight = 1;
      if (cleanPos === 'FWD') baseWeight = 20;
      else if (cleanPos === 'MID') baseWeight = 8;
      else if (cleanPos === 'DEF') baseWeight = 1;
      else if (cleanPos === 'GK') baseWeight = 0.01;
      
      const weight = Math.round(baseWeight * Math.pow(p.rating / 70, 8));
      for (let i = 0; i < weight; i++) {
        weighted.push(p);
      }
    });

    const selected = weighted[Math.floor(Math.random() * weighted.length)];
    return selected ? selected.name : 'Unknown Scorer';
  };

  const pickAssistor = (squad, scorerName) => {
    if (Math.random() > 0.7) return null; // 70% chance of assist

    const candidates = squad.filter(p => p.name !== scorerName);
    if (candidates.length === 0) return null;

    const weighted = [];
    candidates.forEach(p => {
      const cleanPos = getCleanGenericPos(p.generic_position);
      let baseWeight = 1;
      if (cleanPos === 'MID') baseWeight = 15;
      else if (cleanPos === 'FWD') baseWeight = 8;
      else if (cleanPos === 'DEF') baseWeight = 3;
      else if (cleanPos === 'GK') baseWeight = 0.1;

      const weight = Math.round(baseWeight * Math.pow(p.rating / 70, 8));
      for (let i = 0; i < weight; i++) {
        weighted.push(p);
      }
    });

    const selected = weighted[Math.floor(Math.random() * weighted.length)];
    return selected ? selected.name : null;
  };

  const updateUserStats = (teamA, teamB, goalsA, goalsB, scorersA, scorersB) => {
    const isTeamAUser = teamA.isUser || teamA.id === 7777;
    const isTeamBUser = teamB.isUser || teamB.id === 7777;

    if (!isTeamAUser && !isTeamBUser) return; // not the user's match

    const userGoals = isTeamAUser ? goalsA : goalsB;
    const oppGoals = isTeamAUser ? goalsB : goalsA;
    const userScorers = isTeamAUser ? scorersA : scorersB;

    let outcome = 'draw';
    if (userGoals > oppGoals) outcome = 'win';
    else if (userGoals < oppGoals) outcome = 'loss';

    setUserCampaignStats(prev => {
      const nextScorers = { ...prev.scorers };
      const nextAssists = { ...prev.assists };

      userScorers.forEach(s => {
        if (s.name) {
          nextScorers[s.name] = (nextScorers[s.name] || 0) + 1;
        }
        if (s.assistor) {
          nextAssists[s.assistor] = (nextAssists[s.assistor] || 0) + 1;
        }
      });

      return {
        ...prev,
        played: prev.played + 1,
        won: prev.won + (outcome === 'win' ? 1 : 0),
        drawn: prev.drawn + (outcome === 'draw' ? 1 : 0),
        lost: prev.lost + (outcome === 'loss' ? 1 : 0),
        gs: prev.gs + userGoals,
        ga: prev.ga + oppGoals,
        scorers: nextScorers,
        assists: nextAssists,
      };
    });
  };

  const generateMatchStats = (teamA, teamB, goalsA, goalsB) => {
    const ratingDiff = teamA.rating - teamB.rating;
    const possessionA = Math.max(25, Math.min(75, Math.round(50 + ratingDiff * 1.5 + (Math.random() * 10 - 5))));
    const possessionB = 100 - possessionA;

    const shotsA = goalsA + Math.floor(Math.random() * 7) + 3;
    const shotsB = goalsB + Math.floor(Math.random() * 7) + 3;

    const shotsOnTargetA = Math.min(shotsA, goalsA + Math.floor(Math.random() * (shotsA - goalsA + 1)));
    const shotsOnTargetB = Math.min(shotsB, goalsB + Math.floor(Math.random() * (shotsB - goalsB + 1)));

    const cornersA = Math.floor(Math.random() * 8) + 2;
    const cornersB = Math.floor(Math.random() * 8) + 2;

    const foulsA = Math.floor(Math.random() * 10) + 5;
    const foulsB = Math.floor(Math.random() * 10) + 5;

    return {
      possessionA, possessionB,
      shotsA, shotsB,
      shotsOnTargetA, shotsOnTargetB,
      cornersA, cornersB,
      foulsA, foulsB
    };
  };

  const getLiveStats = (stats, minute, maxMin = 90) => {
    if (!stats) return { possessionA: 50, possessionB: 50, shotsA: 0, shotsB: 0, shotsOnTargetA: 0, shotsOnTargetB: 0, cornersA: 0, cornersB: 0, foulsA: 0, foulsB: 0 };
    const ratio = Math.min(1, minute / maxMin);
    return {
      possessionA: stats.possessionA,
      possessionB: stats.possessionB,
      shotsA: Math.round(stats.shotsA * ratio),
      shotsB: Math.round(stats.shotsB * ratio),
      shotsOnTargetA: Math.round(stats.shotsOnTargetA * ratio),
      shotsOnTargetB: Math.round(stats.shotsOnTargetB * ratio),
      cornersA: Math.round(stats.cornersA * ratio),
      cornersB: Math.round(stats.cornersB * ratio),
      foulsA: Math.round(stats.foulsA * ratio),
      foulsB: Math.round(stats.foulsB * ratio),
    };
  };

  const generateMatchEvents = (teamA, teamB, goalsA, goalsB, goalMinutesA, goalMinutesB) => {
    const rosterA = getTeamRoster(teamA);
    const rosterB = getTeamRoster(teamB);

    const activeStartersA = [...rosterA.starters];
    const activeSubsA = [...rosterA.subs];
    const activeStartersB = [...rosterB.starters];
    const activeSubsB = [...rosterB.subs];

    let subCountA = 0;
    let subCountB = 0;

    const rawEvents = [];
    const scorersA = [];
    const scorersB = [];

    // 1. Compile goals
    goalMinutesA.forEach(min => {
      rawEvents.push({ minute: min, type: 'GOAL', team: 'A' });
    });
    goalMinutesB.forEach(min => {
      rawEvents.push({ minute: min, type: 'GOAL', team: 'B' });
    });

    // 2. Compile cards
    const numCards = Math.floor(Math.random() * 3);
    for (let i = 0; i < numCards; i++) {
      const min = Math.floor(Math.random() * 88) + 1;
      const team = Math.random() > 0.5 ? 'A' : 'B';
      const isRed = Math.random() < 0.08;
      rawEvents.push({ minute: min, type: isRed ? 'RED' : 'YELLOW', team });
    }

    // 3. Compile substitutions (Max 5 per team, randomly decide 1-4 per team)
    const plannedSubsA = 1 + Math.floor(Math.random() * 4);
    const plannedSubsB = 1 + Math.floor(Math.random() * 4);

    for (let i = 0; i < plannedSubsA; i++) {
      const min = 46 + Math.floor(Math.random() * 40);
      rawEvents.push({ minute: min, type: 'SUB', team: 'A' });
    }
    for (let i = 0; i < plannedSubsB; i++) {
      const min = 46 + Math.floor(Math.random() * 40);
      rawEvents.push({ minute: min, type: 'SUB', team: 'B' });
    }

    // Sort all raw events chronologically
    rawEvents.sort((a, b) => a.minute - b.minute);

    const events = [];

    rawEvents.forEach(ev => {
      const team = ev.team;
      const isTeamA = team === 'A';
      const activeStarters = isTeamA ? activeStartersA : activeStartersB;
      const activeSubs = isTeamA ? activeSubsA : activeSubsB;
      const teamObj = isTeamA ? teamA : teamB;

      if (ev.type === 'GOAL') {
        const scorer = pickScorer(activeStarters);
        const assistor = pickAssistor(activeStarters, scorer);
        
        if (isTeamA) {
          scorersA.push({ minute: ev.minute, name: scorer, assistor });
        } else {
          scorersB.push({ minute: ev.minute, name: scorer, assistor });
        }

        events.push({
          minute: ev.minute,
          type: 'GOAL',
          team,
          player: scorer,
          assistor,
          text: `⚽ GOAL! ${scorer} scores for ${teamObj.name}!${assistor ? ` (Assisted by ${assistor})` : ''}`
        });
      } else if (ev.type === 'YELLOW' || ev.type === 'RED') {
        if (activeStarters.length === 0) return;
        const player = pickScorer(activeStarters);
        
        if (ev.type === 'RED') {
          // Remove player from active starters (sent off)
          const idx = activeStarters.findIndex(p => p.name === player);
          if (idx >= 0) activeStarters.splice(idx, 1);

          events.push({
            minute: ev.minute,
            type: 'RED',
            team,
            player,
            text: `🔴 RED CARD! ${player} (${teamObj.name}) is sent off!`
          });
        } else {
          events.push({
            minute: ev.minute,
            type: 'YELLOW',
            team,
            player,
            text: `🟨 Yellow Card for ${player} (${teamObj.name}).`
          });
        }
      } else if (ev.type === 'SUB') {
        // Enforce max 5 substitutions per team
        const subCount = isTeamA ? subCountA : subCountB;
        if (subCount >= 5) return;
        if (activeSubs.length === 0 || activeStarters.length <= 1) return;

        // Pick outfield starter to go out (exclude GK if possible)
        const outfieldStarters = activeStarters.filter(p => getCleanGenericPos(p.generic_position) !== 'GK');
        const startersToChoose = outfieldStarters.length > 0 ? outfieldStarters : activeStarters;
        const playerOutObj = startersToChoose[Math.floor(Math.random() * startersToChoose.length)];
        if (!playerOutObj) return;

        // Pick sub to go in
        const cleanPosOut = getCleanGenericPos(playerOutObj.generic_position);
        const positionMatchSubs = activeSubs.filter(p => getCleanGenericPos(p.generic_position) === cleanPosOut);
        const subInObj = positionMatchSubs.length > 0
          ? positionMatchSubs[Math.floor(Math.random() * positionMatchSubs.length)]
          : activeSubs[Math.floor(Math.random() * activeSubs.length)];
        
        if (!subInObj) return;

        // Perform substitution swap
        const outIdx = activeStarters.findIndex(p => p.name === playerOutObj.name);
        if (outIdx >= 0) activeStarters.splice(outIdx, 1);
        
        const inIdx = activeSubs.findIndex(p => p.name === subInObj.name);
        if (inIdx >= 0) activeSubs.splice(inIdx, 1);

        activeStarters.push(subInObj);

        // Increment substitution counter
        if (isTeamA) {
          subCountA++;
        } else {
          subCountB++;
        }

        events.push({
          minute: ev.minute,
          type: 'SUB',
          team,
          player: subInObj.name,
          text: `🔄 Substitution (${teamObj.name}): ${subInObj.name} replaces ${playerOutObj.name}.`
        });
      }
    });

    events.sort((a, b) => a.minute - b.minute);
    return { events, scorersA, scorersB };
  };

  // 1. Initialize Swiss Tournament
  const initTournament = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/api/teams?era=${era}&_cb=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch simulator teams');
      const dbTeams = await response.json();

      const getBaseName = (name) => name.replace(/\s*\(\d{4}\)$/, '').trim().toLowerCase();
      const shuffledDbTeams = [...dbTeams].sort(() => 0.5 - Math.random());

      const selectedTeams = [];
      const selectedClubIds = new Set();
      const selectedClubNames = new Set();

      for (const t of shuffledDbTeams) {
        const baseName = getBaseName(t.name);
        if (!selectedClubIds.has(t.id) && !selectedClubNames.has(baseName)) {
          selectedClubIds.add(t.id);
          selectedClubNames.add(baseName);
          selectedTeams.push({
            id: t.id,
            name: t.name,
            logo_url: t.logo_url,
            rating: t.rating || 78,
            season: t.season
          });
        }
        if (selectedTeams.length >= 35) break;
      }

      const userTeam = {
        id: 7777,
        name: userTeamName || 'My Draft XI',
        logo_url: 'https://media.api-sports.io/football/leagues/2.png',
        rating: userRating,
        isUser: true,
      };

      const finalOpponents = selectedTeams.slice(0, 35);

      const allCompetitors = [userTeam, ...finalOpponents].map((team) => ({
        ...team,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gd: 0,
        gs: 0,
        ga: 0,
        fixtures: [],
        playedAgainst: [],
      }));

      setSwissStandings(allCompetitors);
      setSwissRound(1);
      
      // Generate initial pairings for Round 1
      const firstPairings = generateSwissPairings(allCompetitors);
      setUpcomingPairings(firstPairings);

      setSwissRoundSimulated(false);
      setKnockoutSimulated(false);
      setKnockoutStages(null);
      setRecentFixtures([]);
      setTournamentState('SWISS');
      setTournamentGoals({});
      setTournamentAssists({});
      setUserCampaignStats({
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gs: 0,
        ga: 0,
        highestStage: 'Swiss Stage',
        scorers: {},
        assists: {},
      });
      setFeaturedMatchIndex(0);
      setLiveMatches([]);

      // Batch-fetch squad player rosters for database teams
      const dbTeamsToFetch = selectedTeams;
      if (dbTeamsToFetch.length > 0) {
        const teamSeasonsParam = dbTeamsToFetch.map(t => `${t.id}:${t.season}`).join(',');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const playersResponse = await fetch(`${apiBase}/api/players/batch?teamSeasons=${teamSeasonsParam}&_cb=${Date.now()}`);
        if (playersResponse.ok) {
          const allPlayers = await playersResponse.json();
          const mapping = {};
          allPlayers.forEach(p => {
            const key = `${p.team_id}|${p.ucl_season}`;
            if (!mapping[key]) mapping[key] = [];
            mapping[key].push(p);
          });
          setSquadsMap(mapping);

          // Dynamically recalculate team average ratings based on their fetched top 11 players
          const updateTeamRating = (team) => {
            if (team.isUser) return team;
            const squad = mapping[`${team.id}|${team.season}`];
            if (squad && squad.length > 0) {
              const ratings = squad.map(p => p.rating).sort((a, b) => b - a);
              const top11 = ratings.slice(0, 11);
              const avg = Math.round(top11.reduce((sum, r) => sum + r, 0) / top11.length);
              return { ...team, rating: avg };
            }
            return team;
          };

          setSwissStandings(prev => prev.map(updateTeamRating));
          setUpcomingPairings(prev => prev.map(([tA, tB]) => [updateTeamRating(tA), updateTeamRating(tB)]));
        }
      }
    } catch (err) {
      console.error('Error starting simulator:', err);
    }
  };

  // Match Simulation core engine
  const simulateMatch = (teamA, teamB, isNeutral = false) => {
    const rA = teamA.rating + (isNeutral ? 0 : 2); // Home advantage of +2
    const rB = teamB.rating;
    const ratingDiff = rA - rB;

    // Revamped simulation engine:
    // 1. Calculate performance score with random variance (e.g. form/luck on the day)
    const variance = 8;
    const perfA = rA + (Math.random() - 0.5) * variance;
    const perfB = rB + (Math.random() - 0.5) * variance;
    const perfDiff = perfA - perfB;

    // 2. Map performance difference to expected goals
    let lambdaA = Math.max(0.1, 1.25 + perfDiff * 0.15);
    let lambdaB = Math.max(0.1, 1.25 - perfDiff * 0.15);

    // If performance gap is large, severely penalize the expected goals of the weaker team
    if (perfDiff > 6) {
      lambdaB = Math.max(0.01, lambdaB - (perfDiff - 6) * 0.08);
    } else if (perfDiff < -6) {
      lambdaA = Math.max(0.01, lambdaA - (-perfDiff - 6) * 0.08);
    }

    const getGoals = (lambda) => {
      let L = Math.exp(-lambda);
      let k = 0;
      let p = 1.0;
      do {
        k++;
        p *= Math.random();
      } while (p > L && k < 10);
      return k - 1;
    };

    let goalsA = getGoals(lambdaA);
    let goalsB = getGoals(lambdaB);

    // 3. Strict capping rules for rating differences to prevent unrealistic outcomes
    // For moderate rating differences (>= 6)
    if (ratingDiff >= 6) {
      if (goalsB > 2) goalsB = 1;
      else if (goalsB === 2 && Math.random() > 0.3) goalsB = Math.random() > 0.5 ? 1 : 0;
    } else if (ratingDiff <= -6) {
      if (goalsA > 2) goalsA = 1;
      else if (goalsA === 2 && Math.random() > 0.3) goalsA = Math.random() > 0.5 ? 1 : 0;
    }

    // For large rating differences (>= 12)
    if (ratingDiff >= 12) {
      if (goalsB > 1) goalsB = 0;
      else if (goalsB === 1 && Math.random() > 0.1) goalsB = 0;
      if (goalsA === 0 && Math.random() > 0.2) goalsA = 1 + Math.floor(Math.random() * 2);
    } else if (ratingDiff <= -12) {
      if (goalsA > 1) goalsA = 0;
      else if (goalsA === 1 && Math.random() > 0.1) goalsA = 0;
      if (goalsB === 0 && Math.random() > 0.2) goalsB = 1 + Math.floor(Math.random() * 2);
    }

    return { goalsA, goalsB };
  };

  // 2. Simulate one round of Swiss stage
  const simulateSwissRound = () => {
    if (swissRound > 8 || isSimulating) return;

    const paired = upcomingPairings;

    const updatedStandings = swissStandings.map(team => ({ ...team }));
    const matchesData = [];
    const newGoalsMap = { ...tournamentGoals };
    const newAssistsMap = { ...tournamentAssists };

    paired.forEach(([tA, tB]) => {
      const { goalsA, goalsB } = simulateMatch(tA, tB, false);

      const goalMinutesA = generateGoalMinutes(goalsA, 90, 0);
      const goalMinutesB = generateGoalMinutes(goalsB, 90, 0);

      const { events, scorersA, scorersB } = generateMatchEvents(tA, tB, goalsA, goalsB, goalMinutesA, goalMinutesB);

      // Record campaign stats
      updateUserStats(tA, tB, goalsA, goalsB, scorersA, scorersB);

      scorersA.forEach(s => {
        const key = `${s.name}|${tA.name}`;
        if (!newGoalsMap[key]) {
          newGoalsMap[key] = { name: s.name, teamName: tA.name, teamLogo: tA.logo_url, goals: 0 };
        }
        newGoalsMap[key].goals += 1;

        if (s.assistor) {
          const aKey = `${s.assistor}|${tA.name}`;
          if (!newAssistsMap[aKey]) {
            newAssistsMap[aKey] = { name: s.assistor, teamName: tA.name, teamLogo: tA.logo_url, assists: 0 };
          }
          newAssistsMap[aKey].assists += 1;
        }
      });

      scorersB.forEach(s => {
        const key = `${s.name}|${tB.name}`;
        if (!newGoalsMap[key]) {
          newGoalsMap[key] = { name: s.name, teamName: tB.name, teamLogo: tB.logo_url, goals: 0 };
        }
        newGoalsMap[key].goals += 1;

        if (s.assistor) {
          const aKey = `${s.assistor}|${tB.name}`;
          if (!newAssistsMap[aKey]) {
            newAssistsMap[aKey] = { name: s.assistor, teamName: tB.name, teamLogo: tB.logo_url, assists: 0 };
          }
          newAssistsMap[aKey].assists += 1;
        }
      });

      const stats = generateMatchStats(tA, tB, goalsA, goalsB);

      matchesData.push({
        pairId: `${tA.id}-${tB.id}`,
        teamA: tA,
        teamB: tB,
        finalScoreA: goalsA,
        finalScoreB: goalsB,
        goalMinutesA,
        goalMinutesB,
        events,
        stats,
        isUser: tA.isUser || tA.id === 7777 || tB.isUser || tB.id === 7777,
      });

      const idxA = updatedStandings.findIndex(t => t.id === tA.id);
      const idxB = updatedStandings.findIndex(t => t.id === tB.id);

      updatedStandings[idxA].played += 1;
      updatedStandings[idxB].played += 1;
      updatedStandings[idxA].gs += goalsA;
      updatedStandings[idxB].gs += goalsB;
      updatedStandings[idxA].ga += goalsB;
      updatedStandings[idxB].ga += goalsA;
      updatedStandings[idxA].gd += (goalsA - goalsB);
      updatedStandings[idxB].gd += (goalsB - goalsA);

      // Record played histories
      if (!updatedStandings[idxA].playedAgainst) {
        updatedStandings[idxA].playedAgainst = [];
      }
      if (!updatedStandings[idxB].playedAgainst) {
        updatedStandings[idxB].playedAgainst = [];
      }
      updatedStandings[idxA].playedAgainst.push(tB.id);
      updatedStandings[idxB].playedAgainst.push(tA.id);

      if (goalsA > goalsB) {
        updatedStandings[idxA].points += 3;
        updatedStandings[idxA].won += 1;
        updatedStandings[idxB].lost += 1;
      } else if (goalsA < goalsB) {
        updatedStandings[idxB].points += 3;
        updatedStandings[idxB].won += 1;
        updatedStandings[idxA].lost += 1;
      } else {
        updatedStandings[idxA].points += 1;
        updatedStandings[idxB].points += 1;
        updatedStandings[idxA].drawn += 1;
        updatedStandings[idxB].drawn += 1;
      }
    });

    setLiveMatches(matchesData);
    setNextSwissStandings(updatedStandings);
    setNextSwissRound(swissRound < 8 ? swissRound + 1 : swissRound);
    setNextTournamentState(swissRound < 8 ? 'SWISS' : 'POST_SWISS');
    setTournamentGoals(newGoalsMap);
    setTournamentAssists(newAssistsMap);
    setSimMinute(0);
    setSimType('SWISS');
    setIsSimulating(true);

    const userIdx = matchesData.findIndex(m => m.isUser);
    setFeaturedMatchIndex(userIdx >= 0 ? userIdx : 0);
  };

  // 3. Set Up Knockout Stages
  const enterKnockouts = () => {
    const finalStandings = [...swissStandings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gs - a.gs;
    });

    const top8 = finalStandings.slice(0, 8);
    const playoffTeams = finalStandings.slice(8, 24);

    const playoffPairs = [];
    for (let i = 0; i < 8; i++) {
      playoffPairs.push({
        teamA: playoffTeams[i],
        teamB: playoffTeams[15 - i],
        score1A: null,
        score1B: null,
        score2A: null,
        score2B: null,
        aggregateA: null,
        aggregateB: null,
        winner: null,
      });
    }

    // Determine user's highest stage after Swiss
    const userIndex = finalStandings.findIndex(t => t.isUser || t.id === 7777);
    let stage = 'Swiss Stage';
    if (userIndex >= 0 && userIndex < 8) {
      stage = 'Round of 16';
    } else if (userIndex >= 8 && userIndex < 24) {
      stage = 'Play-offs';
    }
    setUserCampaignStats(prev => ({
      ...prev,
      highestStage: stage
    }));

    const initialStages = {
      'Play-offs': playoffPairs,
      'Round of 16': Array.from({ length: 8 }).map((_, i) => ({
        teamA: top8[i],
        teamB: { name: `Play-off Winner ${8 - i}`, logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        score1A: null, score1B: null, score2A: null, score2B: null, aggregateA: null, aggregateB: null, winner: null
      })),
      'Quarter-finals': Array.from({ length: 4 }).map((_, i) => ({
        teamA: { name: 'RO16 Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        teamB: { name: 'RO16 Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        score1A: null, score1B: null, score2A: null, score2B: null, aggregateA: null, aggregateB: null, winner: null
      })),
      'Semi-finals': Array.from({ length: 2 }).map((_, i) => ({
        teamA: { name: 'QF Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        teamB: { name: 'QF Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        score1A: null, score1B: null, score2A: null, score2B: null, aggregateA: null, aggregateB: null, winner: null
      })),
      'Final': Array.from({ length: 1 }).map((_, i) => ({
        teamA: { name: 'SF Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        teamB: { name: 'SF Winner', logo_url: 'https://media.api-sports.io/football/leagues/2.png', rating: '?', isPlaceholder: true },
        score1A: null, score1B: null, aggregateA: null, aggregateB: null, winner: null
      })),
      champion: null
    };
    setKnockoutStages(initialStages);

    setKnockoutBracket({
      stage: 'Play-offs',
      pairs: playoffPairs,
      qualifiedTop8: top8,
    });
    setTournamentState('PLAYOFFS');
    setLiveMatches([]);
    setFeaturedMatchIndex(0);
  };

  const simulateKnockoutRound = () => {
    if (!knockoutBracket || isSimulating) return;

    const isFinal = knockoutBracket.stage === 'Final';
    
    // Check if we are simulating Leg 1 or Leg 2
    const isLeg1 = !isFinal && (knockoutBracket.pairs[0].score1A === null);

    const matchesData = [];
    const newGoalsMap = { ...tournamentGoals };
    const newAssistsMap = { ...tournamentAssists };

    if (isFinal) {
      // Single leg Final
      const pair = knockoutBracket.pairs[0];
      const { goalsA, goalsB } = simulateMatch(pair.teamA, pair.teamB, true);
      let penaltyWinner = null;
      let penalties = null;
      if (goalsA === goalsB) {
        penaltyWinner = Math.random() > 0.5 ? 'A' : 'B';
        penalties = penaltyWinner === 'A' ? '5-4' : '4-5';
      }

      const goalMinutes1A = generateGoalMinutes(goalsA, 90, 0);
      const goalMinutes1B = generateGoalMinutes(goalsB, 90, 0);

      const { events, scorersA, scorersB } = generateMatchEvents(pair.teamA, pair.teamB, goalsA, goalsB, goalMinutes1A, goalMinutes1B);
      const stats = generateMatchStats(pair.teamA, pair.teamB, goalsA, goalsB);

      // Record campaign stats
      updateUserStats(pair.teamA, pair.teamB, goalsA, goalsB, scorersA, scorersB);

      // Check if user was in final and update highest stage reached
      const isUserInFinal = pair.teamA.isUser || pair.teamA.id === 7777 || pair.teamB.isUser || pair.teamB.id === 7777;
      if (isUserInFinal) {
        const userWon = (goalsA > goalsB || penaltyWinner === 'A') ? (pair.teamA.isUser || pair.teamA.id === 7777) : (pair.teamB.isUser || pair.teamB.id === 7777);
        setUserCampaignStats(prev => ({
          ...prev,
          highestStage: userWon ? 'Champion' : 'Runner-up'
        }));
      }

      scorersA.forEach(s => {
        const key = `${s.name}|${pair.teamA.name}`;
        if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, goals: 0 };
        newGoalsMap[key].goals += 1;

        if (s.assistor) {
          const aKey = `${s.assistor}|${pair.teamA.name}`;
          if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, assists: 0 };
          newAssistsMap[aKey].assists += 1;
        }
      });
      scorersB.forEach(s => {
        const key = `${s.name}|${pair.teamB.name}`;
        if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, goals: 0 };
        newGoalsMap[key].goals += 1;

        if (s.assistor) {
          const aKey = `${s.assistor}|${pair.teamB.name}`;
          if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, assists: 0 };
          newAssistsMap[aKey].assists += 1;
        }
      });

      matchesData.push({
        pairId: `${pair.teamA.id}-${pair.teamB.id}`,
        teamA: pair.teamA,
        teamB: pair.teamB,
        isFinal: true,
        finalScore1A: goalsA,
        finalScore1B: goalsB,
        goalMinutes1A,
        goalMinutes1B,
        finalScore2A: null,
        finalScore2B: null,
        events,
        stats,
        isUser: pair.teamA.isUser || pair.teamA.id === 7777 || pair.teamB.isUser || pair.teamB.id === 7777,
      });

      const updatedPairs = [{
        ...pair,
        score1A: goalsA,
        score1B: goalsB,
        aggregateA: goalsA,
        aggregateB: goalsB,
        winner: (goalsA > goalsB || penaltyWinner === 'A') ? pair.teamA : pair.teamB,
        penalties,
      }];

      setLiveMatches(matchesData);
      setNextKnockoutBracket({
        ...knockoutBracket,
        pairs: updatedPairs,
      });
      setTournamentGoals(newGoalsMap);
      setTournamentAssists(newAssistsMap);
      setSimMinute(0);
      setSimType('FINAL');
      setIsSimulating(true);

      const userIdx = matchesData.findIndex(m => m.isUser);
      setFeaturedMatchIndex(userIdx >= 0 ? userIdx : 0);

    } else if (isLeg1) {
      // Simulate Leg 1 only!
      const simulatedPairs = knockoutBracket.pairs.map((pair) => {
        const leg1 = simulateMatch(pair.teamA, pair.teamB, false);
        const goalMinutes1A = generateGoalMinutes(leg1.goalsA, 90, 0);
        const goalMinutes1B = generateGoalMinutes(leg1.goalsB, 90, 0);

        const { events, scorersA, scorersB } = generateMatchEvents(pair.teamA, pair.teamB, leg1.goalsA, leg1.goalsB, goalMinutes1A, goalMinutes1B);
        const stats = generateMatchStats(pair.teamA, pair.teamB, leg1.goalsA, leg1.goalsB);

        // Record campaign stats
        updateUserStats(pair.teamA, pair.teamB, leg1.goalsA, leg1.goalsB, scorersA, scorersB);

        // Update goals and assists
        scorersA.forEach(s => {
          const key = `${s.name}|${pair.teamA.name}`;
          if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, goals: 0 };
          newGoalsMap[key].goals += 1;

          if (s.assistor) {
            const aKey = `${s.assistor}|${pair.teamA.name}`;
            if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, assists: 0 };
            newAssistsMap[aKey].assists += 1;
          }
        });
        scorersB.forEach(s => {
          const key = `${s.name}|${pair.teamB.name}`;
          if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, goals: 0 };
          newGoalsMap[key].goals += 1;

          if (s.assistor) {
            const aKey = `${s.assistor}|${pair.teamB.name}`;
            if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, assists: 0 };
            newAssistsMap[aKey].assists += 1;
          }
        });

        matchesData.push({
          pairId: `${pair.teamA.id}-${pair.teamB.id}`,
          teamA: pair.teamA,
          teamB: pair.teamB,
          isFinal: false,
          finalScore1A: leg1.goalsA,
          finalScore1B: leg1.goalsB,
          goalMinutes1A,
          goalMinutes1B,
          finalScore2A: null,
          finalScore2B: null,
          goalMinutes2A: [],
          goalMinutes2B: [],
          events,
          stats1: stats,
          isUser: pair.teamA.isUser || pair.teamA.id === 7777 || pair.teamB.isUser || pair.teamB.id === 7777,
        });

        return {
          ...pair,
          score1A: leg1.goalsA,
          score1B: leg1.goalsB,
        };
      });

      setLiveMatches(matchesData);
      setNextKnockoutBracket({
        ...knockoutBracket,
        pairs: simulatedPairs,
      });
      setTournamentGoals(newGoalsMap);
      setTournamentAssists(newAssistsMap);
      setSimMinute(0);
      setSimType('KNOCKOUT_LEG1');
      setIsSimulating(true);

      const userIdx = matchesData.findIndex(m => m.isUser);
      setFeaturedMatchIndex(userIdx >= 0 ? userIdx : 0);

    } else {
      // Simulate Leg 2!
      const simulatedPairs = knockoutBracket.pairs.map((pair) => {
        const oldMatch = liveMatches.find(m => m.pairId === `${pair.teamA.id}-${pair.teamB.id}`);

        // Leg 2 (teamB home, teamA away)
        const leg2 = simulateMatch(pair.teamB, pair.teamA, false);
        const goalMinutes2A = generateGoalMinutes(leg2.goalsB, 90, 90); // teamA away goals
        const goalMinutes2B = generateGoalMinutes(leg2.goalsA, 90, 90); // teamB home goals

        const aggA = pair.score1A + leg2.goalsB;
        const aggB = pair.score1B + leg2.goalsA;
        let winner = null;
        let penalties = null;

        if (aggA > aggB) {
          winner = pair.teamA;
        } else if (aggB > aggA) {
          winner = pair.teamB;
        } else {
          const pen = Math.random() > 0.5;
          winner = pen ? pair.teamA : pair.teamB;
          penalties = pen ? '5-4' : '4-5';
        }

        const events2 = generateMatchEvents(pair.teamB, pair.teamA, leg2.goalsA, leg2.goalsB, goalMinutes2B, goalMinutes2A);
        const mappedEvents2 = events2.events.map(ev => ({
          ...ev,
          team: ev.team === 'A' ? 'B' : 'A' // invert to match pairs A/B
        }));
        
        const combinedEvents = [...(oldMatch?.events || []), ...mappedEvents2];
        const stats2 = generateMatchStats(pair.teamB, pair.teamA, leg2.goalsA, leg2.goalsB);

        // Record campaign stats
        updateUserStats(pair.teamB, pair.teamA, leg2.goalsA, leg2.goalsB, events2.scorersA, events2.scorersB);

        // Update goals and assists
        events2.scorersA.forEach(s => {
          const key = `${s.name}|${pair.teamB.name}`;
          if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, goals: 0 };
          newGoalsMap[key].goals += 1;

          if (s.assistor) {
            const aKey = `${s.assistor}|${pair.teamB.name}`;
            if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamB.name, teamLogo: pair.teamB.logo_url, assists: 0 };
            newAssistsMap[aKey].assists += 1;
          }
        });
        events2.scorersB.forEach(s => {
          const key = `${s.name}|${pair.teamA.name}`;
          if (!newGoalsMap[key]) newGoalsMap[key] = { name: s.name, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, goals: 0 };
          newGoalsMap[key].goals += 1;

          if (s.assistor) {
            const aKey = `${s.assistor}|${pair.teamA.name}`;
            if (!newAssistsMap[aKey]) newAssistsMap[aKey] = { name: s.assistor, teamName: pair.teamA.name, teamLogo: pair.teamA.logo_url, assists: 0 };
            newAssistsMap[aKey].assists += 1;
          }
        });

        // Merge Leg 2 data into matchesData
        matchesData.push({
          ...oldMatch,
          finalScore2A: leg2.goalsB,
          finalScore2B: leg2.goalsA,
          goalMinutes2A,
          goalMinutes2B,
          events: combinedEvents,
          stats2,
        });

        return {
          ...pair,
          score2A: leg2.goalsB,
          score2B: leg2.goalsA,
          aggregateA: aggA,
          aggregateB: aggB,
          winner,
          penalties,
        };
      });

      setLiveMatches(matchesData);
      setNextKnockoutBracket({
        ...knockoutBracket,
        pairs: simulatedPairs,
      });
      setTournamentGoals(newGoalsMap);
      setTournamentAssists(newAssistsMap);
      setSimMinute(90);
      setSimType('KNOCKOUT_LEG2');
      setIsSimulating(true);

      const userIdx = matchesData.findIndex(m => m.isUser);
      setFeaturedMatchIndex(userIdx >= 0 ? userIdx : 0);
    }
  };

  const proceedToNextKnockoutRound = () => {
    if (!knockoutBracket) return;

    const winners = knockoutBracket.pairs.map(p => p.winner);

    // Update highest stage reached if user won
    const userIndexInWinners = winners.findIndex(w => w && (w.isUser || w.id === 7777));
    if (userIndexInWinners >= 0) {
      let nextHighest = 'Swiss Stage';
      if (knockoutBracket.stage === 'Play-offs') nextHighest = 'Round of 16';
      else if (knockoutBracket.stage === 'Round of 16') nextHighest = 'Quarter-finals';
      else if (knockoutBracket.stage === 'Quarter-finals') nextHighest = 'Semi-finals';
      else if (knockoutBracket.stage === 'Semi-finals') nextHighest = 'Runner-up';
      
      setUserCampaignStats(prev => ({
        ...prev,
        highestStage: nextHighest
      }));
    }

    let nextStage = '';
    let nextPairs = [];
    let nextState = '';

    if (knockoutBracket.stage === 'Play-offs') {
      nextStage = 'Round of 16';
      nextState = 'RO16';
      const ro16Pool = [...knockoutBracket.qualifiedTop8, ...winners];
      for (let i = 0; i < 8; i++) {
        nextPairs.push({
          teamA: ro16Pool[i],
          teamB: ro16Pool[15 - i],
          score1A: null, score1B: null, score2A: null, score2B: null,
          aggregateA: null, aggregateB: null, winner: null,
        });
      }
    } else if (knockoutBracket.stage === 'Round of 16') {
      nextStage = 'Quarter-finals';
      nextState = 'QF';
      for (let i = 0; i < 4; i++) {
        nextPairs.push({
          teamA: winners[i],
          teamB: winners[7 - i],
          score1A: null, score1B: null, score2A: null, score2B: null,
          aggregateA: null, aggregateB: null, winner: null,
        });
      }
    } else if (knockoutBracket.stage === 'Quarter-finals') {
      nextStage = 'Semi-finals';
      nextState = 'SF';
      for (let i = 0; i < 2; i++) {
        nextPairs.push({
          teamA: winners[i],
          teamB: winners[3 - i],
          score1A: null, score1B: null, score2A: null, score2B: null,
          aggregateA: null, aggregateB: null, winner: null,
        });
      }
    } else if (knockoutBracket.stage === 'Semi-finals') {
      nextStage = 'Final';
      nextState = 'FINAL';
      nextPairs.push({
        teamA: winners[0],
        teamB: winners[1],
        score1A: null, score1B: null,
        aggregateA: null, aggregateB: null, winner: null,
      });
    } else if (knockoutBracket.stage === 'Final') {
      const champion = winners[0];
      setTournamentState('CHAMPION');
      setKnockoutBracket({
        ...knockoutBracket,
        champion,
      });
      setKnockoutSimulated(false);
      return;
    }

    setKnockoutBracket({
      stage: nextStage,
      pairs: nextPairs,
      qualifiedTop8: knockoutBracket.qualifiedTop8,
    });
    setTournamentState(nextState);
    setKnockoutSimulated(false);
    setLiveMatches([]);
    setFeaturedMatchIndex(0);
  };

  useEffect(() => {
    setActiveUserSquad(userSquad);
    initTournament();
  }, [userSquad, era]);

  // Sorting helper for current standings view
  const displayStandings = [...swissStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gs - a.gs;
  });

  const isUserAlive = () => {
    if (tournamentState === 'SWISS' || tournamentState === 'POST_SWISS') return true;
    if (!knockoutBracket) return false;
    
    // Check if user is in any of the current pairs
    const inCurrentPairs = knockoutBracket.pairs.some(p => 
      (p.teamA && (p.teamA.isUser || p.teamA.id === 7777)) || 
      (p.teamB && (p.teamB.isUser || p.teamB.id === 7777))
    );
    if (inCurrentPairs) return true;

    // If we are in PLAYOFFS or stage is Play-offs, the user is also alive if they qualified directly to top 8 and are waiting
    if ((tournamentState === 'PLAYOFFS' || knockoutBracket.stage === 'Play-offs') && knockoutBracket.qualifiedTop8) {
      return knockoutBracket.qualifiedTop8.some(t => t.isUser || t.id === 7777);
    }

    return false;
  };

  // Get upcoming pairings for preview mode
  const getUpcomingSwissPairings = () => {
    return upcomingPairings;
  };

  // Auto-select user match as featured when round/stage changes in preview mode
  useEffect(() => {
    if (isSimulating) return; // don't override active selection during simulation

    // Check if the round, state, or knockout stage has actually changed
    const roundChanged = lastRoundRef.current !== swissRound;
    const stateChanged = lastStateRef.current !== tournamentState;
    const koStageChanged = lastKoStageRef.current !== knockoutBracket?.stage;

    // Update refs
    lastRoundRef.current = swissRound;
    lastStateRef.current = tournamentState;
    lastKoStageRef.current = knockoutBracket?.stage;

    // Only auto-select user match if there is a genuine round/stage transition
    if (roundChanged || stateChanged || koStageChanged) {
      if (liveMatches && liveMatches.length > 0) return; // DO NOT override selection if we are showing results!

      if (tournamentState === 'SWISS') {
        const pairings = getUpcomingSwissPairings();
        const userIdx = pairings.findIndex(([tA, tB]) => tA.isUser || tB.isUser);
        if (userIdx >= 0) setFeaturedMatchIndex(userIdx);
      } else if (knockoutBracket && knockoutBracket.pairs) {
        const userIdx = knockoutBracket.pairs.findIndex(p => 
          (p.teamA && (p.teamA.isUser || p.teamA.id === 7777)) || 
          (p.teamB && (p.teamB.isUser || p.teamB.id === 7777))
        );
        if (userIdx >= 0) {
          setFeaturedMatchIndex(userIdx);
        } else {
          // User not in knockouts (eliminated or waiting in top 8 during play-offs), select first match
          setFeaturedMatchIndex(0);
        }
      }
    }
  }, [swissRound, tournamentState, knockoutBracket?.stage, isSimulating, liveMatches.length]);

  // Resolve active fixtures list based on current state
  const getActiveFixtures = () => {
    if (liveMatches && liveMatches.length > 0) {
      return liveMatches;
    }
    // Preview mode
    if (tournamentState === 'SWISS') {
      return getUpcomingSwissPairings().map(([tA, tB]) => ({
        teamA: tA,
        teamB: tB,
        finalScoreA: null,
        finalScoreB: null,
        isUser: tA.isUser || tB.isUser,
        isPreview: true
      }));
    }
    if (knockoutBracket) {
      return knockoutBracket.pairs.map(p => ({
        teamA: p.teamA,
        teamB: p.teamB,
        finalScoreA: null,
        finalScoreB: null,
        isUser: p.teamA.isUser || p.teamB.isUser,
        isPreview: true
      }));
    }
    return [];
  };

  const activeFixtures = getActiveFixtures();
  const featuredMatch = activeFixtures[featuredMatchIndex];

  // Pick top player from squad for preview info
  const getTopPlayer = (team) => {
    const squad = getTeamSquad(team);
    if (!squad || squad.length === 0) return 'Key Player';
    const sorted = [...squad].sort((a, b) => b.rating - a.rating);
    return `${sorted[0].name} (OVR ${sorted[0].rating})`;
  };

  // Convert top scorers into list
  const displayTopScorers = Object.values(tournamentGoals)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);

  // Convert top assistors into list
  const displayTopAssistors = Object.values(tournamentAssists)
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);

  // Confetti overlay component for champion coronation
  const ConfettiRain = () => {
    const colors = ['#00f0ff', '#f2cc60', '#ff4a5a', '#00ff66', '#d2a8ff'];
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 5;
          const duration = 3 + Math.random() * 3;
          const size = 6 + Math.random() * 6;
          const color = colors[Math.floor(Math.random() * colors.length)];
          return (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                backgroundColor: color,
                width: `${size}px`,
                height: `${size * 1.5}px`
              }}
            />
          );
        })}
      </div>
    );
  };

  const BracketCard = ({ pair, stage, index, isCurrentStage }) => {
    const isUserPair = pair.teamA?.isUser || pair.teamB?.isUser;
    const isFeatured = isCurrentStage && featuredMatchIndex === index;

    let score1A = pair.score1A;
    let score1B = pair.score1B;
    let score2A = pair.score2A;
    let score2B = pair.score2B;
    let aggA = pair.aggregateA;
    let aggB = pair.aggregateB;
    let winner = pair.winner;
    let penalties = pair.penalties;

    if (isSimulating && isCurrentStage) {
      const lm = liveMatches.find(m => m.pairId === `${pair.teamA.id}-${pair.teamB.id}`);
      if (lm) {
        if (lm.isFinal) {
          score1A = lm.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute).length;
          score1B = lm.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute).length;
          score2A = null;
          score2B = null;
          aggA = score1A;
          aggB = score1B;
          winner = null;
          penalties = null;
        } else {
          if (simMinute <= 90) {
            score1A = lm.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute).length;
            score1B = lm.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute).length;
            score2A = null;
            score2B = null;
            aggA = score1A;
            aggB = score1B;
            winner = null;
            penalties = null;
          } else {
            score1A = lm.finalScore1A;
            score1B = lm.finalScore1B;
            score2A = lm.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute > 90 && e.minute <= simMinute).length;
            score2B = lm.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute > 90 && e.minute <= simMinute).length;
            aggA = score1A + score2A;
            aggB = score1B + score2B;
            winner = null;
            penalties = null;
          }
        }
      }
    }

    const handleCardClick = () => {
      if (isCurrentStage) {
        setFeaturedMatchIndex(index);
      }
    };

    return (
      <div
        onClick={handleCardClick}
        style={{
          ...styles.bracketCard,
          ...(isUserPair ? styles.userFixtureRow : {}),
          border: isFeatured ? '1px solid var(--cyan-glow)' : '1px solid var(--panel-border)',
          borderLeft: winner 
            ? '3px solid var(--success)' 
            : (isFeatured ? '3px solid var(--cyan-glow)' : '1px solid var(--panel-border)'),
          boxShadow: isFeatured ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
          cursor: isCurrentStage ? 'pointer' : 'default',
          opacity: pair.isPlaceholder ? 0.5 : 1,
        }}
      >
        <div style={styles.bracketTeamLine}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <img src={pair.teamA.logo_url} style={styles.bracketTeamLogo} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
            <span style={{ fontSize: '0.62rem', fontWeight: pair.winner && pair.winner.id === pair.teamA.id ? '700' : '400' }}>
              {pair.isPlaceholder ? pair.teamA.name : renderTeamNameWithYear(pair.teamA.name, pair.teamA.isUser)}
            </span>
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: '700' }}>
            {score1A !== null ? score1A : '-'}
            {score2A !== null ? ` (${score2A})` : ''}
          </span>
        </div>
        <div style={styles.bracketTeamLine}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <img src={pair.teamB.logo_url} style={styles.bracketTeamLogo} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
            <span style={{ fontSize: '0.62rem', fontWeight: pair.winner && pair.winner.id === pair.teamB.id ? '700' : '400' }}>
              {pair.isPlaceholder ? pair.teamB.name : renderTeamNameWithYear(pair.teamB.name, pair.teamB.isUser)}
            </span>
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: '700' }}>
            {score1B !== null ? score1B : '-'}
            {score2B !== null ? ` (${score2B})` : ''}
          </span>
        </div>
        {(aggA !== null || penalties) && (
          <div style={styles.bracketCardSummary}>
            <span>Agg: {aggA} - {aggB}</span>
            {penalties && <span style={{ color: 'var(--gold)', fontSize: '0.5rem' }}> (pens {penalties})</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.simWrapper} className="animate-fade-in">
      <style>{`
        @keyframes pulse-live {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(800px) rotate(360deg); opacity: 0; }
        }
        .live-pulse-dot {
          width: 8px;
          height: 8px;
          background-color: var(--danger);
          border-radius: 50%;
          animation: pulse-live 1.5s infinite;
          display: inline-block;
          margin-right: 6px;
        }
        .confetti {
          position: absolute;
          width: 8px;
          height: 12px;
          border-radius: 2px;
          animation: confetti-fall 4s linear infinite;
        }
        .ucl-hud-score {
          font-family: var(--font-title), sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 2px;
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }
        .hud-stats-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-align: center;
        }
        .hud-stats-val {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
        }
        .timeline-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 240, 255, 0.2);
          border-radius: 2px;
        }
        .fixture-card-hover {
          transition: all 0.2s ease;
        }
        .fixture-card-hover:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(0, 240, 255, 0.3) !important;
        }
      `}</style>

      {/* Header Bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>UCL Tournament Simulator</h2>
          <p style={styles.subtitle}>
            Era: {era} | Squad OVR: <span style={{ color: 'var(--cyan-glow)', fontWeight: '700' }}>{userRating}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {swissRound === 1 && recentFixtures.length === 0 && (
            <button className="btn-secondary" onClick={() => setShowLineupManager(true)} disabled={isSimulating}>
              <Users size={16} style={{ marginRight: '6px' }} /> Manage Lineup
            </button>
          )}
          <button className="btn-secondary" onClick={onReset} disabled={isSimulating}>
            Draft New Team
          </button>
        </div>
      </div>

      {/* Champion Coronation View */}
      {tournamentState === 'CHAMPION' && knockoutBracket?.champion && (
        <div className="glass-panel" style={{
          ...styles.coronationCard,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '30px',
          padding: '40px 30px',
          alignItems: 'stretch',
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <ConfettiRain />
          
          {/* Left Column: Champion Showcase */}
          <div style={{
            flex: '1 1 400px',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            justifyContent: 'center',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            paddingRight: '30px',
          }}>
            <div style={styles.trophyWrapper}>
              <Trophy size={96} color="var(--gold)" style={{ filter: 'drop-shadow(0 0 25px var(--gold))', animation: 'pulse-live 2s infinite' }} />
            </div>
            <h1 style={styles.coronationTitle}>CHAMPIONS OF EUROPE</h1>
            <div style={styles.coronationLogoContainer}>
              <img src={knockoutBracket.champion.logo_url} alt="" style={styles.coronationLogo} onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
            </div>
            <h2 style={styles.coronationTeamName}>{renderTeamNameWithYear(knockoutBracket.champion.name, knockoutBracket.champion.isUser)}</h2>
            <p style={styles.coronationSub}>UEFA Champions League {era} Winner</p>
            
            <div style={{ ...styles.coronationAwards, gridTemplateColumns: '1fr 1fr' }}>
              <div style={styles.awardItem}>
                <Medal size={24} color="var(--cyan-glow)" />
                <span style={styles.awardLabel}>Tournament Golden Boot</span>
                <span style={styles.awardValue}>
                  {displayTopScorers[0] ? `${displayTopScorers[0].name} (${displayTopScorers[0].goals} Goals)` : 'N/A'}
                </span>
              </div>
              <div style={styles.awardItem}>
                <Star size={24} color="var(--gold)" />
                <span style={styles.awardLabel}>Winning Squad Rating</span>
                <span style={styles.awardValue}>OVR {knockoutBracket.champion.rating}</span>
              </div>
            </div>

            <button className="btn-primary" onClick={onReset} style={styles.coronationResetBtn}>
              Play Another Campaign
            </button>
          </div>

          {/* Right Column: Your Campaign Summary & Draft XI */}
          <div style={{
            flex: '1 1 450px',
            maxWidth: '550px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            textAlign: 'left',
            paddingLeft: '10px',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-title)',
              fontSize: '1.4rem',
              color: 'var(--cyan-glow)',
              borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
              paddingBottom: '10px',
              marginBottom: '20px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              Your Campaign Summary
            </h2>

            {/* Campaign Stats Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              marginBottom: '25px',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Stage Reached</span>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '800',
                  color: userCampaignStats.highestStage === 'Champion' ? 'var(--gold)' : userCampaignStats.highestStage === 'Runner-up' ? '#e5e7eb' : 'var(--cyan-glow)',
                  textShadow: userCampaignStats.highestStage === 'Champion' ? '0 0 10px rgba(242,204,96,0.3)' : 'none',
                }}>
                  {userCampaignStats.highestStage}
                </span>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>W-D-L Record</span>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>
                  {userCampaignStats.won}W - {userCampaignStats.drawn}D - {userCampaignStats.lost}L
                </span>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Goals (GF / GA)</span>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>
                  {userCampaignStats.gs} - {userCampaignStats.ga} ({userCampaignStats.gs - userCampaignStats.ga >= 0 ? '+' : ''}{userCampaignStats.gs - userCampaignStats.ga})
                </span>
              </div>
            </div>

            {/* Top Scorer & Assistor Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '25px',
            }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.03)',
                border: '1px solid rgba(0, 240, 255, 0.1)',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--cyan-glow)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Team Top Scorer</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                  {(() => {
                    const sortedScorers = Object.entries(userCampaignStats.scorers).sort((a, b) => b[1] - a[1]);
                    return sortedScorers[0] ? `${sortedScorers[0][0]} (${sortedScorers[0][1]} goals)` : 'No goals';
                  })()}
                </span>
              </div>

              <div style={{
                background: 'rgba(0, 240, 255, 0.03)',
                border: '1px solid rgba(0, 240, 255, 0.1)',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--cyan-glow)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Team Top Assistor</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                  {(() => {
                    const sortedAssists = Object.entries(userCampaignStats.assists).sort((a, b) => b[1] - a[1]);
                    return sortedAssists[0] ? `${sortedAssists[0][0]} (${sortedAssists[0][1]} assists)` : 'No assists';
                  })()}
                </span>
              </div>
            </div>

            {/* Roster Showcase */}
            <h3 style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: 'var(--text-muted)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Your Drafted Roster & Player Contributions
            </h3>
            
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '10px',
              maxHeight: '220px',
              overflowY: 'auto',
            }} className="timeline-scroll">
              {Object.values(activeUserSquad)
                .sort((a, b) => b.rating - a.rating)
                .map((p, idx) => {
                  const goals = userCampaignStats.scorers[p.name] || 0;
                  const assists = userCampaignStats.assists[p.name] || 0;
                  const pos = getCleanGenericPos(p.generic_position);
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderBottom: idx === Object.values(activeUserSquad).length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--cyan-glow)', fontWeight: '700', fontSize: '0.7rem', width: '28px' }}>{pos}</span>
                        <span style={{ color: '#ffffff', fontWeight: '500' }}>{p.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({p.rating})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {goals > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--gold)', fontWeight: '700' }}>
                            ⚽ {goals}
                          </span>
                        )}
                        {assists > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--cyan-glow)', fontWeight: '700' }}>
                            👟 {assists}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {tournamentState !== 'CHAMPION' && (
        <div style={styles.layout} className="sim-layout">
          {/* Left Column: Live Matches dashboard and controls */}
          <div style={styles.leftCol}>
            {/* Dashboard HUD scoreboard */}
            {featuredMatch && (
              <div className="glass-panel" style={styles.hudCard}>
                {/* HUD Header Status */}
                <div style={styles.hudHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isSimulating ? (
                      <>
                        <span className="live-pulse-dot"></span>
                        <span style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>LIVE</span>
                      </>
                    ) : featuredMatch.isPreview ? (
                      <span style={{ color: 'var(--cyan-glow)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>Preview</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>Completed</span>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Spectate:</span>
                      <select
                        value={featuredMatchIndex}
                        onChange={(e) => setFeaturedMatchIndex(parseInt(e.target.value, 10))}
                        style={{
                          background: 'rgba(2, 11, 36, 0.75)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {activeFixtures.map((f, idx) => (
                          <option key={idx} value={idx}>
                            {f.teamA.name} vs {f.teamB.name} {f.isUser ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div style={styles.hudClock}>
                    {isSimulating ? (
                      <span>
                        {simType === 'KNOCKOUT_LEG2'
                          ? `Leg 2 - ${simMinute - 90}'`
                          : simType === 'KNOCKOUT_LEG1'
                            ? `Leg 1 - ${simMinute}'`
                            : `${simMinute}'`
                        }
                      </span>
                    ) : featuredMatch.isPreview ? (
                      <span>PRE-MATCH</span>
                    ) : (
                      <span>
                        FULL TIME 
                        {simType === 'KNOCKOUT_LEG1' ? ' (LEG 1)' : simType === 'KNOCKOUT_LEG2' ? ' (LEG 2)' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Ticker score view */}
                <div style={styles.hudScoreboardRow}>
                  {/* Team A Info */}
                  <div style={styles.hudTeamCol}>
                    <img src={featuredMatch.teamA.logo_url} alt="" style={styles.hudLogo} onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
                    <span style={styles.hudTeamName}>
                      {renderTeamNameWithYear(featuredMatch.teamA.name, featuredMatch.teamA.isUser)}
                      {featuredMatch.teamA.isUser && <span className="user-tag" style={{ marginLeft: '4px' }}>(YOU)</span>}
                    </span>
                    <span style={styles.hudTeamRating}>OVR {featuredMatch.teamA.rating}</span>
                  </div>

                  {/* Score or VS */}
                  <div style={styles.hudScoreCol}>
                    {featuredMatch.isPreview ? (
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--panel-border)' }}>VS</span>
                    ) : (
                      <div className="ucl-hud-score">
                        {simType === 'KNOCKOUT_LEG2' ? (
                          <span>
                            {featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute > 90 && e.minute <= simMinute).length}
                            {' - '}
                            {featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute > 90 && e.minute <= simMinute).length}
                          </span>
                        ) : (
                          <span>
                            {featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute).length}
                            {' - '}
                            {featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute).length}
                          </span>
                        )}
                      </div>
                    )}
                    {simType === 'KNOCKOUT_LEG2' && !featuredMatch.isPreview && (
                      <div style={styles.hudAggregate}>
                        <span>Leg 1: {featuredMatch.finalScore1A} - {featuredMatch.finalScore1B}</span>
                        <span style={{ marginLeft: '10px' }}>
                          Agg:{' '}
                          {featuredMatch.finalScore1A + featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute > 90 && e.minute <= simMinute).length}
                          {' - '}
                          {featuredMatch.finalScore1B + featuredMatch.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute > 90 && e.minute <= simMinute).length}
                        </span>
                      </div>
                    )}
                    {simType === 'KNOCKOUT_LEG1' && !featuredMatch.isPreview && (
                      <div style={styles.hudAggregate}>
                        <span>Leg 1</span>
                      </div>
                    )}
                  </div>

                  {/* Team B Info */}
                  <div style={styles.hudTeamCol}>
                    <img src={featuredMatch.teamB.logo_url} alt="" style={styles.hudLogo} onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
                    <span style={styles.hudTeamName}>
                      {renderTeamNameWithYear(featuredMatch.teamB.name, featuredMatch.teamB.isUser)}
                      {featuredMatch.teamB.isUser && <span className="user-tag" style={{ marginLeft: '4px' }}>(YOU)</span>}
                    </span>
                    <span style={styles.hudTeamRating}>OVR {featuredMatch.teamB.rating}</span>
                  </div>
                </div>

                {/* Goalscorers lists */}
                {!featuredMatch.isPreview && (
                  <div style={styles.hudScorersRow}>
                    <div style={styles.hudScorersListCol}>
                      {featuredMatch.events
                        .filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute)
                        .map((e, idx) => (
                          <div key={idx} style={styles.hudScorerItem}>⚽ {e.player} ({e.minute}')</div>
                        ))
                      }
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ ...styles.hudScorersListCol, textAlign: 'right' }}>
                      {featuredMatch.events
                        .filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute)
                        .map((e, idx) => (
                          <div key={idx} style={{ ...styles.hudScorerItem, justifyContent: 'flex-end' }}>({e.minute}') {e.player} ⚽</div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {isSimulating && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${(simType === 'KNOCKOUT_LEG2' ? (simMinute - 90) / 90 : simMinute / 90) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Match Stats or Pre-Match analysis */}
                {featuredMatch.isPreview ? (
                  <div style={styles.hudAnalysis}>
                    <h5 style={styles.hudSectionTitle}><Activity size={14} style={{ marginRight: '6px' }} /> Match analysis</h5>
                    <div style={styles.analysisGrid}>
                      <div style={styles.analysisProbCol}>
                        <div style={styles.analysisProbVal}>
                          {Math.round((featuredMatch.teamA.rating + 2) / (featuredMatch.teamA.rating + featuredMatch.teamB.rating + 2) * 100)}%
                        </div>
                        <span style={styles.analysisProbLabel}>Win Probability</span>
                      </div>
                      <div style={styles.analysisKeyPlayers}>
                        <div style={styles.keyPlayerRow}>
                          <span style={styles.keyPlayerTeam}>{renderTeamNameWithYear(featuredMatch.teamA.name, featuredMatch.teamA.isUser)}:</span>
                          <span style={styles.keyPlayerName}>{getTopPlayer(featuredMatch.teamA)}</span>
                        </div>
                        <div style={styles.keyPlayerRow}>
                          <span style={styles.keyPlayerTeam}>{renderTeamNameWithYear(featuredMatch.teamB.name, featuredMatch.teamB.isUser)}:</span>
                          <span style={styles.keyPlayerName}>{getTopPlayer(featuredMatch.teamB)}</span>
                        </div>
                      </div>
                      <div style={styles.analysisProbCol}>
                        <div style={styles.analysisProbVal}>
                          {100 - Math.round((featuredMatch.teamA.rating + 2) / (featuredMatch.teamA.rating + featuredMatch.teamB.rating + 2) * 100)}%
                        </div>
                        <span style={styles.analysisProbLabel}>Win Probability</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.hudStatsSection}>
                    <h5 style={styles.hudSectionTitle}><BarChart2 size={14} style={{ marginRight: '6px' }} /> Match Statistics</h5>
                    
                    {/* Render stats */}
                    {(() => {
                      const finalStats = simType === 'KNOCKOUT_2LEGS' && simMinute > 90 ? (featuredMatch.stats2 || featuredMatch.stats) : (featuredMatch.stats1 || featuredMatch.stats);
                      const liveStats = getLiveStats(finalStats, simType === 'KNOCKOUT_2LEGS' && simMinute > 90 ? simMinute - 90 : simMinute, 90);
                      
                      const statsConfig = [
                        { label: 'Possession %', valA: liveStats.possessionA, valB: liveStats.possessionB },
                        { label: 'Shots (on Target)', valA: `${liveStats.shotsA} (${liveStats.shotsOnTargetA})`, valB: `${liveStats.shotsB} (${liveStats.shotsOnTargetB})`, rawA: liveStats.shotsA, rawB: liveStats.shotsB },
                        { label: 'Corners', valA: liveStats.cornersA, valB: liveStats.cornersB },
                        { label: 'Fouls', valA: liveStats.foulsA, valB: liveStats.foulsB },
                      ];

                      return (
                        <div style={styles.statsTable}>
                          {statsConfig.map((stat, idx) => {
                            const rawA = stat.rawA !== undefined ? stat.rawA : parseInt(stat.valA, 10) || 0;
                            const rawB = stat.rawB !== undefined ? stat.rawB : parseInt(stat.valB, 10) || 0;
                            const total = rawA + rawB || 1;
                            const pctA = (rawA / total) * 100;

                            return (
                              <div key={idx} style={styles.statsRow}>
                                <div style={styles.statsRowHeader}>
                                  <span className="hud-stats-val">{stat.valA}</span>
                                  <span className="hud-stats-label">{stat.label}</span>
                                  <span className="hud-stats-val">{stat.valB}</span>
                                </div>
                                <div style={styles.statsBarContainer}>
                                  <div style={{ ...styles.statsBarSegment, width: `${pctA}%`, background: 'var(--cyan-glow)' }} />
                                  <div style={{ ...styles.statsBarSegment, width: `${100 - pctA}%`, background: 'rgba(255,255,255,0.15)' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Event log feed timeline */}
                {!featuredMatch.isPreview && (
                  <div style={styles.hudTimelineSection}>
                    <h5 style={styles.hudSectionTitle}><Clock size={14} style={{ marginRight: '6px' }} /> Match Timeline</h5>
                    <div ref={timelineContainerRef} style={styles.timelineFeed} className="timeline-scroll">
                      {featuredMatch.events.filter(e => e.minute <= simMinute).length === 0 ? (
                        <div style={styles.timelineEmpty}>Kick-off! No match events recorded yet.</div>
                      ) : (
                        featuredMatch.events
                          .filter(e => e.minute <= simMinute)
                          .map((ev, i) => (
                            <div key={i} style={styles.timelineEventRow}>
                              <span style={styles.timelineMin}>{ev.minute}'</span>
                              <span style={styles.timelineText}>{ev.text}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons panel */}
            <div className="glass-panel" style={styles.actionsPanel}>
              <div style={styles.stageTitleRow}>
                <h3 style={styles.stageTitle}>
                  {tournamentState === 'SWISS' && `Swiss Stage - Round ${swissRound} of 8`}
                  {tournamentState === 'POST_SWISS' && 'Swiss Stage Completed'}
                  {['PLAYOFFS', 'RO16', 'QF', 'SF'].includes(tournamentState) && (
                    knockoutBracket?.pairs[0]?.score1A === null
                      ? `${knockoutBracket?.stage} - Leg 1`
                      : (knockoutBracket?.pairs[0]?.score2A === null
                          ? `${knockoutBracket?.stage} - Leg 2`
                          : `${knockoutBracket?.stage} - Completed`
                        )
                  )}
                  {tournamentState === 'FINAL' && (
                    knockoutSimulated
                      ? 'Final - Match Completed'
                      : 'Final - Pre-Match'
                  )}
                </h3>
                {!isUserAlive() && (
                  <span style={styles.eliminatedBadge}>Eliminated</span>
                )}
              </div>

              {/* Action trigger button */}
              <div style={styles.actionsBox}>
                {tournamentState === 'SWISS' && !isSimulating && (
                  <button className="btn-primary" onClick={simulateSwissRound} style={{ width: '100%' }}>
                    <Play size={18} style={{ marginRight: '8px' }} /> Simulate Round {swissRound}
                  </button>
                )}
                {tournamentState === 'POST_SWISS' && (
                  <button className="btn-primary" onClick={enterKnockouts} style={{ width: '100%' }}>
                    <ArrowRight size={18} style={{ marginRight: '8px' }} /> Proceed to Knockout Stage
                  </button>
                )}
                {['PLAYOFFS', 'RO16', 'QF', 'SF', 'FINAL'].includes(tournamentState) && (
                  !knockoutSimulated ? (
                    <button className="btn-primary" onClick={simulateKnockoutRound} disabled={isSimulating} style={{ width: '100%' }}>
                      <Play size={18} style={{ marginRight: '8px' }} />
                      {knockoutBracket?.stage === 'Final'
                        ? 'Simulate Final Match'
                        : (knockoutBracket?.pairs[0]?.score1A === null
                            ? `Simulate ${knockoutBracket?.stage} Leg 1`
                            : `Simulate ${knockoutBracket?.stage} Leg 2`
                          )
                      }
                    </button>
                  ) : (
                    !isSimulating && (
                      <button className="btn-primary" onClick={proceedToNextKnockoutRound} style={{ width: '100%', backgroundColor: 'var(--success)' }}>
                        <ArrowRight size={18} style={{ marginRight: '8px' }} /> Proceed to {knockoutBracket?.stage === 'Final' ? 'Champion Coronation' : 'Next Stage'}
                      </button>
                    )
                  )
                )}
                {isSimulating && (
                  <div style={styles.simulatingBanner}>
                    <span style={{ display: 'inline-block', animation: 'spin-slow 2s linear infinite', marginRight: '10px' }}>⏳</span>
                    Simulating round matches... ({simMinute}')
                  </div>
                )}
              </div>

              {/* Fixtures list grid */}
              <div style={styles.recentFixturesContainer}>
                <h4 style={styles.subHeading}>
                  {isSimulating ? 'Simulating Matches:' : liveMatches.length > 0 ? 'Matchday Results:' : 'Upcoming Round Fixtures:'}
                </h4>
                <div style={styles.fixturesList} className="timeline-scroll">
                  {activeFixtures.map((m, i) => {
                    const isFeatured = featuredMatchIndex === i;
                    let scoreText = '';
                    if (m.isPreview) {
                      scoreText = 'vs';
                    } else if (simType === 'KNOCKOUT_LEG1') {
                      const scoreA = m.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute).length;
                      const scoreB = m.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute).length;
                      scoreText = `${scoreA} - ${scoreB}`;
                    } else if (simType === 'KNOCKOUT_LEG2') {
                      const score2A = m.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute > 90 && e.minute <= simMinute).length;
                      const score2B = m.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute > 90 && e.minute <= simMinute).length;
                      const aggA = m.finalScore1A + score2A;
                      const aggB = m.finalScore1B + score2B;
                      scoreText = `${score2A} - ${score2B} (Agg: ${aggA}-${aggB})`;
                    } else {
                      const scoreA = m.events.filter(e => e.type === 'GOAL' && e.team === 'A' && e.minute <= simMinute).length;
                      const scoreB = m.events.filter(e => e.type === 'GOAL' && e.team === 'B' && e.minute <= simMinute).length;
                      scoreText = `${scoreA} - ${scoreB}`;
                    }

                    return (
                      <div
                        key={i}
                        className="fixture-card-hover"
                        onClick={() => setFeaturedMatchIndex(i)}
                        style={{
                          ...styles.fixtureRow,
                          ...(m.isUser ? styles.userFixtureRow : {}),
                          border: isFeatured ? '1px solid var(--cyan-glow)' : '1px solid rgba(255,255,255,0.03)',
                          background: isFeatured ? 'rgba(0, 240, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ ...styles.fixtureTeamA, fontWeight: m.teamA.isUser ? '700' : '400' }}>
                          {renderTeamNameWithYear(m.teamA.name, m.teamA.isUser)}
                        </span>
                        
                        <span style={{
                          ...styles.fixtureScore,
                          color: m.isUser ? 'var(--cyan-glow)' : 'var(--text-main)',
                          fontWeight: '700',
                          width: simType === 'KNOCKOUT_LEG2' ? '120px' : '60px'
                        }}>
                          {scoreText}
                        </span>

                        <span style={{ ...styles.fixtureTeamB, fontWeight: m.teamB.isUser ? '700' : '400' }}>
                          {renderTeamNameWithYear(m.teamB.name, m.teamB.isUser)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Standings and Goalscorers Tabs */}
          <div style={styles.rightCol}>
            <div className="glass-panel" style={styles.standingsPanel}>
              {/* Tab Switcher */}
              <div style={{ ...styles.tabHeader, flexWrap: 'wrap', gap: '8px' }}>
                <button
                  style={{
                    ...styles.tabButton,
                    borderBottom: activeTab === 'STANDINGS' ? '2.5px solid var(--cyan-glow)' : '2.5px solid transparent',
                    color: activeTab === 'STANDINGS' ? 'var(--cyan-glow)' : 'var(--text-muted)'
                  }}
                  onClick={() => setActiveTab('STANDINGS')}
                >
                  <Table size={14} style={{ marginRight: '6px' }} />
                  Standings
                </button>
                <button
                  style={{
                    ...styles.tabButton,
                    borderBottom: activeTab === 'BRACKET' ? '2.5px solid var(--cyan-glow)' : '2.5px solid transparent',
                    color: activeTab === 'BRACKET' ? 'var(--cyan-glow)' : 'var(--text-muted)'
                  }}
                  onClick={() => setActiveTab('BRACKET')}
                >
                  <Trophy size={14} style={{ marginRight: '6px' }} />
                  Bracket
                </button>
                <button
                  style={{
                    ...styles.tabButton,
                    borderBottom: activeTab === 'SCORERS' ? '2.5px solid var(--cyan-glow)' : '2.5px solid transparent',
                    color: activeTab === 'SCORERS' ? 'var(--cyan-glow)' : 'var(--text-muted)'
                  }}
                  onClick={() => setActiveTab('SCORERS')}
                >
                  <Medal size={14} style={{ marginRight: '6px' }} />
                  Top Goalscorers
                </button>
                <button
                  style={{
                    ...styles.tabButton,
                    borderBottom: activeTab === 'ASSISTS' ? '2.5px solid var(--cyan-glow)' : '2.5px solid transparent',
                    color: activeTab === 'ASSISTS' ? 'var(--cyan-glow)' : 'var(--text-muted)'
                  }}
                  onClick={() => setActiveTab('ASSISTS')}
                >
                  <Users size={14} style={{ marginRight: '6px' }} />
                  Top Assistors
                </button>
              </div>

              <div style={styles.tabScroll} className="timeline-scroll">
                {activeTab === 'STANDINGS' ? (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Pos</th>
                        <th style={styles.th}>Club</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>P</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>W</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>D</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>L</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>GD</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStandings.map((team, idx) => {
                        const isUser = team.isUser;
                        const rank = idx + 1;

                        let highlightStyle = {};
                        if (rank <= 8) {
                          highlightStyle = { borderLeft: '3px solid var(--success)' };
                        } else if (rank <= 24) {
                          highlightStyle = { borderLeft: '3px solid var(--cyan-glow)' };
                        } else {
                          highlightStyle = { borderLeft: '3px solid var(--danger)' };
                        }

                        return (
                          <tr
                            key={team.id}
                            style={{
                              ...styles.tr,
                              ...(isUser ? styles.userRow : {}),
                              ...highlightStyle,
                            }}
                          >
                            <td style={styles.td}>{rank}</td>
                            <td style={{ ...styles.td, ...styles.teamNameCell }}>
                              <img
                                src={team.logo_url}
                                alt=""
                                style={styles.teamLogo}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://media.api-sports.io/football/leagues/2.png';
                                }}
                              />
                              <span style={styles.teamNameText}>{renderTeamNameWithYear(team.name, isUser)}</span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>{team.played}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>{team.won}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>{team.drawn}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>{team.lost}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                            <td style={{ ...styles.td, fontWeight: '700', textAlign: 'center' }}>{team.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : activeTab === 'BRACKET' ? (
                  /* Visual tournament bracket tree view */
                  !knockoutStages ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Trophy size={48} color="rgba(255,255,255,0.06)" style={{ margin: '0 auto 15px auto', display: 'block' }} />
                      <h4 style={{ fontFamily: 'var(--font-title)', color: '#ffffff', fontSize: '1rem', marginBottom: '8px' }}>Knockout Bracket Coming Soon</h4>
                      <p style={{ fontSize: '0.75rem', lineHeight: '1.5', maxWidth: '350px', margin: '0 auto' }}>
                        Finish the Swiss stage to seed the tournament bracket. The top 8 teams will qualify directly to the Round of 16, while teams ranked 9th to 24th will compete in the Play-offs!
                      </p>
                    </div>
                  ) : (
                    <div style={styles.koContainer}>
                      <h4 style={styles.koStageHeader}>Visual Tournament Tree</h4>
                      <div style={styles.bracketScrollContainer} className="timeline-scroll">
                        {/* 1. Play-offs Column */}
                        <div style={styles.bracketColumn}>
                          <h5 style={styles.bracketColumnHeader}>Play-offs</h5>
                          <div style={styles.bracketColumnList}>
                            {knockoutStages['Play-offs'].map((pair, idx) => {
                              const isCurrentStage = knockoutBracket && knockoutBracket.stage === 'Play-offs';
                              return (
                                <BracketCard
                                  key={idx}
                                  pair={pair}
                                  stage="Play-offs"
                                  index={idx}
                                  isCurrentStage={isCurrentStage}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Round of 16 Column */}
                        <div style={styles.bracketColumn}>
                          <h5 style={styles.bracketColumnHeader}>Round of 16</h5>
                          <div style={styles.bracketColumnList}>
                            {knockoutStages['Round of 16'].map((pair, idx) => {
                              const isCurrentStage = knockoutBracket && knockoutBracket.stage === 'Round of 16';
                              return (
                                <BracketCard
                                  key={idx}
                                  pair={pair}
                                  stage="Round of 16"
                                  index={idx}
                                  isCurrentStage={isCurrentStage}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. Quarter-finals Column */}
                        <div style={styles.bracketColumn}>
                          <h5 style={styles.bracketColumnHeader}>Quarter-finals</h5>
                          <div style={styles.bracketColumnList}>
                            {knockoutStages['Quarter-finals'].map((pair, idx) => {
                              const isCurrentStage = knockoutBracket && knockoutBracket.stage === 'Quarter-finals';
                              return (
                                <BracketCard
                                  key={idx}
                                  pair={pair}
                                  stage="Quarter-finals"
                                  index={idx}
                                  isCurrentStage={isCurrentStage}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Semi-finals Column */}
                        <div style={styles.bracketColumn}>
                          <h5 style={styles.bracketColumnHeader}>Semi-finals</h5>
                          <div style={styles.bracketColumnList}>
                            {knockoutStages['Semi-finals'].map((pair, idx) => {
                              const isCurrentStage = knockoutBracket && knockoutBracket.stage === 'Semi-finals';
                              return (
                                <BracketCard
                                  key={idx}
                                  pair={pair}
                                  stage="Semi-finals"
                                  index={idx}
                                  isCurrentStage={isCurrentStage}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* 5. Final Column */}
                        <div style={styles.bracketColumn}>
                          <h5 style={styles.bracketColumnHeader}>Final</h5>
                          <div style={styles.bracketColumnList}>
                            {knockoutStages['Final'].map((pair, idx) => {
                              const isCurrentStage = knockoutBracket && knockoutBracket.stage === 'Final';
                              return (
                                <BracketCard
                                  key={idx}
                                  pair={pair}
                                  stage="Final"
                                  index={idx}
                                  isCurrentStage={isCurrentStage}
                                />
                              );
                            })}
                            {/* Visual Champion Showcase */}
                            {knockoutStages.champion && (
                              <div style={styles.bracketChampionBox}>
                                <Trophy size={14} color="var(--gold)" style={{ filter: 'drop-shadow(0 0 5px var(--gold))' }} />
                                <span style={{ fontSize: '0.5rem', fontWeight: '800', color: 'var(--gold)', letterSpacing: '0.5px' }}>CHAMPION</span>
                                <img src={knockoutStages.champion.logo_url} style={styles.bracketTeamLogo} alt="" onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: '700', textAlign: 'center' }}>
                                  {renderTeamNameWithYear(knockoutStages.champion.name, knockoutStages.champion.isUser)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : activeTab === 'SCORERS' ? (
                  /* Top scorers view */
                  <div style={styles.scorersList}>
                    <h4 style={styles.koStageHeader}>Golden Boot Race</h4>
                    {displayTopScorers.length === 0 ? (
                      <div style={styles.emptyScorers}>
                        No goals scored yet. Start simulating to see the race for the Golden Boot!
                      </div>
                    ) : (
                      displayTopScorers.map((scorer, idx) => {
                        const isUserPlayer = scorer.teamName === (userTeamName || 'My Draft XI') && Object.values(activeUserSquad).some(p => p.name === scorer.name);
                        return (
                          <div
                            key={idx}
                            style={{
                              ...styles.scorerCard,
                              ...(isUserPlayer ? styles.userRow : {}),
                            }}
                          >
                            <div style={styles.scorerRank}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </div>
                            <img
                              src={scorer.teamLogo}
                              style={styles.scorerLogo}
                              alt=""
                              onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }}
                            />
                            <div style={styles.scorerDetails}>
                              <div style={{ ...styles.scorerName, fontWeight: isUserPlayer ? '700' : '500' }}>
                                {scorer.name}
                                {isUserPlayer && <span className="user-tag" style={{ marginLeft: '4px' }}>DRAFT XI</span>}
                              </div>
                              <div style={styles.scorerTeam}>{renderTeamNameWithYear(scorer.teamName)}</div>
                            </div>
                            <div style={styles.scorerGoals}>{scorer.goals} goals</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* Top assistors view */
                  <div style={styles.scorersList}>
                    <h4 style={styles.koStageHeader}>Playmaker Race</h4>
                    {displayTopAssistors.length === 0 ? (
                      <div style={styles.emptyScorers}>
                        No assists recorded yet. Start simulating to see the race for the Playmaker award!
                      </div>
                    ) : (
                      displayTopAssistors.map((assistor, idx) => {
                        const isUserPlayer = assistor.teamName === (userTeamName || 'My Draft XI') && Object.values(activeUserSquad).some(p => p.name === assistor.name);
                        return (
                          <div
                            key={idx}
                            style={{
                              ...styles.scorerCard,
                              ...(isUserPlayer ? styles.userRow : {}),
                            }}
                          >
                            <div style={styles.scorerRank}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </div>
                            <img
                              src={assistor.teamLogo}
                              style={styles.scorerLogo}
                              alt=""
                              onError={(e) => { e.target.src = 'https://media.api-sports.io/football/leagues/2.png'; }}
                            />
                            <div style={styles.scorerDetails}>
                              <div style={{ ...styles.scorerName, fontWeight: isUserPlayer ? '700' : '500' }}>
                                {assistor.name}
                                {isUserPlayer && <span className="user-tag" style={{ marginLeft: '4px' }}>DRAFT XI</span>}
                              </div>
                              <div style={styles.scorerTeam}>{renderTeamNameWithYear(assistor.teamName)}</div>
                            </div>
                            <div style={styles.scorerGoals}>{assistor.assists} assists</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Table legend */}
              {activeTab === 'STANDINGS' && (tournamentState === 'SWISS' || tournamentState === 'POST_SWISS') && (
                <div style={styles.legend}>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, backgroundColor: 'var(--success)' }}></span>
                    <span>Top 8 (Direct RO16)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, backgroundColor: 'var(--cyan-glow)' }}></span>
                    <span>9-24 (Play-offs)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, backgroundColor: 'var(--danger)' }}></span>
                    <span>25-36 (Eliminated)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLineupManager && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ ...styles.title, margin: 0 }}>Manage Team Lineup</h3>
                <p style={{ ...styles.subtitle, margin: '2px 0 0 0' }}>Swap Starting XI players with Bench players. Overall OVR updates instantly.</p>
              </div>
              <button 
                onClick={() => {
                  setShowLineupManager(false);
                  setSelectedSwapPlayerKey(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px',
                  borderRadius: '50%',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody} className="lineup-modal-body">
              {/* Left Column: Starting XI */}
              <div style={styles.modalColumn}>
                <h4 style={styles.modalColumnTitle}>Starting XI</h4>
                <div style={styles.lineupList} className="timeline-scroll">
                  {Object.entries(activeUserSquad)
                    .filter(([key]) => !key.startsWith('sub'))
                    .map(([key, p]) => {
                      if (!p) return null;
                      const role = key.replace(/\d+$/, '').toUpperCase();
                      const isSelected = selectedSwapPlayerKey === key;
                      
                      // Check compatibility if a sub player is selected
                      let isCompatible = true;
                      if (selectedSwapPlayerKey && selectedSwapPlayerKey.startsWith('sub')) {
                        const subPlayer = activeUserSquad[selectedSwapPlayerKey];
                        isCompatible = subPlayer ? checkPositionEligibility(subPlayer.position, role) : true;
                      }

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            if (selectedSwapPlayerKey === key) {
                              setSelectedSwapPlayerKey(null);
                            } else if (selectedSwapPlayerKey) {
                              handleSwapPlayers(selectedSwapPlayerKey, key);
                            } else {
                              setSelectedSwapPlayerKey(key);
                            }
                          }}
                          style={{
                            ...styles.lineupItem,
                            ...(isSelected ? styles.lineupItemActive : {}),
                            ...(!isCompatible ? styles.lineupItemIncompatible : {}),
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--cyan-glow)', fontWeight: '800', width: '32px', fontSize: '0.75rem' }}>{role}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff' }}>{p.name}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pos: {p.position}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--gold)' }}>{p.rating}</span>
                            <Shuffle size={12} color="var(--text-muted)" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Substitutes Bench */}
              <div style={styles.modalColumn}>
                <h4 style={{ ...styles.modalColumnTitle, color: 'var(--gold)', borderBottomColor: 'rgba(242,204,96,0.15)' }}>Substitutes Bench</h4>
                <div style={styles.lineupList} className="timeline-scroll">
                  {['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6', 'sub7'].map((subKey, idx) => {
                    const p = activeUserSquad[subKey];
                    if (!p) return null;
                    const isSelected = selectedSwapPlayerKey === subKey;
                    
                    // Check compatibility if a starter player is selected
                    let isCompatible = true;
                    if (selectedSwapPlayerKey && !selectedSwapPlayerKey.startsWith('sub')) {
                      const starterRole = selectedSwapPlayerKey.replace(/\d+$/, '').toUpperCase();
                      isCompatible = checkPositionEligibility(p.position, starterRole);
                    }

                    return (
                      <div
                        key={subKey}
                        onClick={() => {
                          if (selectedSwapPlayerKey === subKey) {
                            setSelectedSwapPlayerKey(null);
                          } else if (selectedSwapPlayerKey) {
                            handleSwapPlayers(selectedSwapPlayerKey, subKey);
                          } else {
                            setSelectedSwapPlayerKey(subKey);
                          }
                        }}
                        style={{
                          ...styles.lineupItem,
                          ...(isSelected ? styles.lineupItemActive : {}),
                          ...(selectedSwapPlayerKey && !selectedSwapPlayerKey.startsWith('sub') && isCompatible ? styles.lineupItemCompatible : {}),
                          ...(selectedSwapPlayerKey && !selectedSwapPlayerKey.startsWith('sub') && !isCompatible ? styles.lineupItemIncompatible : {}),
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: '800', width: '38px', fontSize: '0.7rem' }}>SUB {idx + 1}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff' }}>{p.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pos: {p.position}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--cyan-glow)' }}>{p.rating}</span>
                          <Shuffle size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  simWrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--panel-border)',
    paddingBottom: '15px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: '25px',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightCol: {
    height: '100%',
  },
  hudCard: {
    padding: '20px',
    background: 'rgba(8, 18, 45, 0.85)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.06)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  hudHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px',
  },
  hudClock: {
    fontSize: '0.8rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'var(--cyan-glow)'
  },
  hudScoreboardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
  },
  hudTeamCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
    maxWidth: '40%',
  },
  hudLogo: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
  },
  hudTeamName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  hudTeamRating: {
    fontSize: '0.7rem',
    color: 'var(--gold)',
    fontWeight: '600',
    background: 'rgba(242, 204, 96, 0.08)',
    border: '1px solid rgba(242, 204, 96, 0.2)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  hudScoreCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  hudAggregate: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  hudScorersRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '15px',
    background: 'rgba(0,0,0,0.15)',
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  hudScorersListCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  hudScorerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--cyan-glow)',
    boxShadow: '0 0 10px var(--cyan-glow)',
    transition: 'width 0.2s ease',
  },
  hudAnalysis: {
    background: 'rgba(0,0,0,0.15)',
    padding: '12px 15px',
    borderRadius: '8px',
  },
  hudSectionTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--cyan-glow)',
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 60px',
    gap: '15px',
    alignItems: 'center',
  },
  analysisProbCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  analysisProbVal: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  analysisProbLabel: {
    fontSize: '0.55rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  analysisKeyPlayers: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    padding: '0 15px',
  },
  keyPlayerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
  },
  keyPlayerTeam: {
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '50%',
  },
  keyPlayerName: {
    color: '#ffffff',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '50%',
  },
  hudStatsSection: {
    background: 'rgba(0,0,0,0.15)',
    padding: '12px 15px',
    borderRadius: '8px',
  },
  statsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  statsRow: {
    display: 'flex',
    flexDirection: 'column',
  },
  statsRowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  statsBarContainer: {
    height: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    display: 'flex',
    overflow: 'hidden',
    marginTop: '2px',
  },
  statsBarSegment: {
    height: '100%',
    transition: 'width 0.2s ease',
  },
  hudTimelineSection: {
    background: 'rgba(0,0,0,0.15)',
    padding: '12px 15px',
    borderRadius: '8px',
  },
  timelineFeed: {
    maxHeight: '120px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingRight: '5px',
  },
  timelineEmpty: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '15px 0',
  },
  timelineEventRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.75rem',
    paddingBottom: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
  },
  timelineMin: {
    fontWeight: '700',
    color: 'var(--cyan-glow)',
    minWidth: '24px',
  },
  timelineText: {
    color: 'var(--text-main)',
  },
  actionsPanel: {
    padding: '20px',
  },
  stageTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  stageTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--cyan-glow)',
  },
  eliminatedBadge: {
    background: 'rgba(255, 74, 90, 0.12)',
    color: 'var(--danger)',
    border: '1px solid rgba(255, 74, 90, 0.25)',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  actionsBox: {
    display: 'flex',
    justifyContent: 'center',
    padding: '15px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  simulatingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--cyan-glow)',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  recentFixturesContainer: {
    marginTop: '15px',
  },
  subHeading: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '10px',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  fixturesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '5px',
  },
  fixtureRow: {
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.01)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    alignItems: 'center',
  },
  userFixtureRow: {
    background: 'rgba(0, 240, 255, 0.05)',
    borderColor: 'rgba(0, 240, 255, 0.2) !important',
  },
  fixtureTeamA: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fixtureScore: {
    fontWeight: '700',
    color: 'var(--cyan-glow)',
    width: '60px',
    textAlign: 'center',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  fixtureTeamB: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  bracketScrollContainer: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '5px 5px',
    width: '100%',
    minHeight: '300px',
  },
  bracketColumn: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '140px',
    flex: '1 0 140px',
    gap: '6px',
  },
  bracketColumnHeader: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: 'var(--cyan-glow)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
    paddingBottom: '2px',
  },
  bracketColumnList: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    flexGrow: 1,
    gap: '6px',
  },
  bracketCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--panel-border)',
    borderRadius: '4px',
    padding: '4px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'all 0.2s ease',
  },
  bracketTeamLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.62rem',
  },
  bracketTeamLogo: {
    width: '10px',
    height: '10px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  bracketCardSummary: {
    fontSize: '0.52rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '2px',
    marginTop: '1px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bracketChampionBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    background: 'radial-gradient(circle, rgba(242,204,96,0.1) 0%, rgba(2,5,20,0.4) 100%)',
    border: '1px solid var(--gold)',
    boxShadow: '0 0 15px rgba(242,204,96,0.2)',
    borderRadius: '8px',
    padding: '6px',
    marginTop: '6px',
    alignSelf: 'center',
    width: '120px',
  },
  koContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  koStageHeader: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--cyan-glow)',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  koPairsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  koFixtureBox: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  koTeamLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
  },
  koSummaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '5px',
    marginTop: '2px',
  },
  koWinnerLabel: {
    color: 'var(--success)',
  },
  standingsPanel: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '680px',
    height: '100%',
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '15px',
    gap: '10px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  tabScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.75rem',
  },
  th: {
    textAlign: 'left',
    padding: '8px 6px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--panel-border)',
    fontWeight: '600',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    transition: 'all 0.15s ease',
  },
  userRow: {
    background: 'rgba(0, 240, 255, 0.06)',
  },
  td: {
    padding: '8px 6px',
    verticalAlign: 'middle',
  },
  teamNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  teamLogo: {
    width: '16px',
    height: '16px',
    objectFit: 'contain',
  },
  teamNameText: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    maxWidth: '180px',
    width: '100%',
  },
  legend: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  scorersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyScorers: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '30px 10px',
  },
  scorerCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.02)',
    borderRadius: '6px',
    padding: '8px 12px',
    gap: '10px',
  },
  scorerRank: {
    fontSize: '0.85rem',
    fontWeight: '800',
    minWidth: '24px',
    color: 'var(--text-muted)',
  },
  scorerLogo: {
    width: '16px',
    height: '16px',
    objectFit: 'contain',
  },
  scorerDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scorerName: {
    fontSize: '0.8rem',
    color: '#ffffff',
  },
  scorerTeam: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  scorerGoals: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--cyan-glow)',
  },
  coronationCard: {
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at center, rgba(3,16,46,0.95) 0%, rgba(2,5,20,0.95) 100%)',
    border: '1.5px solid var(--gold)',
    boxShadow: '0 0 35px rgba(242, 204, 96, 0.15)',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  coronationContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '500px',
    zIndex: 11,
  },
  trophyWrapper: {
    marginBottom: '20px',
  },
  coronationTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '2rem',
    fontWeight: '900',
    color: 'var(--gold)',
    letterSpacing: '3px',
    textShadow: '0 0 20px rgba(242, 204, 96, 0.3)',
    marginBottom: '15px',
  },
  coronationLogoContainer: {
    background: 'rgba(255,255,255,0.05)',
    padding: '15px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '10px',
  },
  coronationLogo: {
    width: '64px',
    height: '64px',
    objectFit: 'contain',
  },
  coronationTeamName: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '2px',
  },
  coronationSub: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
    marginBottom: '30px',
  },
  coronationAwards: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    width: '100%',
    marginBottom: '35px',
  },
  awardItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '15px 10px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  awardLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  awardValue: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  coronationResetBtn: {
    padding: '14px 30px',
    fontSize: '0.95rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(2, 5, 20, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalContent: {
    background: 'rgba(8, 18, 45, 0.95)',
    border: '1.5px solid var(--panel-border)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '850px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  modalBody: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: '20px',
    overflowY: 'auto',
  },
  modalColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  modalColumnTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--cyan-glow)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
    paddingBottom: '6px',
    marginBottom: '4px',
  },
  lineupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '500px',
    overflowY: 'auto',
    paddingRight: '5px',
  },
  lineupItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  lineupItemActive: {
    borderColor: 'var(--cyan-glow)',
    background: 'rgba(0, 240, 255, 0.05)',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)',
  },
  lineupItemCompatible: {
    borderColor: 'var(--success)',
    background: 'rgba(0, 255, 135, 0.03)',
  },
  lineupItemIncompatible: {
    opacity: 0.4,
  },
};

export default Simulator;
