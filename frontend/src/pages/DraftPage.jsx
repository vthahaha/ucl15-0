import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useDraft } from '../context/DraftContext';
import Pitch, { FORMATIONS } from '../components/Pitch';
import PlayerSelector from '../components/PlayerSelector';
import { styles } from '../styles/styles';

const DraftPage = () => {
  const navigate = useNavigate();
  const {
    teamName,
    formation,
    draftedSquad,
    activeSlotId,
    activeRole,
    selectedPlayerForPlacement,
    era,
    randomizedTeam,
    rerollsLeft,
    handleSlotSelect,
    handleSelectPlayer,
    handleReroll,
    draftedPlayerIds,
    isStartingXIComplete,
    isSquadComplete
  } = useDraft();

  // Redirect to setup if team name is not configured
  useEffect(() => {
    if (!teamName) {
      navigate('/');
    }
  }, [teamName, navigate]);

  if (!teamName) return null;

  // Calculate Starting OVR and counts
  const startingSlots = FORMATIONS[formation] || [];
  const draftedStarters = startingSlots.map(s => draftedSquad[s.id]).filter(p => !!p);
  const startingOvr = draftedStarters.length > 0
    ? Math.round(draftedStarters.reduce((sum, p) => sum + p.rating, 0) / draftedStarters.length)
    : 0;
  
  const startersCount = draftedStarters.length;
  const subsCount = ['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6', 'sub7']
    .map(id => draftedSquad[id])
    .filter(p => !!p).length;

  return (
    <div style={{ ...styles.draftWorkspace, gridTemplateColumns: '1.3fr 1.1fr' }} className="animate-fade-in">
      {/* Left Panel: Player Selector */}
      <div style={styles.selectorSection}>
        <PlayerSelector
          era={era}
          targetRole={activeRole}
          onSelectPlayer={handleSelectPlayer}
          draftedPlayerIds={draftedPlayerIds}
          randomizedTeam={randomizedTeam}
          rerollsLeft={rerollsLeft}
          onReroll={handleReroll}
          selectedPlayer={selectedPlayerForPlacement}
          draftedSquad={draftedSquad}
          formation={formation}
        />
      </div>

      {/* Right Panel: Pitch & Bench */}
      <div style={styles.pitchSection}>
        <div style={styles.squadSummaryPanel} className="glass-panel">
          <h3 style={styles.squadTitle}>{teamName}</h3>
          <p style={styles.squadOvr}>
            OVR Rating:{' '}
            <span style={{ color: 'var(--cyan-glow)', fontWeight: '700' }}>{startingOvr}</span>
            {' '}({startersCount}/11 starters | {subsCount}/7 subs)
          </p>
        </div>
        
        <Pitch
          formation={formation}
          draftedSquad={draftedSquad}
          activeSlotId={activeSlotId}
          onSlotSelect={handleSlotSelect}
          selectedPlayer={selectedPlayerForPlacement}
        />

        {/* Substitutes Bench drafting (unlocked after starting XI complete) */}
        {isStartingXIComplete() ? (
          <div style={localStyles.benchSection} className="glass-panel animate-fade-in">
            <h4 style={localStyles.benchTitle}>Substitutes Bench ({subsCount}/7 drafted)</h4>
            <div style={localStyles.benchSlotsRow}>
              {['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6', 'sub7'].map((subId, idx) => {
                const player = draftedSquad[subId];
                const isActive = activeSlotId === subId;
                const isEligible = selectedPlayerForPlacement && !player;

                return (
                  <div
                    key={subId}
                    onClick={() => handleSlotSelect(subId, 'ANY')}
                    style={{
                      ...localStyles.benchSlotContainer,
                      ...(isActive ? localStyles.benchSlotActive : {}),
                      ...(isEligible ? localStyles.benchSlotEligible : {}),
                      ...(player && player.rating >= 88 ? { borderColor: 'var(--gold)' } : {})
                    }}
                  >
                    {player ? (
                      <div 
                        style={{
                          ...localStyles.compactSubCard,
                          background: player.rating >= 88 
                            ? 'linear-gradient(135deg, #28200b 0%, #151105 60%, #0a0802 100%)'
                            : 'linear-gradient(135deg, rgba(9, 28, 66, 0.9) 0%, rgba(3, 15, 45, 0.95) 100%)'
                        }}
                      >
                        <span 
                          style={{
                            ...localStyles.subRating,
                            color: player.rating >= 88 ? 'var(--gold)' : 'var(--cyan-glow)'
                          }}
                        >
                          {player.rating}
                        </span>
                        <span style={localStyles.subPosition}>{player.position}</span>
                        <span style={localStyles.subName}>{player.name}</span>
                      </div>
                    ) : (
                      <div style={localStyles.emptySubSlot}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '800', 
                          color: isEligible ? '#f2cc60' : isActive ? '#00f0ff' : '#8e9bb8' 
                        }}>
                          SUB {idx + 1}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)', width: '100%', maxWidth: '620px' }}>
            Draft all 11 starting positions to unlock the substitutes bench.
          </div>
        )}

        {isSquadComplete() && (
          <button
            className="btn-primary"
            onClick={() => navigate('/simulate')}
            style={{ ...styles.proceedBtn, marginTop: '15px' }}
          >
            <Compass size={18} /> Proceed to Simulation
          </button>
        )}
      </div>
    </div>
  );
};

const localStyles = {
  benchSection: {
    width: '100%',
    maxWidth: '620px',
    padding: '12px 18px',
    marginTop: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: 'rgba(3, 16, 46, 0.5)',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
  },
  benchTitle: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: 'var(--cyan-glow)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontFamily: 'var(--font-title)',
  },
  benchSlotsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
  },
  benchSlotContainer: {
    flex: '1 1 0px',
    minWidth: '55px',
    height: '62px',
    borderRadius: '8px',
    border: '1.5px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(2, 11, 36, 0.4)',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  benchSlotActive: {
    borderColor: '#00f0ff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
    background: 'rgba(0, 240, 255, 0.05)',
  },
  benchSlotEligible: {
    borderColor: '#f2cc60',
    boxShadow: '0 0 10px rgba(242, 204, 96, 0.3)',
    background: 'rgba(242, 204, 96, 0.05)',
  },
  emptySubSlot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSubCard: {
    width: '100%',
    height: '100%',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  subRating: {
    position: 'absolute',
    top: '3px',
    left: '4px',
    fontSize: '0.62rem',
    fontWeight: '800',
    fontFamily: 'var(--font-title)',
  },
  subPosition: {
    position: 'absolute',
    top: '3px',
    right: '4px',
    fontSize: '0.55rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
  },
  subName: {
    fontSize: '0.62rem',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '22px',
    color: '#ffffff',
  },
};

export default DraftPage;
