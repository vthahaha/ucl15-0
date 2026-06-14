import React from 'react';
import { Sparkles, Trophy, Shuffle, Zap, Users } from 'lucide-react';
import { useDraft } from '../context/DraftContext';
import { styles } from '../styles/styles';

const FORMATION_DESCRIPTIONS = {
  '3-1-4-2': 'Midfield Press',
  '3-4-1-2': 'Creative Playmaker Pivot',
  '3-4-2-1 (2 CAMs)': 'Dual Attacking Midfielders',
  '3-4-3': 'High-Press Width',
  '3-5-2': 'Midfield Dominance',
  '4-1-2-1-2 Wide': 'Diamond Attacking Width',
  '4-1-2-1-2 Narrow': 'Classic Midfield Diamond',
  '4-1-3-2': 'Central Attacking Core',
  '4-1-4-1': 'Balanced Positional Play',
  '4-2-1-3': 'Front-Three Focus',
  '4-2-2-2': 'Dual Box-to-Box Pivots',
  '4-2-3-1 Narrow': 'Central Dominance & Control',
  '4-2-3-1 Wide': 'Double Pivot Control',
  '4-2-4': 'All-Out Attack',
  '4-3-1-2': 'Midfield Diamond Pivot',
  '4-3-2-1': 'The Christmas Tree',
  '4-3-3 Flat': 'Classic Three-Man Midfield',
  '4-3-3 Attack': 'Attacking Width & CAM',
  '4-3-3 Defend': 'Double-Pivot Defensive Width',
  '4-3-3 Holding': 'Anchor Man Stability',
  '4-4-1-1 (1 CF - 1 ST)': 'Second Striker Support',
  '4-4-2 Flat': 'Classic Balance',
  '4-4-2 Holding': 'Double Pivot Defensive Block',
  '4-5-1 Attack': 'Attacking Midfield Overload',
  '4-5-1 Flat': 'Park The Bus Midfield',
  '5-2-1-2': 'Wingback Diamond Play',
  '5-2-3': 'Wingback Attacking Front-Three',
  '5-3-2': 'Solid Wingback System',
  '5-3-2 Holding': 'Defensive Wingback Anchors',
  '5-4-1': 'The Defensive Wall'
};

const SetupPage = () => {
  const {
    availableFormations,
    formation,
    setFormation,
    era,
    setEra,
    teamName,
    setTeamName,
    startDraft
  } = useDraft();

  return (
    <div style={styles.setupWorkspace} className="animate-fade-in">
      {/* Left Column: Hero Showcase */}
      <div style={styles.setupHeroPanel} className="glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={styles.heroBadge}>
            <Trophy size={14} color="var(--cyan-glow)" />
            Official UCL Campaign
          </div>
          <h2 style={styles.heroMainTitle}>
            Assemble Your <br />
            <span style={{ color: 'var(--cyan-glow)' }}>Ultimate UCL Squad</span>
          </h2>
          <p style={styles.heroDescription}>
            Draft legendary players across historical football eras, select matching tactical shapes, and test your team in a realistic simulation league.
          </p>

          <div style={styles.featuresGrid}>
            <div style={styles.featureItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--cyan-glow)" />
                <span style={styles.featureTitle}>30+ Tactics</span>
              </div>
              <p style={styles.featureDesc}>Choose from 30 authentic tactical formations available in football history.</p>
            </div>
            
            <div style={styles.featureItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={16} color="var(--cyan-glow)" />
                <span style={styles.featureTitle}>4 Historical Eras</span>
              </div>
              <p style={styles.featureDesc}>Filter players from the 2000s, 2010s, 2020s, or build an All-Time dream squad.</p>
            </div>

            <div style={styles.featureItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shuffle size={16} color="var(--cyan-glow)" />
                <span style={styles.featureTitle}>Reroll Drafts</span>
              </div>
              <p style={styles.featureDesc}>Reroll your active team pools up to 3 times to secure star players.</p>
            </div>

            <div style={styles.featureItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="var(--cyan-glow)" />
                <span style={styles.featureTitle}>Poisson Engine</span>
              </div>
              <p style={styles.featureDesc}>Matches simulated with rating weights, home-leg advantages, and upset probabilities.</p>
            </div>
          </div>
        </div>

        <div style={styles.quickStatsPanel}>
          <div style={styles.statBox}>
            <span style={styles.statValue}>30</span>
            <span style={styles.statLabel}>Formations</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)' }}></div>
          <div style={styles.statBox}>
            <span style={styles.statValue}>4</span>
            <span style={styles.statLabel}>Eras</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)' }}></div>
          <div style={styles.statBox}>
            <span style={styles.statValue}>240+</span>
            <span style={styles.statLabel}>UCL Clubs</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)' }}></div>
          <div style={styles.statBox}>
            <span style={styles.statValue}>8,000+</span>
            <span style={styles.statLabel}>Players</span>
          </div>
        </div>
      </div>

      {/* Right Column: Setup Panel */}
      <div style={{ padding: '30px', margin: 0 }} className="glass-panel">
        <div style={styles.setupHeader}>
          <Sparkles size={24} color="var(--cyan-glow)" />
          <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)' }}>Configure Campaign</h2>
        </div>

        <div style={styles.setupForm}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Team Name</label>
            <input
              type="text"
              placeholder="e.g. Galácticos XI"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Formation</label>
            <div style={styles.radioGrid}>
              {availableFormations.map((f) => (
                <div
                  key={f}
                  onClick={() => setFormation(f)}
                  style={{
                    ...styles.radioButton,
                    ...(formation === f ? styles.radioButtonActive : {}),
                  }}
                >
                  <span style={styles.radioTitle}>{f}</span>
                  <span style={styles.radioDesc}>
                    {FORMATION_DESCRIPTIONS[f] || 'Tactical Setup'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select UCL Era</label>
            <div style={styles.radioGrid}>
              {[
                { id: '2020s', title: '2020s Era', desc: 'Current Superstars (2020 - 2025)' },
                { id: '2010s', title: '2010s Era', desc: 'Messi-Ronaldo Dominance (2010 - 2019)' },
                { id: '2000s', title: '2000s Era', desc: 'Galácticos & Legends (2000 - 2009)' },
                { id: 'all-time', title: 'All-Time Era', desc: 'Classic Champions (1992 - 2025)' },
              ].map((e) => (
                <div
                  key={e.id}
                  onClick={() => setEra(e.id)}
                  style={{
                    ...styles.radioButton,
                    ...(era === e.id ? styles.radioButtonActive : {}),
                  }}
                >
                  <span style={styles.radioTitle}>{e.title}</span>
                  <span style={styles.radioDesc}>{e.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={startDraft} style={styles.submitBtn}>
            Enter Draft Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
