export const getMotionType = (
  types: Map<string, string>,
  evmScriptFactory: string,
) => {
  return types.get(evmScriptFactory.toLowerCase()) || "New ";
};

export const getMotionLink = (motionId: string) => {
  return `[${motionId}](https://easytrack.lido.fi/motions/${motionId})`;
};
