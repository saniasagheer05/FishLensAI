import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Header from '../../components/Header';
import FishCard from '../../components/FishCard';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import { FishAnalysisResult, FreshnessStatus } from '../../services/ai/types';
import { HistoryStorageService } from '../../services/storage/historyStorage';

type FilterType = 'All' | FreshnessStatus;

const FILTERS: FilterType[] = ['All', 'Fresh', 'Moderate', 'Spoiled'];

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [history, setHistory] = useState<FishAnalysisResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    const data = await HistoryStorageService.getHistory();
    setHistory(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredHistory = history.filter((item) => {
    const matchesFilter =
      activeFilter === 'All' || item.freshness.status === activeFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.species.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.species.scientificName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleCardPress = (scan: FishAnalysisResult) => {
    router.push({
      pathname: `/results/${scan.id}`,
      params: { scanData: encodeURIComponent(JSON.stringify(scan)) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        onMenuPress={() => router.push('/(tabs)/settings')}
        onAvatarPress={() => router.push('/(tabs)/settings')}
      />

      <View style={styles.container}>
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Analysis History</Text>

        {/* Search Bar (Matching Stitch) */}
        <View style={styles.searchBarContainer}>
          <Feather name="search" size={18} color="#8E9E97" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search previous scans..."
            placeholderTextColor="#9EAFA8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scan Cards List */}
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FishCard scan={item} onPress={() => handleCardPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No scans found.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  screenTitle: {
    ...Typography.h1Serif,
    fontSize: 23,
    color: '#1D2A24',
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E2D7',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1D2A24',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipInactive: {
    backgroundColor: '#FAF8F5',
    borderColor: '#E2DBD0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#65776E',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...Typography.bodyRegular,
    color: '#8E9E97',
  },
});
