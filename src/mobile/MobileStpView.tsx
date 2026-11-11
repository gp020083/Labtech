import React from 'react';
import { StpPage } from '../pages/StpPage';
import type { CalcToolId } from '../pages/ToolsPage';

export const MobileStpView: React.FC<{
  onOpenDriveBatch?: () => void;
  onStartCalc?: (id: CalcToolId) => void;
}> = ({ onOpenDriveBatch, onStartCalc }) => {
  return <StpPage onOpenDriveBatch={onOpenDriveBatch} onStartCalc={onStartCalc} />;
};
