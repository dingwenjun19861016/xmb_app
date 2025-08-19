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
          backgroundColor: isHighlighted ? '#F8FAFE' : '#E3F2FD', // 蓝色主题骨架
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E3F2FD', // 浅蓝色骨架，与主题一致
  },
});

export default SkeletonBox;
