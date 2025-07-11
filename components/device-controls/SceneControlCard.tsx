import React, {memo, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import {
  TUYA_DEVICE_COMMANDS,
  SCENE_PRESETS,
} from '../../utils/TuyaDeviceCommandMappings';

interface SceneControlCardProps {
  isOnline: boolean;
  onSceneChange: (scene: {scene_num: number}) => void;
}

const SceneControlCard: React.FC<SceneControlCardProps> = memo(
  ({isOnline, onSceneChange}) => {
    const command = TUYA_DEVICE_COMMANDS.scene_data_v2;
    const [showScenePicker, setShowScenePicker] = useState(false);

    const handleScenePress = useCallback(() => {
      setShowScenePicker(true);
    }, []);

    const handleSceneSelect = useCallback(
      (scene: {scene_num: number}) => {
        onSceneChange(scene);
        setShowScenePicker(false);
      },
      [onSceneChange],
    );

    const handleModalClose = useCallback(() => {
      setShowScenePicker(false);
    }, []);

    return (
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>{command.name}</Text>
        <TouchableOpacity
          style={styles.scenePickerButton}
          onPress={handleScenePress}
          disabled={!isOnline}>
          <Text style={styles.scenePickerButtonText}>Select Scene</Text>
        </TouchableOpacity>

        <Modal
          visible={showScenePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={handleModalClose}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Scene</Text>
              <View style={styles.sceneGrid}>
                {SCENE_PRESETS.map((scene, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.scenePreset}
                    onPress={() => handleSceneSelect(scene)}>
                    <Text style={styles.scenePresetText}>{scene.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleModalClose}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  controlSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  scenePickerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scenePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  sceneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  scenePreset: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  scenePresetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

SceneControlCard.displayName = 'SceneControlCard';

export default SceneControlCard;
