import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  animationDuration?: number;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animationDuration = 1500
}) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsHighlighted(prev => !prev);
    }, animationDuration);

    return () => clearInterval(interval);
  }, [animationDuration]);

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isHighlighted ? '#F5F5F5' : '#E0E0E0',
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
});

export default SkeletonBox;
