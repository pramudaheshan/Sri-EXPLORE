import { useState, useEffect, useCallback } from 'react';
import { Relic, Region, UserProgress, InventoryState } from '../types';

// Mock regions data
const MOCK_REGIONS: Region[] = [
  {
    id: 'polonnaruwa',
    name: 'Polonnaruwa',
    subtitle: 'Ancient City',
    totalRelics: 5,
    collectedRelics: 2,
  },
  {
    id: 'sigiriya',
    name: 'Sigiriya',
    subtitle: 'Lion Rock Fortress',
    totalRelics: 8,
    collectedRelics: 0,
  },
  {
    id: 'anuradhapura',
    name: 'Anuradhapura',
    subtitle: 'Sacred City',
    totalRelics: 12,
    collectedRelics: 0,
  },
];

interface UseInventoryReturn {
  inventory: InventoryState;
  currentRegion: Region;
  userProgress: UserProgress;
  addToInventory: (relic: Relic) => void;
  setCurrentRegion: (regionId: string) => void;
  calculateLevelProgress: () => number;
}

export const useInventory = (): UseInventoryReturn => {
  const [collectedRelics, setCollectedRelics] = useState<Relic[]>([]);
  const [currentRegion, setCurrentRegionState] = useState<Region>(
    MOCK_REGIONS[0]
  );
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 7,
    experience: 2450,
    experienceToNextLevel: 3000,
    totalRelicsCollected: 15,
    currentStreak: 3,
  });

  const inventory: InventoryState = {
    collected: currentRegion.collectedRelics,
    total: currentRegion.totalRelics,
    relics: collectedRelics,
  };

  const addToInventory = useCallback((relic: Relic) => {
    setCollectedRelics((prev) => [...prev, relic]);

    // Update region progress
    setCurrentRegionState((prev) => ({
      ...prev,
      collectedRelics: prev.collectedRelics + 1,
    }));

    // Update user progress
    setUserProgress((prev) => {
      const newExperience = prev.experience + relic.points;
      const leveledUp = newExperience >= prev.experienceToNextLevel;

      return {
        ...prev,
        experience: leveledUp
          ? newExperience - prev.experienceToNextLevel
          : newExperience,
        level: leveledUp ? prev.level + 1 : prev.level,
        experienceToNextLevel: leveledUp
          ? prev.experienceToNextLevel + 500
          : prev.experienceToNextLevel,
        totalRelicsCollected: prev.totalRelicsCollected + 1,
      };
    });
  }, []);

  const setCurrentRegion = useCallback((regionId: string) => {
    const region = MOCK_REGIONS.find((r) => r.id === regionId);
    if (region) {
      setCurrentRegionState(region);
    }
  }, []);

  const calculateLevelProgress = useCallback((): number => {
    return (userProgress.experience / userProgress.experienceToNextLevel) * 100;
  }, [userProgress]);

  return {
    inventory,
    currentRegion,
    userProgress,
    addToInventory,
    setCurrentRegion,
    calculateLevelProgress,
  };
};
