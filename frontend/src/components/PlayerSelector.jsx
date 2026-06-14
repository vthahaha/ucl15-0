import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, UserCheck, RotateCw, LayoutGrid, List } from 'lucide-react';
import { FORMATIONS } from './Pitch';
import { checkPositionEligibility } from '../utils/positionRules';
import playerPlaceholder from '../assets/player_placeholder.png';

const PlayerSelector = ({ era, targetRole, onSelectPlayer, draftedPlayerIds, randomizedTeam, rerollsLeft, onReroll, selectedPlayer, draftedSquad, formation }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [activePositionFilter, setActivePositionFilter] = useState('ALL'); // 'ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating-desc'); // 'rating-desc', 'rating-asc', 'name-asc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // 1. Fetch players based on randomized team
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!randomizedTeam) return;
      setLoading(true);
      setPlayers([]);
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const url = `${apiBase}/api/players?era=${era}&teamId=${randomizedTeam.id}${randomizedTeam.season ? `&season=${randomizedTeam.season}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch players');
        const data = await response.json();
        setPlayers(data);
      } catch (err) {
        console.error('Error fetching players:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
    
    // Reset search query
    setSearchQuery('');
  }, [era, randomizedTeam]);

  // Handle position mapping for mapping active role (e.g. ST maps to Attacker, CB to Defender)
  const mapRoleToGeneric = (role) => {
    if (!role) return [];
    const roles = typeof role === 'string' ? role.split(',').map(r => r.trim()) : [role];
    const categories = new Set();
    roles.forEach(r => {
      const cleanRole = r.replace(/\d+$/, '').toUpperCase();
      if (cleanRole === 'GK') categories.add('Goalkeeper');
      else if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(cleanRole)) categories.add('Defender');
      else if (['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(cleanRole)) categories.add('Midfielder');
      else if (['ST', 'LW', 'RW', 'CF'].includes(cleanRole)) categories.add('Attacker');
    });
    return Array.from(categories);
  };

  // Auto-filter by target slot position category
  useEffect(() => {
    if (targetRole && !selectedPlayer) {
      const categories = mapRoleToGeneric(targetRole);
      if (categories.length > 0) {
        setActivePositionFilter(categories[0]);
      }
    } else if (!targetRole && !selectedPlayer) {
      setActivePositionFilter('ALL');
    }
  }, [targetRole, selectedPlayer]);

  // Generic positions list
  const positions = ['ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];

  // Filter by search query (used for accurate tab counts)
  const searchedPlayers = players.filter((player) => {
    if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Filter and sort players in memory for maximum responsiveness
  const filteredPlayers = searchedPlayers
    .filter((player) => {
      // Filter by Position selector
      if (activePositionFilter !== 'ALL' && player.generic_position !== activePositionFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort logic
      if (sortBy === 'rating-desc') return b.rating - a.rating;
      if (sortBy === 'rating-asc') return a.rating - b.rating;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="glass-panel" style={styles.selectorContainer}>
      <div style={styles.teamRollBanner}>
        {randomizedTeam ? (
          <div style={styles.teamBannerContent}>
            <img 
              src={randomizedTeam.logo_url || 'https://media.api-sports.io/football/leagues/2.png'} 
              alt={randomizedTeam.name} 
              style={styles.bannerLogo}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://media.api-sports.io/football/leagues/2.png';
              }}
            />
            <div style={styles.bannerTextContainer}>
              <span style={styles.bannerTitle}>Active Team Pool</span>
              <h2 style={styles.bannerTeamName}>{randomizedTeam.name}</h2>
            </div>
            <button 
              onClick={onReroll} 
              disabled={rerollsLeft <= 0} 
              className="btn-secondary" 
              style={{
                ...styles.rerollBtn,
                ...(rerollsLeft > 0 ? styles.rerollBtnActive : {})
              }}
            >
              <RotateCw size={14} style={{ marginRight: '6px' }} />
              Reroll ({rerollsLeft} left)
            </button>
          </div>
        ) : (
          <div style={styles.bannerTextContainer}>Loading team pool...</div>
        )}
      </div>

      <h3 style={styles.header}>
        UCL Player Pool Selection
        {targetRole && (
          <span style={styles.subtitle}>
            {" "} drafting for <span style={styles.highlightRole}>{targetRole}</span>
          </span>
        )}
      </h3>

      {/* Filters Bar */}
      <div style={styles.filterBar}>

        {/* Search Input */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>Search Player:</label>
          <div style={styles.searchContainer}>
            <Search size={16} color="#8e9bb8" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="e.g. Zidane, Ronaldo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.input}
              className="ucl-input"
            />
          </div>
        </div>

        {/* Sort selector */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
            className="ucl-input"
          >
            <option value="rating-desc">Rating: High to Low</option>
            <option value="rating-asc">Rating: Low to High</option>
            <option value="name-asc">Name: A-Z</option>
          </select>
        </div>

        {/* Layout Toggle */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>Layout:</label>
          <div style={styles.toggleGroup}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'grid' ? styles.toggleBtnActive : {})
              }}
              title="Grid Cards"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'list' ? styles.toggleBtnActive : {})
              }}
              title="Compact List"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Position Filters */}
      <div className="no-scrollbar" style={styles.posToggleContainer}>
        {positions.map((pos) => {
          const isActive = activePositionFilter === pos;
          const count = pos === 'ALL' 
            ? searchedPlayers.length 
            : searchedPlayers.filter(p => p.generic_position === pos).length;

          return (
            <button
              key={pos}
              onClick={() => setActivePositionFilter(pos)}
              style={{
                ...styles.posTab,
                ...(isActive ? styles.posTabActive : {}),
              }}
            >
              <span style={{ marginRight: '6px' }}>{pos}</span>
              <span style={{
                display: 'inline-block',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '0.68rem',
                fontWeight: '800',
                background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                color: isActive ? 'var(--bg-color)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Players List Grid / Column Section */}
      <div style={styles.poolScrollContainer}>
        {loading ? (
          <div style={styles.centeredMsg}>Loading players from Supabase...</div>
        ) : filteredPlayers.length === 0 ? (
          <div style={styles.centeredMsg}>
            No players found matching the filters. Try selecting a different team or clearing the search.
          </div>
        ) : (
          <div style={viewMode === 'list' ? styles.playerList : styles.playerGrid}>
            {filteredPlayers.map((player) => {
              const isDrafted = draftedPlayerIds.includes(player.api_id);
              const isSelected = selectedPlayer && selectedPlayer.id === player.id;
              
              // Check if there are empty eligible slots for this player
              const slots = FORMATIONS[formation] || [];
              const hasEligibleEmptySlot = slots.some(
                (slot) => !draftedSquad[slot.id] && checkPositionEligibility(player.position, slot.role)
              );
              const isPlaceable = isDrafted || hasEligibleEmptySlot;
              const recommendedCategories = mapRoleToGeneric(targetRole);
              const isRecommended = recommendedCategories.includes(player.generic_position);

              if (viewMode === 'list') {
                return (
                  <div
                    key={player.id}
                    onClick={() => !isDrafted && isPlaceable && onSelectPlayer(player)}
                    style={{
                      ...styles.listPlayerRow,
                      ...(isDrafted ? styles.draftedRow : {}),
                      ...(!isPlaceable && !isDrafted ? styles.ineligibleRow : {}),
                      ...(isRecommended && !isDrafted && isPlaceable ? styles.recommendedRow : {}),
                      ...(isSelected ? { borderColor: '#f2cc60', boxShadow: '0 0 10px rgba(242, 204, 96, 0.4)' } : {}),
                    }}
                  >
                    <span style={{
                      fontWeight: '900',
                      fontSize: '0.85rem',
                      color: player.rating >= 88 ? 'var(--gold)' : 'var(--cyan-glow)',
                      minWidth: '24px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-title)'
                    }}>{player.rating}</span>
                    
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      minWidth: '35px',
                      textAlign: 'center'
                    }}>{player.position}</span>

                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                      <img src={player.photo_url || playerPlaceholder} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = playerPlaceholder;
                      }} />
                    </div>

                    <span style={{
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{player.name}</span>

                    <span style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      maxWidth: '120px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginRight: '8px'
                    }}>{player.teams?.name}</span>

                    {isDrafted ? (
                      <span style={styles.statusDrafted}>DRAFTED</span>
                    ) : !isPlaceable ? (
                      <span style={styles.statusFull}>FULL</span>
                    ) : isRecommended ? (
                      <span style={styles.statusRec}>Best Fit</span>
                    ) : (
                      <span style={styles.statusSelect}>SELECT</span>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={player.id}
                  onClick={() => !isDrafted && isPlaceable && onSelectPlayer(player)}
                  className={`player-card ${player.rating >= 88 ? 'gold-tier' : ''} ${isSelected ? 'active' : ''}`}
                  style={{
                    ...styles.gridPlayerCard,
                    ...(isDrafted ? styles.draftedCard : {}),
                    ...(!isPlaceable && !isDrafted ? styles.ineligibleCard : {}),
                    ...(isRecommended && !isDrafted && isPlaceable ? styles.recommendedCard : {}),
                    ...(isSelected ? { borderColor: '#f2cc60', boxShadow: '0 0 15px rgba(242, 204, 96, 0.7)' } : {}),
                  }}
                >
                  <div className="rating-badge" style={{ fontSize: '0.75rem', padding: '1px 5px' }}>{player.rating}</div>
                  <div className="position-badge" style={{ fontSize: '0.68rem', padding: '1px 4px' }}>{player.position}</div>
                  <div className="photo-container" style={{ width: '48px', height: '48px', marginTop: '10px', marginBottom: '4px' }}>
                    <img src={player.photo_url || playerPlaceholder} alt={player.name} onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = playerPlaceholder;
                    }} />
                  </div>
                  <div className="name-label" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{player.name}</div>
                  <div className="team-label" style={{ fontSize: '0.62rem', marginTop: '1px' }}>{player.teams?.name}</div>

                  {isDrafted && (
                    <div style={styles.draftedOverlay}>
                      <UserCheck size={20} color="#00ff87" />
                      <span style={styles.draftedText}>DRAFTED</span>
                    </div>
                  )}

                  {!isPlaceable && !isDrafted && (
                    <div style={styles.draftedOverlay}>
                      <span style={{ ...styles.draftedText, color: 'var(--danger)' }}>FULL</span>
                    </div>
                  )}

                  {isRecommended && !isDrafted && isPlaceable && (
                    <div style={styles.recBadge}>Best Fit</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  selectorContainer: {
    width: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '680px',
  },
  header: {
    fontSize: '1.25rem',
    fontWeight: '800',
    marginBottom: '15px',
    borderBottom: '1.5px solid var(--panel-border)',
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'var(--font-title)',
    letterSpacing: '1px',
    flexShrink: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    fontWeight: 'normal',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-family)',
    letterSpacing: '0',
  },
  highlightRole: {
    color: 'var(--cyan-glow)',
    fontWeight: '800',
    textShadow: '0 0 8px var(--cyan-glow-dim)',
  },
  filterBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
    flexShrink: 0,
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    background: 'rgba(2, 11, 36, 0.65)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '9px 12px',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
  },
  input: {
    background: 'rgba(2, 11, 36, 0.65)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '9px 12px 9px 36px',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  },
  posToggleContainer: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingTop: '4px',
    paddingBottom: '12px',
    marginBottom: '15px',
    borderBottom: '1.5px solid var(--panel-border)',
    alignItems: 'center',
    flexShrink: 0,
  },
  posTab: {
    background: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-muted)',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: 'var(--panel-border)',
    borderRadius: '24px',
    padding: '6px 14px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  posTabActive: {
    background: 'var(--cyan-glow-dim)',
    color: '#ffffff',
    borderColor: 'var(--cyan-glow)',
    boxShadow: '0 0 12px rgba(0, 240, 255, 0.25)',
  },
  poolScrollContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '5px',
  },
  playerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
    gap: '12px',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  gridPlayerCard: {
    position: 'relative',
    width: '100%',
    height: '155px',
  },
  listPlayerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 12px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(9, 28, 66, 0.5) 0%, rgba(3, 15, 45, 0.6) 100%)',
    border: '1.5px solid #1a3370',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  draftedCard: {
    opacity: 0.35,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  draftedRow: {
    opacity: 0.35,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  ineligibleCard: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  ineligibleRow: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  recommendedCard: {
    borderColor: 'rgba(0, 240, 255, 0.65)',
    animation: 'pulse-cyan 2s infinite',
  },
  recommendedRow: {
    borderColor: 'rgba(0, 240, 255, 0.5)',
  },
  recBadge: {
    position: 'absolute',
    bottom: '4px',
    background: 'linear-gradient(135deg, #005fcc 0%, #00f0ff 100%)',
    color: '#ffffff',
    fontSize: '0.55rem',
    fontWeight: '900',
    padding: '1px 4px',
    borderRadius: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 4px rgba(0, 240, 255, 0.4)',
    zIndex: 6,
  },
  draftedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(2, 11, 36, 0.82)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    gap: '6px',
    zIndex: 10,
  },
  draftedText: {
    fontSize: '0.72rem',
    fontWeight: '900',
    color: '#00ff87',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  centeredMsg: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
  },
  teamRollBanner: {
    background: 'linear-gradient(135deg, rgba(9, 26, 73, 0.85) 0%, rgba(3, 10, 33, 0.95) 100%)',
    borderRadius: '14px',
    padding: '16px 20px',
    marginBottom: '20px',
    border: '1.5px solid rgba(0, 240, 255, 0.22)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  teamBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    width: '100%',
  },
  bannerLogo: {
    width: '46px',
    height: '46px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))',
  },
  bannerTextContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  bannerTitle: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'var(--cyan-glow)',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
  },
  bannerTeamName: {
    fontSize: '1.25rem',
    fontWeight: '900',
    color: '#ffffff',
    marginTop: '2px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.5px',
    lineHeight: '1.2',
  },
  rerollBtn: {
    padding: '10px 18px',
    fontSize: '0.85rem',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  rerollBtnActive: {
    border: '1px solid var(--cyan-glow)',
    boxShadow: '0 0 12px var(--cyan-glow-dim)',
    color: 'var(--cyan-glow)',
    background: 'rgba(0, 240, 255, 0.05)',
    cursor: 'pointer',
  },
  toggleGroup: {
    display: 'flex',
    background: 'rgba(2, 11, 36, 0.65)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '2px',
    height: '38px',
    alignItems: 'center',
    width: 'fit-content',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '6px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  toggleBtnActive: {
    background: 'var(--cyan-glow-dim)',
    color: '#ffffff',
    boxShadow: '0 0 8px rgba(0, 240, 255, 0.2)',
  },
  statusDrafted: {
    fontSize: '0.68rem',
    fontWeight: '900',
    color: '#00ff87',
    textTransform: 'uppercase',
  },
  statusFull: {
    fontSize: '0.68rem',
    fontWeight: '900',
    color: 'var(--danger)',
    textTransform: 'uppercase',
  },
  statusRec: {
    fontSize: '0.62rem',
    fontWeight: '900',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #005fcc 0%, #00f0ff 100%)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    boxShadow: '0 2px 6px rgba(0, 240, 255, 0.3)',
  },
  statusSelect: {
    fontSize: '0.68rem',
    fontWeight: '900',
    color: 'var(--cyan-glow)',
    textTransform: 'uppercase',
  },
};

export default PlayerSelector;
