import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORMATIONS } from '../components/Pitch';
import { checkPositionEligibility } from '../utils/positionRules';

const DraftContext = createContext();

export const selectRandomFormations = () => {
  const allFormations = Object.keys(FORMATIONS);
  const shuffled = [...allFormations].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 7);
};

export const DraftProvider = ({ children }) => {
  const navigate = useNavigate();

  // Game Setup
  const [availableFormations, setAvailableFormations] = useState([]);
  const [formation, setFormation] = useState('');
  const [era, setEra] = useState('2020s');
  const [teamName, setTeamName] = useState('');
  const [difficulty, setDifficulty] = useState('normal'); // 'easy', 'normal', 'hard', 'brutal'

  // Choose 7 random formations on mount
  useEffect(() => {
    const random7 = selectRandomFormations();
    setAvailableFormations(random7);
    setFormation(random7[0]);
  }, []);

  // Always reset to homepage when reloading the app
  useEffect(() => {
    navigate('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft Squad State
  const [draftedSquad, setDraftedSquad] = useState({}); // { gk: player, cb1: player, ... }
  const [draftedPlayerIds, setDraftedPlayerIds] = useState([]); // [api_id1, api_id2, ...]
  const [draftedTeamIds, setDraftedTeamIds] = useState([]); // [team_id1, team_id2, ...]
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  
  // Placement State
  const [selectedPlayerForPlacement, setSelectedPlayerForPlacement] = useState(null);

  // State variables for randomized draft
  const [teamsPool, setTeamsPool] = useState([]);
  const [randomizedTeam, setRandomizedTeam] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(3);

  const startDraft = async () => {
    if (!teamName.trim()) {
      alert('Please enter a team name to proceed!');
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/api/teams?era=${era}`);
      if (!response.ok) throw new Error('Failed to load teams pool');
      const teams = await response.json();
      
      if (teams.length === 0) {
        alert('No teams found in database for this era. Make sure you seeded the DB!');
        return;
      }

      setTeamsPool(teams);
      setDraftedSquad({});
      setDraftedPlayerIds([]);
      setDraftedTeamIds([]);
      
      let startingRerolls = 3;
      if (difficulty === 'easy') startingRerolls = 5;
      else if (difficulty === 'normal') startingRerolls = 3;
      else if (difficulty === 'hard') startingRerolls = 1;
      else if (difficulty === 'brutal') startingRerolls = 0;
      setRerollsLeft(startingRerolls);
      setSelectedPlayerForPlacement(null);

      const slots = FORMATIONS[formation];
      if (slots && slots.length > 0) {
        setActiveSlotId(null);
        setActiveRole(null);
        const firstTeam = teams[Math.floor(Math.random() * teams.length)];
        setRandomizedTeam(firstTeam);
      }
      navigate('/draft');
    } catch (err) {
      alert('Error entering draft room: ' + err.message);
    }
  };

  const handleSlotSelect = (slotId, role) => {
    if (selectedPlayerForPlacement) {
      if (draftedSquad[slotId]) {
        alert('This position is already occupied! If you want to replace them, select another slot or reset.');
        return;
      }

      const isCompatible = checkPositionEligibility(selectedPlayerForPlacement.position, role);
      if (!isCompatible) {
        alert(`Incompatible Position! A ${selectedPlayerForPlacement.position} is not eligible to play at ${role}.`);
        return;
      }

      const player = selectedPlayerForPlacement;
      setDraftedSquad((prev) => ({
        ...prev,
        [slotId]: player,
      }));
      setDraftedPlayerIds((prev) => [...prev, player.api_id]);
      setDraftedTeamIds((prev) => [...prev, player.team_id]);
      
      setSelectedPlayerForPlacement(null);
      setActiveSlotId(null);
      setActiveRole(null);

      if (teamsPool.length > 0) {
        const nextDraftedTeamIds = [...draftedTeamIds, player.team_id];
        const remainingTeams = teamsPool.filter(t => !nextDraftedTeamIds.includes(t.id));
        if (remainingTeams.length > 0) {
          const randomTeam = remainingTeams[Math.floor(Math.random() * remainingTeams.length)];
          setRandomizedTeam(randomTeam);
        } else {
          const randomTeam = teamsPool[Math.floor(Math.random() * teamsPool.length)];
          setRandomizedTeam(randomTeam);
        }
      }
    } else {
      setActiveSlotId(slotId);
      setActiveRole(role);
    }
  };

  const handleSelectPlayer = (player) => {
    if (selectedPlayerForPlacement && selectedPlayerForPlacement.id === player.id) {
      setSelectedPlayerForPlacement(null);
      setActiveSlotId(null);
      setActiveRole(null);
    } else {
      setSelectedPlayerForPlacement(player);
      setActiveRole(player.position);
    }
  };

  const handleReroll = () => {
    if (rerollsLeft <= 0) return;
    if (teamsPool.length <= 1) return;
    
    const availableTeams = teamsPool.filter(
      (t) => !draftedTeamIds.includes(t.id) && t.id !== randomizedTeam.id
    );
    
    if (availableTeams.length > 0) {
      const newTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      setRandomizedTeam(newTeam);
      setRerollsLeft((prev) => prev - 1);
    } else {
      let newTeam = randomizedTeam;
      while (newTeam.id === randomizedTeam.id) {
        newTeam = teamsPool[Math.floor(Math.random() * teamsPool.length)];
      }
      setRandomizedTeam(newTeam);
      setRerollsLeft((prev) => prev - 1);
    }
  };

  const isStartingXIComplete = () => {
    const slots = FORMATIONS[formation] || [];
    return slots.every(slot => !!draftedSquad[slot.id]);
  };

  const isSquadComplete = () => {
    const slots = FORMATIONS[formation] || [];
    const mainComplete = slots.every(slot => !!draftedSquad[slot.id]);
    const subsComplete = ['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6', 'sub7'].every(id => !!draftedSquad[id]);
    return mainComplete && subsComplete;
  };

  const resetAll = () => {
    setDraftedSquad({});
    setDraftedPlayerIds([]);
    setDraftedTeamIds([]);
    setActiveSlotId(null);
    setActiveRole(null);
    setSelectedPlayerForPlacement(null);
    setRandomizedTeam(null);

    const random7 = selectRandomFormations();
    setAvailableFormations(random7);
    setFormation(random7[0]);
    
    navigate('/');
  };

  return (
    <DraftContext.Provider
      value={{
        availableFormations,
        formation,
        setFormation,
        era,
        setEra,
        teamName,
        setTeamName,
        difficulty,
        setDifficulty,
        draftedSquad,
        draftedPlayerIds,
        draftedTeamIds,
        activeSlotId,
        activeRole,
        selectedPlayerForPlacement,
        setSelectedPlayerForPlacement,
        teamsPool,
        randomizedTeam,
        rerollsLeft,
        startDraft,
        handleSlotSelect,
        handleSelectPlayer,
        handleReroll,
        isStartingXIComplete,
        isSquadComplete,
        resetAll
      }}
    >
      {children}
    </DraftContext.Provider>
  );
};

export const useDraft = () => {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
};
