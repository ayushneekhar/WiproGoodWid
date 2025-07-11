export interface DeviceCommandMapping {
  dpId: number;
  name: string;
  description: string;
  type: 'boolean' | 'integer' | 'enum' | 'json' | 'string';
  range?: {min: number; max: number};
  options?: string[];
  jsonStructure?: string;
}

export const TUYA_DEVICE_COMMANDS: Record<string, DeviceCommandMapping> = {
  // Power Control
  switch_led: {
    dpId: 20,
    name: 'Power',
    description: 'Turn the light on and off',
    type: 'boolean',
  },

  // Work Mode
  work_mode: {
    dpId: 21,
    name: 'Work Mode',
    description: 'Switch between white light, color, scenes, etc.',
    type: 'enum',
    options: ['white', 'colour', 'scene', 'music'],
  },

  // Brightness Control
  bright_value_v2: {
    dpId: 22,
    name: 'Brightness',
    description: 'Control the brightness level',
    type: 'integer',
    range: {min: 10, max: 1000},
  },

  // Color Temperature
  temp_value_v2: {
    dpId: 23,
    name: 'Color Temperature',
    description: 'Adjust the color temperature of white light',
    type: 'integer',
    range: {min: 0, max: 1000},
  },

  // Color Data
  colour_data_v2: {
    dpId: 24,
    name: 'Color',
    description: 'Set specific color using HSV values',
    type: 'json',
    jsonStructure: '{"h": 0-360, "s": 0-1000, "v": 0-1000}',
  },

  // Scene Data
  scene_data_v2: {
    dpId: 25,
    name: 'Scene',
    description: 'Activate predefined lighting scenes',
    type: 'json',
    jsonStructure: '{"scene_num": 1-8}',
  },

  // Countdown Timer
  countdown_1: {
    dpId: 26,
    name: 'Countdown Timer',
    description: 'Set a countdown timer in seconds',
    type: 'integer',
    range: {min: 0, max: 86400}, // 24 hours max
  },
};

// Helper function to get command by dpId
export const getCommandByDpId = (
  dpId: number,
): DeviceCommandMapping | undefined => {
  return Object.values(TUYA_DEVICE_COMMANDS).find(cmd => cmd.dpId === dpId);
};

// Helper function to get command by name
export const getCommandByName = (
  name: string,
): DeviceCommandMapping | undefined => {
  return TUYA_DEVICE_COMMANDS[name];
};

// Helper function to create command payload
export const createCommandPayload = (
  command: DeviceCommandMapping,
  value: any,
): string => {
  let processedValue = value;

  // Process value based on command type
  switch (command.type) {
    case 'json':
      if (typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }
      break;
    case 'boolean':
      processedValue = Boolean(value);
      break;
    case 'integer':
      processedValue = parseInt(value.toString(), 10);
      // Clamp to range if specified
      if (command.range) {
        processedValue = Math.max(
          command.range.min,
          Math.min(command.range.max, processedValue),
        );
      }
      break;
    case 'enum':
      // Validate enum value
      if (command.options && !command.options.includes(value)) {
        throw new Error(
          `Invalid enum value: ${value}. Valid options: ${command.options.join(
            ', ',
          )}`,
        );
      }
      processedValue = value;
      break;
  }

  return JSON.stringify({[command.dpId]: processedValue});
};

// Predefined color presets for easy selection
export const COLOR_PRESETS = [
  {name: 'Red', h: 0, s: 1000, v: 1000},
  {name: 'Orange', h: 30, s: 1000, v: 1000},
  {name: 'Yellow', h: 60, s: 1000, v: 1000},
  {name: 'Green', h: 120, s: 1000, v: 1000},
  {name: 'Cyan', h: 180, s: 1000, v: 1000},
  {name: 'Blue', h: 240, s: 1000, v: 1000},
  {name: 'Purple', h: 270, s: 1000, v: 1000},
  {name: 'Pink', h: 300, s: 1000, v: 1000},
  {name: 'White', h: 0, s: 0, v: 1000},
];

// Scene presets
export const SCENE_PRESETS = [
  {name: 'Relax', scene_num: 1},
  {name: 'Focus', scene_num: 2},
  {name: 'Party', scene_num: 3},
  {name: 'Sleep', scene_num: 4},
  {name: 'Romantic', scene_num: 5},
  {name: 'Reading', scene_num: 6},
  {name: 'Natural', scene_num: 7},
  {name: 'Custom', scene_num: 8},
];

// Common countdown presets (in seconds)
export const COUNTDOWN_PRESETS = [
  {name: '5 min', seconds: 300},
  {name: '10 min', seconds: 600},
  {name: '15 min', seconds: 900},
  {name: '30 min', seconds: 1800},
  {name: '1 hour', seconds: 3600},
  {name: '2 hours', seconds: 7200},
  {name: '4 hours', seconds: 14400},
  {name: '8 hours', seconds: 28800},
];

// Utility function to parse Java HashMap toString format to JavaScript object
export const parseJavaHashMapString = (
  hashMapString: string,
): Record<string, any> => {
  if (!hashMapString || hashMapString.trim() === '') {
    return {};
  }

  try {
    // First try to parse as regular JSON
    return JSON.parse(hashMapString);
  } catch (error) {
    // If that fails, try to parse Java HashMap toString format
    try {
      // Remove outer braces and split by comma
      const content = hashMapString.replace(/^\{|\}$/g, '').trim();

      if (!content) {
        return {};
      }

      const pairs = content.split(',');
      const result: Record<string, any> = {};

      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) {
          const cleanKey = key.trim();
          const cleanValue = value.trim();

          // Try to parse the value as appropriate type
          if (cleanValue === 'true') {
            result[cleanKey] = true;
          } else if (cleanValue === 'false') {
            result[cleanKey] = false;
          } else if (cleanValue === 'null') {
            result[cleanKey] = null;
          } else if (!isNaN(Number(cleanValue))) {
            result[cleanKey] = Number(cleanValue);
          } else {
            // Remove quotes if present
            result[cleanKey] = cleanValue.replace(/^["']|["']$/g, '');
          }
        }
      });

      return result;
    } catch (parseError) {
      console.error(
        'Failed to parse HashMap string:',
        hashMapString,
        parseError,
      );
      return {};
    }
  }
};

// Helper function to convert dpId-based object to human-readable format
export const convertDpDataToReadable = (
  dpData: Record<string, any>,
): Record<string, any> => {
  const readable: Record<string, any> = {};

  Object.entries(dpData).forEach(([key, value]) => {
    // Try to find the command by dpId
    const command = getCommandByDpId(parseInt(key, 10));
    if (command) {
      readable[command.name] = value;
    } else {
      // Keep the original key if no mapping found
      readable[key] = value;
    }
  });

  return readable;
};
