import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type StockChartPeriod = '1D' | '5D' | '1M' | '3M' | 'YTD' | '1Y';

interface StockChartPeriodSelectorProps {
  selectedPeriod: StockChartPeriod;
  onPeriodChange: (period: StockChartPeriod) => void;
  availablePeriods?: StockChartPeriod[];
}

const PERIOD_LABELS: Record<StockChartPeriod, string> = {
  '1D': '1天',
  '5D': '5天',
  '1M': '1月',
  '3M': '3月',
  'YTD': '年初',
  '1Y': '1年',
};

const StockChartPeriodSelector: React.FC<StockChartPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  availablePeriods = ['1D', '5D', '1M', '3M', 'YTD', '1Y']
}) => {
  return (
    <View style={styles.container}>
      {availablePeriods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text style={[
            styles.periodText,
            selectedPeriod === period && styles.selectedPeriodText
          ]}>
            {PERIOD_LABELS[period]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    minWidth: 50,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#007AFF',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedPeriodText: {
    color: 'white',
  },
});

export default StockChartPeriodSelector;
