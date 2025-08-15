import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommonSearchBarProps {
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  onClear?: () => void;
  style?: any;
  containerStyle?: any;
  inputStyle?: any;
  placeholderTextColor?: string;
  showClearButton?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  returnKeyType?: 'search' | 'done' | 'go' | 'next' | 'send' | 'default';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * 通用搜索栏组件
 * 从 MarketScreen 提取出来，保证与 MarketScreen 完全一致的行为
 */
const CommonSearchBar = React.memo(
  React.forwardRef<TextInput, CommonSearchBarProps>(({
    placeholder = '搜索...',
    value,
    onValueChange,
    onClear,
    style,
    containerStyle,
    inputStyle,
    placeholderTextColor = '#999',
    showClearButton = true,
    disabled = false,
    autoFocus = false,
    returnKeyType = 'search',
    onSubmitEditing,
    blurOnSubmit = false,
    onFocus,
    onBlur,
  }, ref) => {
    const inputRef = useRef<TextInput>(null);

    // 将内部ref与外部ref关联
    React.useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus?.(),
      blur: () => inputRef.current?.blur?.(),
      clear: () => inputRef.current?.clear?.(),
    }) as any);

    // 处理文本输入变化
    const handleTextChange = useCallback((text: string) => {
      onValueChange(text);
    }, [onValueChange]);

    // 处理清除按钮点击
    const handleClear = useCallback(() => {
      onValueChange('');
      onClear?.();
      inputRef.current?.focus();
    }, [onValueChange, onClear]);

    // 处理提交编辑
    const handleSubmitEditing = useCallback(() => {
      onSubmitEditing?.();
    }, [onSubmitEditing]);

    const handleFocus = useCallback(() => {
      if (__DEV__) console.log('🟢 CommonSearchBar: onFocus');
      onFocus?.();
    }, [onFocus]);

    const handleBlur = useCallback(() => {
      if (__DEV__) console.log('🟡 CommonSearchBar: onBlur');
      onBlur?.();
    }, [onBlur]);

    return (
      <View style={[styles.searchContainer, containerStyle, style]}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, inputStyle]}
          placeholder={placeholder}
          value={value}
          onChangeText={handleTextChange}
          placeholderTextColor={placeholderTextColor}
          editable={!disabled}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showClearButton && value !== '' && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
  })
);

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 8,
  },
});

CommonSearchBar.displayName = 'CommonSearchBar';

export default CommonSearchBar;
