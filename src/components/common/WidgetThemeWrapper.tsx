import React from 'react';
import { View, StyleSheet } from 'react-native';

interface WidgetThemeWrapperProps {
  children: React.ReactNode;
  style?: any;
}

const WidgetThemeWrapper: React.FC<WidgetThemeWrapperProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            style: [child.props.style, styles.themeOverride]
          });
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // 浅蓝色主题样式覆盖
  themeOverride: {
    backgroundColor: '#F8FAFE', // 浅蓝色背景
  },
});

export default WidgetThemeWrapper;
