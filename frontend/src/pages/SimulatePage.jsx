import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraft } from '../context/DraftContext';
import Simulator from '../components/Simulator';

const SimulatePage = () => {
  const navigate = useNavigate();
  const {
    teamName,
    draftedSquad,
    era,
    resetAll,
    isSquadComplete
  } = useDraft();

  // Redirect to setup if team name or drafted squad is not complete
  useEffect(() => {
    if (!teamName || !isSquadComplete()) {
      navigate('/');
    }
  }, [teamName, isSquadComplete, navigate]);

  if (!teamName || !isSquadComplete()) return null;

  return (
    <Simulator
      userSquad={draftedSquad}
      userTeamName={teamName}
      era={era}
      onReset={resetAll}
    />
  );
};

export default SimulatePage;
