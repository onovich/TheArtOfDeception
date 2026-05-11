export function assignFormationTargets(units, squadId, tx, ty, type) {
  const squadUnits = units.filter((unit) => unit.team === 'blue' && unit.squadId === squadId);
  if (squadUnits.length === 0) {
    return;
  }

  squadUnits.forEach((unit) => {
    let offsetX = 0;
    let offsetY = 0;

    if (type === 'archer') {
      offsetX = (unit.indexInSquad - squadUnits.length / 2) * 14;
      offsetY = unit.indexInSquad % 2 === 0 ? 6 : -6;
    } else if (type === 'scout') {
      offsetX = (Math.random() - 0.5) * 80;
      offsetY = (Math.random() - 0.5) * 80;
    } else {
      const columns = 5;
      const row = Math.floor(unit.indexInSquad / columns);
      const column = unit.indexInSquad % columns;
      offsetX = (column - Math.floor(columns / 2)) * 12;
      offsetY = (row - 1) * 12;
    }

    unit.targetPos = {
      x: tx + offsetX,
      y: ty + offsetY,
    };
  });
}