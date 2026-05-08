import { View, StyleSheet, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../constants/Colors';

interface SelectProps {
  options: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export default function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  style,
}: SelectProps) {
  return (
    <View style={[styles.container, style]}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={styles.picker}
      >
        <Picker.Item label={placeholder} value="" />
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
});
