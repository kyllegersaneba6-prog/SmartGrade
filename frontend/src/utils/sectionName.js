// Normalizes stored section labels to the compact "BSCS-1A" style.
// Legacy rows were saved as "BSCS 1-A"; this keeps the UI consistent
// without rewriting existing records.
export const formatSectionName = (name) => {
  if (!name) return name;
  const match = String(name).trim().match(/^(\S+)\s+(\d+)\s*-\s*([A-Za-z0-9]+)$/);
  if (!match) return name;
  return `${match[1]}-${match[2]}${match[3].toUpperCase()}`;
};
