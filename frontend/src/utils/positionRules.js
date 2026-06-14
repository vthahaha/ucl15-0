export const checkPositionEligibility = (playerPos, slotRole) => {
  if (!playerPos || !slotRole) return false;
  
  const role = slotRole.toUpperCase();
  if (role === 'SUB' || role === 'ANY') return true;

  // If slot ID contains numbers (like cb1, cb2, cm1, cm2, st1, st2), extract only the base position role.
  const baseRole = role.replace(/\d+$/, '');

  // Split positions if comma-separated string or array
  let positions = [];
  if (Array.isArray(playerPos)) {
    positions = playerPos;
  } else if (typeof playerPos === 'string') {
    positions = playerPos.split(',').map(p => p.trim());
  } else {
    positions = [playerPos];
  }

  const positionsUpper = positions.map(p => p.toUpperCase());

  // Rule 2: If a CM already has a CDM or CAM role as their other role, they should not be able to play CAM or CDM (in that order).
  if (positionsUpper.includes('CM') && positionsUpper.includes('CDM') && baseRole === 'CAM') {
    return false;
  }
  if (positionsUpper.includes('CM') && positionsUpper.includes('CAM') && baseRole === 'CDM') {
    return false;
  }

  // Compatibility matrix
  const compatibilityMap = {
    'GK': ['GK'],
    'CB': ['CB'],
    'LB': ['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM'],
    'RB': ['RB', 'LB', 'RWB', 'LWB', 'RM', 'LM'],
    'LWB': ['LWB', 'RWB', 'LB', 'RB', 'LM', 'RM'],
    'RWB': ['RWB', 'LWB', 'RB', 'LB', 'RM', 'LM'],
    'CDM': ['CDM', 'CM'],
    'CAM': ['CAM', 'CM'],
    'CM': ['CM', 'CDM', 'CAM'],
    'LM': ['LM', 'RM', 'LW', 'RW'],
    'RM': ['RM', 'LM', 'LW', 'RW'],
    'LW': ['LW', 'RW', 'LM', 'RM'],
    'RW': ['RW', 'LW', 'LM', 'RM'],
    'ST': ['ST', 'CF'],
    'CF': ['CF', 'ST', 'CAM'],
  };

  return positionsUpper.some(posUpper => {
    if (posUpper === baseRole) return true;
    const allowed = compatibilityMap[posUpper] || [];
    return allowed.includes(baseRole);
  });
};
