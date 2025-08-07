import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface SvgCaptchaProps {
  svgString: string;
  onRefresh: () => void;
  width?: number;
  height?: number;
}

const SvgCaptcha: React.FC<SvgCaptchaProps> = ({ 
  svgString, 
  onRefresh, 
  width = 120, 
  height = 40 
}) => {
  if (!svgString) {
    return (
      <TouchableOpacity style={[styles.placeholder, { width, height }]} onPress={onRefresh}>
        <Text style={styles.placeholderText}>点击获取验证码</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onRefresh}>
      <SvgXml 
        xml={svgString} 
        width={width} 
        height={height}
        style={styles.svg}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  svg: {
    backgroundColor: '#fff',
  },
  placeholder: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default SvgCaptcha;
