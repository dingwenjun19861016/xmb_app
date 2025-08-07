import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InfoCardProps {
  label: string;
  value: string;
  subvalue?: string;
}

const InfoCard = ({ label, value, subvalue }: InfoCardProps) => {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue}>{value}</Text>
      {subvalue && <Text style={styles.infoCardSubvalue}>{subvalue}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoCardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoCardSubvalue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default InfoCard;
