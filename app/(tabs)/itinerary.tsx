
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  RadioButton,
  Chip,
  Switch,
  Divider,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import ItineraryHub from '../../components/itinerary/ItineraryHub';
import ItineraryChat from '../../components/itinerary/ItineraryChat';

type FamilyMember = { role: string; age: string };
type Friend = { age: string; gender: string };

export default function TripPreferencesScreen() {
  const [startDate, setStartDate] = useState('2025-07-01');
  const [duration, setDuration] = useState(3);
  const [group, setGroup] = useState('Couple');
  const [budget, setBudget] = useState(10000);
  const [selectedInterests, setSelectedInterests] = useState([
    'Culture',
    'Food',
  ]);
  const [transport, setTransport] = useState('Mixed');

  const [soloData, setSoloData] = useState({ gender: '', age: '' });
  const [coupleAges, setCoupleAges] = useState({ person1: '', person2: '' });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { role: '', age: '' },
  ]);
  const [friends, setFriends] = useState<Friend[]>([{ age: '', gender: '' }]);

  const [view, setView] = useState<'chat' | 'result' | 'modify'>('chat');
  const [itineraryResult, setItineraryResult] = useState<any>(null);
  const [tripCity, setTripCity] = useState<string>('');
  const [tripDuration, setTripDuration] = useState<number>(3);

  const router = useRouter();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const updateFamily = (
    i: number,
    field: keyof FamilyMember,
    value: string,
  ) => {
    const updated = [...familyMembers];
    updated[i][field] = value;
    setFamilyMembers(updated);
  };

  const updateFriend = (i: number, field: keyof Friend, value: string) => {
    const updated = [...friends];
    updated[i][field] = value;
    setFriends(updated);
  };

  const submitForm = () => {
    console.log({
      startDate,
      duration,
      group,
      budget,
      selectedInterests,
      transport,
      soloData,
      coupleAges,
      familyMembers,
      friends,
    });

    setView('result');
  };

  if (view === 'result' && itineraryResult) {
    return (
      <ItineraryHub
        title="Your Smart Itinerary"
        startDate={startDate}
        duration={tripDuration}
        onEdit={() => setView('chat')}
        onRegenerate={() => setView('chat')}
        //onViewMap={() => router.push('/map')}
        itinerary={itineraryResult}
        city={tripCity}
        onViewMap={undefined}
      />
    );
  }



  return (
    <ItineraryChat
      onResult={(itinerary: any, city: string, days: number) => {
        setItineraryResult(itinerary);
        setTripCity(city);
        setTripDuration(days);
        setView('result');
      }}
      onBack={() => router.back()}
    />
  );
}
