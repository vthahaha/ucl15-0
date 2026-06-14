import React from 'react';
import { UserPlus } from 'lucide-react';
import { checkPositionEligibility } from '../utils/positionRules';
import playerPlaceholder from '../assets/player_placeholder.png';

// Formations definition with percentages (x: left%, y: top%)
export const FORMATIONS = {
  '3-1-4-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 28, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 72, y: 72 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 44 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 46 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 46 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 44 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '3-4-1-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 28, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 72, y: 72 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 36, y: 49 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 64, y: 49 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 34 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '3-4-2-1 (2 CAMs)': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 28, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 72, y: 72 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 36, y: 50 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 64, y: 50 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'cam1', role: 'CAM', label: 'LCAM', x: 35, y: 32 },
    { id: 'cam2', role: 'CAM', label: 'RCAM', x: 65, y: 32 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '3-4-3': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 25, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 75, y: 72 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 38, y: 49 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 62, y: 49 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '3-5-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 25, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 75, y: 72 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 49 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 55 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 49 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-1-2-1-2 Wide': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 44 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 44 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 34 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-1-2-1-2 Narrow': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 30, y: 48 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 70, y: 48 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 34 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-1-3-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 42 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 38 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 75, y: 42 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-1-4-1': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 58 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 42 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 44 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 44 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 42 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-2-1-3': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 35, y: 56 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 65, y: 56 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 38 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-2-2-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 35, y: 56 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 65, y: 56 },
    { id: 'cam1', role: 'CAM', label: 'LAM', x: 30, y: 36 },
    { id: 'cam2', role: 'CAM', label: 'RAM', x: 70, y: 36 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-2-3-1 Narrow': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 35, y: 56 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 65, y: 56 },
    { id: 'cam1', role: 'CAM', label: 'LAM', x: 30, y: 36 },
    { id: 'cam2', role: 'CAM', label: 'CAM', x: 50, y: 38 },
    { id: 'cam3', role: 'CAM', label: 'RAM', x: 70, y: 36 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-2-3-1 Wide': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 35, y: 56 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 65, y: 56 },
    { id: 'lm', role: 'LM', label: 'LM', x: 20, y: 36 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 38 },
    { id: 'rm', role: 'RM', label: 'RM', x: 80, y: 36 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-2-4': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 50 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 50 },
    { id: 'lw', role: 'LW', label: 'LW', x: 15, y: 22 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 85, y: 22 },
  ],
  '4-3-1-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 50 },
    { id: 'cdm', role: 'CDM', label: 'CCM', x: 50, y: 52 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 75, y: 50 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 34 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-3-2-1': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 50 },
    { id: 'cdm', role: 'CDM', label: 'CCM', x: 50, y: 52 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 75, y: 50 },
    { id: 'cf1', role: 'CF', label: 'LCF', x: 35, y: 30 },
    { id: 'cf2', role: 'CF', label: 'RCF', x: 65, y: 30 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-3-3 Flat': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 48 },
    { id: 'cm2', role: 'CM', label: 'CCM', x: 50, y: 48 },
    { id: 'cm3', role: 'CM', label: 'RCM', x: 75, y: 48 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-3-3 Attack': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 50 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 36 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 75, y: 50 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-3-3 Defend': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 32, y: 56 },
    { id: 'cm', role: 'CM', label: 'CM', x: 50, y: 46 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 68, y: 56 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-3-3 Holding': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 25, y: 48 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 53 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 75, y: 48 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '4-4-1-1 (1 CF - 1 ST)': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 38, y: 49 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 62, y: 49 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'cf', role: 'CF', label: 'CF', x: 50, y: 29 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-4-2 Flat': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 46 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 38, y: 49 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 62, y: 49 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 46 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-4-2 Holding': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 42 },
    { id: 'cdm1', role: 'CDM', label: 'LDM', x: 38, y: 52 },
    { id: 'cdm2', role: 'CDM', label: 'RDM', x: 62, y: 52 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 42 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '4-5-1 Attack': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 40 },
    { id: 'cam1', role: 'CAM', label: 'LCAM', x: 35, y: 36 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 55 },
    { id: 'cam2', role: 'CAM', label: 'RCAM', x: 65, y: 36 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 40 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '4-5-1 Flat': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'LB', label: 'LB', x: 15, y: 70 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 38, y: 72 },
    { id: 'cb2', role: 'CB', label: 'RCB', x: 62, y: 72 },
    { id: 'rb', role: 'RB', label: 'RB', x: 85, y: 70 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 42 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 32, y: 48 },
    { id: 'cm2', role: 'CM', label: 'CCM', x: 50, y: 48 },
    { id: 'cm3', role: 'CM', label: 'RCM', x: 68, y: 48 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 42 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
  '5-2-1-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lwb', role: 'LWB', label: 'LWB', x: 12, y: 62 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 30, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 70, y: 72 },
    { id: 'rwb', role: 'RWB', label: 'RWB', x: 88, y: 62 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 48 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 48 },
    { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 34 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '5-2-3': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lwb', role: 'LWB', label: 'LWB', x: 12, y: 62 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 30, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 70, y: 72 },
    { id: 'rwb', role: 'RWB', label: 'RWB', x: 88, y: 62 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 35, y: 48 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 65, y: 48 },
    { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22 },
  ],
  '5-3-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lwb', role: 'LWB', label: 'LWB', x: 12, y: 62 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 30, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 70, y: 72 },
    { id: 'rwb', role: 'RWB', label: 'RWB', x: 88, y: 62 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 30, y: 46 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 50 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 70, y: 46 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '5-3-2 Holding': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lwb', role: 'LWB', label: 'LWB', x: 12, y: 62 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 30, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 70, y: 72 },
    { id: 'rwb', role: 'RWB', label: 'RWB', x: 88, y: 62 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 32, y: 46 },
    { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 54 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 68, y: 46 },
    { id: 'st1', role: 'ST', label: 'LST', x: 38, y: 18 },
    { id: 'st2', role: 'ST', label: 'RST', x: 62, y: 18 },
  ],
  '5-4-1': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lwb', role: 'LWB', label: 'LWB', x: 12, y: 62 },
    { id: 'cb1', role: 'CB', label: 'LCB', x: 30, y: 72 },
    { id: 'cb2', role: 'CB', label: 'CCB', x: 50, y: 73 },
    { id: 'cb3', role: 'CB', label: 'RCB', x: 70, y: 72 },
    { id: 'rwb', role: 'RWB', label: 'RWB', x: 88, y: 62 },
    { id: 'lm', role: 'LM', label: 'LM', x: 15, y: 42 },
    { id: 'cm1', role: 'CM', label: 'LCM', x: 38, y: 48 },
    { id: 'cm2', role: 'CM', label: 'RCM', x: 62, y: 48 },
    { id: 'rm', role: 'RM', label: 'RM', x: 85, y: 42 },
    { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18 },
  ],
};

const Pitch = ({ formation, draftedSquad, activeSlotId, onSlotSelect, selectedPlayer }) => {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];

  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isXS = windowWidth < 480;
  const slotSize = isXS ? 36 : (isMobile ? 46 : 64);

  return (
    <div style={styles.pitchContainer} className="pitch-container">
      <div style={styles.pitchField}>
        {/* Grass Alternating Stripes & Spotlight Glow */}
        <div style={styles.pitchGrassOverlay}></div>
        
        {/* Outer boundaries & markings */}
        <div style={styles.penaltyAreaTop}></div>
        <div style={styles.penaltyAreaTopGoal}></div>
        <div style={styles.centerCircle}></div>
        <div style={styles.centerLine}></div>
        <div style={styles.penaltyAreaBottom}></div>
        <div style={styles.penaltyAreaBottomGoal}></div>
        
        {/* Stadium Corner Arcs */}
        <div style={styles.cornerTopLeft}></div>
        <div style={styles.cornerTopRight}></div>
        <div style={styles.cornerBottomLeft}></div>
        <div style={styles.cornerBottomRight}></div>

        {/* Formation Slots */}
        {slots.map((slot) => {
          const player = draftedSquad[slot.id];
          const isActive = activeSlotId === slot.id;
          const isEligible = selectedPlayer && !player && checkPositionEligibility(selectedPlayer.position, slot.role);

          return (
            <div
              key={slot.id}
              onClick={() => onSlotSelect(slot.id, slot.role)}
              style={{
                ...styles.slotContainer,
                left: `${slot.x}%`,
                top: `${slot.y}%`,
              }}
            >
              {player ? (
                // Player Card Rendered on Pitch
                <div
                  className={`pitch-player-card animate-fade-in ${isActive ? 'active' : ''} ${player.rating >= 88 ? 'gold-tier' : ''}`}
                >
                  <div className="rating-badge">{player.rating}</div>
                  <div className="position-badge">{player.position}</div>
                  <div className="photo-container">
                    <img src={player.photo_url || playerPlaceholder} alt={player.name} onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = playerPlaceholder;
                    }} />
                  </div>
                  <div className="name-label">{player.name}</div>
                  <div className="team-label">{player.teams?.name}</div>
                </div>
              ) : (
                // Empty Slot Placeholder (High-Tech Pulse Target)
                <div
                  style={{
                    ...styles.emptySlot,
                    width: `${slotSize}px`,
                    height: `${slotSize}px`,
                    ...(isActive ? styles.emptySlotActive : {}),
                    ...(isEligible ? styles.emptySlotEligible : {}),
                  }}
                  className="empty-slot-btn"
                >
                  <div style={{
                    ...styles.emptySlotPulseRing,
                    ...(isActive ? styles.emptySlotPulseRingActive : {}),
                    ...(isEligible ? styles.emptySlotPulseRingEligible : {}),
                  }}></div>
                  <UserPlus size={isXS ? 12 : (isMobile ? 14 : 18)} color={isEligible ? '#f2cc60' : isActive ? '#00f0ff' : '#8e9bb8'} style={{ zIndex: 2 }} />
                  <span style={{
                    ...styles.roleLabel,
                    fontSize: isXS ? '0.45rem' : (isMobile ? '0.55rem' : '0.65rem'),
                    ...(isEligible ? { color: '#f2cc60' } : {}),
                    ...(isActive ? { color: '#00f0ff' } : {})
                  }}>{slot.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  pitchContainer: {
    width: '100%',
    maxWidth: '620px',
    height: '680px',
    margin: '0 auto',
    padding: '10px',
    position: 'relative',
  },
  pitchField: {
    width: '100%',
    height: '100%',
    background: '#040d26',
    border: '3px solid rgba(0, 240, 255, 0.25)',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.8), 0 12px 36px rgba(0, 0, 0, 0.6)',
  },
  pitchGrassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 50% 50%, rgba(13, 40, 102, 0.3) 0%, rgba(2, 8, 24, 0.9) 100%), repeating-linear-gradient(180deg, rgba(9, 28, 77, 0.4) 0px, rgba(9, 28, 77, 0.4) 35px, rgba(5, 17, 48, 0.4) 35px, rgba(5, 17, 48, 0.4) 70px)',
    pointerEvents: 'none',
  },
  penaltyAreaTop: {
    position: 'absolute',
    top: '-3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '50%',
    height: '18%',
    border: '2px solid rgba(0, 240, 255, 0.16)',
    borderTop: 'none',
  },
  penaltyAreaTopGoal: {
    position: 'absolute',
    top: '-3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20%',
    height: '6%',
    border: '2px solid rgba(0, 240, 255, 0.16)',
    borderTop: 'none',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '26%',
    height: '24%',
    borderRadius: '50%',
    border: '2px solid rgba(0, 240, 255, 0.16)',
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: '0',
    width: '100%',
    height: '2px',
    backgroundColor: 'rgba(0, 240, 255, 0.16)',
  },
  penaltyAreaBottom: {
    position: 'absolute',
    bottom: '-3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '50%',
    height: '18%',
    border: '2px solid rgba(0, 240, 255, 0.16)',
    borderBottom: 'none',
  },
  penaltyAreaBottomGoal: {
    position: 'absolute',
    bottom: '-3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20%',
    height: '6%',
    border: '2px solid rgba(0, 240, 255, 0.16)',
    borderBottom: 'none',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    width: '14px',
    height: '14px',
    borderBottom: '2px solid rgba(0, 240, 255, 0.2)',
    borderRight: '2px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '0 0 14px 0',
  },
  cornerTopRight: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '14px',
    height: '14px',
    borderBottom: '2px solid rgba(0, 240, 255, 0.2)',
    borderLeft: '2px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '0 0 0 14px',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    width: '14px',
    height: '14px',
    borderTop: '2px solid rgba(0, 240, 255, 0.2)',
    borderRight: '2px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '0 14px 0 0',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '14px',
    height: '14px',
    borderTop: '2px solid rgba(0, 240, 255, 0.2)',
    borderLeft: '2px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '14px 0 0 0',
  },
  slotContainer: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    cursor: 'pointer',
  },
  emptySlot: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '1.5px solid rgba(255, 255, 255, 0.1)',
    background: 'radial-gradient(circle, rgba(10, 32, 87, 0.5) 0%, rgba(3, 11, 33, 0.8) 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    boxShadow: 'inset 0 0 10px rgba(0, 240, 255, 0.05), 0 4px 10px rgba(0, 0, 0, 0.4)',
  },
  emptySlotActive: {
    borderColor: '#00f0ff',
    background: 'radial-gradient(circle, rgba(10, 32, 87, 0.95) 0%, rgba(3, 11, 33, 1) 100%)',
    transform: 'scale(1.08)',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 10px rgba(0, 240, 255, 0.3)',
  },
  emptySlotEligible: {
    borderColor: '#f2cc60',
    background: 'radial-gradient(circle, rgba(41, 34, 11, 0.95) 0%, rgba(13, 11, 3, 1) 100%)',
    transform: 'scale(1.08)',
    boxShadow: '0 0 20px rgba(242, 204, 96, 0.6), inset 0 0 10px rgba(242, 204, 96, 0.3)',
    animation: 'pulse-gold 2s infinite',
  },
  emptySlotPulseRing: {
    position: 'absolute',
    top: '-3px',
    left: '-3px',
    right: '-3px',
    bottom: '-3px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
  },
  emptySlotPulseRingActive: {
    borderColor: 'rgba(0, 240, 255, 0.5)',
    animation: 'pulse-cyan 2s infinite',
  },
  emptySlotPulseRingEligible: {
    borderColor: 'rgba(242, 204, 96, 0.5)',
    animation: 'pulse-gold 2s infinite',
  },
  roleLabel: {
    fontSize: '0.65rem',
    fontWeight: '800',
    color: '#8e9bb8',
    marginTop: '2px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    zIndex: 2,
    transition: 'all 0.2s ease',
  },
};

export default Pitch;
