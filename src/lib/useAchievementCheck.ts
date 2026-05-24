import { AppData } from './types';
import { saveData } from './storage';
import { checkAchievements, persistAchievements } from './achievements';

export function runAchievementCheck(data: AppData): AppData {
  const profileId = data.activeProfileId;
  const newly = checkAchievements(data, profileId);
  if (newly.length > 0) {
    const updated = persistAchievements(data, profileId, newly);
    saveData(updated);
    return updated;
  }
  return data;
}
