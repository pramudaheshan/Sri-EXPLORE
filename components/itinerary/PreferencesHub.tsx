import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { TextInput, RadioButton, Chip, Button } from 'react-native-paper';
import { Calendar, Clock } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const TEAL = '#20B2AA';

const COLORS = {
  teal: TEAL,
  offWhite: '#F0F4F3',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  glassLight: 'rgba(255,255,255,0.05)',
  gray: '#B8C4C2',
  darkText: '#12322f',
};

export default function PreferencesHub({
  initial = {},
  onSubmit,
  onOpenModify,
}: {
  initial?: any;
  onSubmit?: (values: any) => void;
  onOpenModify?: () => void;
}) {
  const [startDate, setStartDate] = useState(initial.startDate || '2025-07-01');
  const [duration, setDuration] = useState(initial.duration || 3);
  const [group, setGroup] = useState(initial.group || 'Couple');
  const [budget, setBudget] = useState(initial.budget || 10000);
  const [interests, setInterests] = useState<string[]>(
    initial.interests || ['Culture', 'Food'],
  );
  const [transport, setTransport] = useState(initial.transport || 'Mixed');

  // additional fields for detailed edit
  const [soloData, setSoloData] = useState<{ gender: string; age: string }>(
    initial.soloData || { gender: '', age: '' },
  );
  const [coupleAges, setCoupleAges] = useState<{
    person1: string;
    person2: string;
  }>(initial.coupleAges || { person1: '', person2: '' });
  const [familyMembers, setFamilyMembers] = useState<any[]>(
    initial.familyMembers || [{ role: '', age: '' }],
  );
  const [friends, setFriends] = useState<any[]>(
    initial.friends || [{ age: '', gender: '' }],
  );

  const [editMode, setEditMode] = useState(false);

  const toggleInterest = (t: string) =>
    setInterests((prev) =>
      prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t],
    );

  const handleGenerate = () => {
    const vals = { startDate, duration, group, budget, interests, transport };
    if (onSubmit) onSubmit(vals);
  };

  const resetToInitial = () => {
    setStartDate(initial.startDate || '2025-07-01');
    setDuration(initial.duration || 3);
    setGroup(initial.group || 'Couple');
    setBudget(initial.budget || 10000);
    setInterests(initial.interests || ['Culture', 'Food']);
    setTransport(initial.transport || 'Mixed');
    setSoloData(initial.soloData || { gender: '', age: '' });
    setCoupleAges(initial.coupleAges || { person1: '', person2: '' });
    setFamilyMembers(initial.familyMembers || [{ role: '', age: '' }]);
    setFriends(initial.friends || [{ age: '', gender: '' }]);
    setEditMode(false);
  };

  const handleSave = () => {
    const vals = {
      startDate,
      duration,
      group,
      budget,
      interests,
      transport,
      soloData,
      coupleAges,
      familyMembers,
      friends,
    };
    if (onSubmit) onSubmit(vals);
    setEditMode(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient
        colors={['#062f2b', '#0d1a1a']}
        style={styles.backgroundGradient}
      />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Trip Preferences</Text>
          <Text style={styles.subtitle}>
            Fine‑tune your travel plan for better results
          </Text>
        </View>
      </View>

      <BlurView intensity={40} tint="light" style={styles.card}>
        <LinearGradient
          colors={[`${TEAL}14`, 'transparent']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.rowTop}>
          <Calendar size={18} color={TEAL} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.overTitle}>Start Date</Text>
            <Text style={styles.overValue}>{startDate}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Clock size={18} color={TEAL} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.overTitle}>Duration</Text>
            <Text style={styles.overValue}>{duration} days</Text>
          </View>
        </View>

        {/* top-right inline edit control */}
        <View style={styles.topRight}>
          {!editMode ? (
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              style={styles.editButton}
              accessibilityRole="button"
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Start Date</Text>
        <TextInput
          mode="outlined"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          theme={{
            colors: {
              text: COLORS.offWhite,
              placeholder: 'rgba(255,255,255,0.6)',
              primary: COLORS.teal,
              background: '#141414',
            },
          }}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Duration</Text>
        <Slider
          minimumValue={1}
          maximumValue={14}
          step={1}
          value={duration}
          onValueChange={setDuration}
          minimumTrackTintColor={TEAL}
          thumbTintColor={TEAL}
        />

        <Text style={styles.label}>Travel Group</Text>
        <RadioButton.Group onValueChange={setGroup} value={group}>
          <View style={styles.radioRow}>
            {['Solo', 'Couple', 'Family', 'Friends'].map((g) => (
              <RadioButton.Item
                key={g}
                label={g}
                value={g}
                color={TEAL}
                labelStyle={{ color: COLORS.offWhite }}
              />
            ))}
          </View>
        </RadioButton.Group>

        {/* detailed fields shown when editing */}
        {editMode && group === 'Solo' && (
          <>
            <Text style={styles.label}>Your Gender</Text>
            <RadioButton.Group
              onValueChange={(val) => setSoloData({ ...soloData, gender: val })}
              value={soloData.gender}
            >
              {['Male', 'Female', 'Other'].map((g) => (
                <RadioButton.Item key={g} label={g} value={g} color={TEAL} />
              ))}
            </RadioButton.Group>

            <TextInput
              label="Your Age"
              value={soloData.age}
              keyboardType="numeric"
              onChangeText={(val) => setSoloData({ ...soloData, age: val })}
              style={[styles.input, { marginTop: 8 }]}
              mode="outlined"
              theme={{
                colors: {
                  text: COLORS.offWhite,
                  placeholder: 'rgba(255,255,255,0.6)',
                  primary: COLORS.teal,
                  background: '#141414',
                },
              }}
            />
          </>
        )}

        {editMode && group === 'Couple' && (
          <>
            <Text style={styles.label}>Ages</Text>
            <TextInput
              label="Age of Person 1"
              value={coupleAges.person1}
              keyboardType="numeric"
              onChangeText={(val) =>
                setCoupleAges({ ...coupleAges, person1: val })
              }
              style={styles.input}
              mode="outlined"
              theme={{
                colors: {
                  text: COLORS.offWhite,
                  placeholder: 'rgba(255,255,255,0.6)',
                  primary: COLORS.teal,
                  background: '#141414',
                },
              }}
            />
            <TextInput
              label="Age of Person 2"
              value={coupleAges.person2}
              keyboardType="numeric"
              onChangeText={(val) =>
                setCoupleAges({ ...coupleAges, person2: val })
              }
              style={styles.input}
              mode="outlined"
              theme={{
                colors: {
                  text: COLORS.offWhite,
                  placeholder: 'rgba(255,255,255,0.6)',
                  primary: COLORS.teal,
                  background: '#141414',
                },
              }}
            />
          </>
        )}

        {editMode && group === 'Family' && (
          <>
            <Text style={styles.label}>Who's in your family group?</Text>
            {familyMembers.map((member, index) => (
              <View key={index} style={styles.rowInputs}>
                <TextInput
                  label="Relation"
                  value={member.role}
                  onChangeText={(text) => {
                    const updated = [...familyMembers];
                    updated[index].role = text;
                    setFamilyMembers(updated);
                  }}
                  style={styles.inputHalf}
                  mode="outlined"
                  theme={{
                    colors: {
                      text: COLORS.offWhite,
                      placeholder: 'rgba(255,255,255,0.6)',
                      primary: COLORS.teal,
                      background: '#141414',
                    },
                  }}
                />
                <TextInput
                  label="Age"
                  value={member.age}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const updated = [...familyMembers];
                    updated[index].age = text;
                    setFamilyMembers(updated);
                  }}
                  style={styles.inputHalf}
                  mode="outlined"
                  theme={{
                    colors: {
                      text: COLORS.offWhite,
                      placeholder: 'rgba(255,255,255,0.6)',
                      primary: COLORS.teal,
                      background: '#141414',
                    },
                  }}
                />
              </View>
            ))}
            <Button
              onPress={() =>
                setFamilyMembers([...familyMembers, { role: '', age: '' }])
              }
              textColor={TEAL}
            >
              + Add Family Member
            </Button>
          </>
        )}

        {editMode && group === 'Friends' && (
          <>
            <Text style={styles.label}>Friend Details</Text>
            {friends.map((friend, index) => (
              <View key={index} style={styles.rowInputs}>
                <TextInput
                  label={`Friend ${index + 1} Age`}
                  value={friend.age}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const updated = [...friends];
                    updated[index].age = text;
                    setFriends(updated);
                  }}
                  style={styles.inputHalf}
                  mode="outlined"
                  theme={{
                    colors: {
                      text: COLORS.offWhite,
                      placeholder: 'rgba(255,255,255,0.6)',
                      primary: COLORS.teal,
                      background: '#141414',
                    },
                  }}
                />
                <TextInput
                  label="Gender"
                  value={friend.gender}
                  onChangeText={(text) => {
                    const updated = [...friends];
                    updated[index].gender = text;
                    setFriends(updated);
                  }}
                  style={styles.inputHalf}
                  mode="outlined"
                  theme={{
                    colors: {
                      text: COLORS.offWhite,
                      placeholder: 'rgba(255,255,255,0.6)',
                      primary: COLORS.teal,
                      background: '#141414',
                    },
                  }}
                />
              </View>
            ))}
            <Button
              onPress={() => setFriends([...friends, { age: '', gender: '' }])}
              textColor={TEAL}
            >
              + Add Friend
            </Button>
          </>
        )}

        <Text style={styles.label}>
          Daily Budget: LKR {budget.toLocaleString()}
        </Text>
        <Slider
          minimumValue={10000}
          maximumValue={300000}
          step={1000}
          value={budget}
          onValueChange={setBudget}
          minimumTrackTintColor={TEAL}
          thumbTintColor={TEAL}
        />

        <Text style={styles.label}>Interests</Text>
        <View style={styles.chipGroup}>
          {['Culture', 'Nature', 'Food', 'Relaxation', 'Adventure'].map(
            (tag) => (
              <Chip
                key={tag}
                selected={interests.includes(tag)}
                onPress={() => toggleInterest(tag)}
                style={[
                  styles.chip,
                  interests.includes(tag) && { backgroundColor: `${TEAL}20` },
                ]}
                textStyle={{
                  color: interests.includes(tag) ? '#fff' : COLORS.offWhite,
                }}
              >
                {tag}
              </Chip>
            ),
          )}
        </View>

        <Text style={styles.label}>Transport</Text>
        <RadioButton.Group onValueChange={setTransport} value={transport}>
          <View style={styles.radioRow}>
            {['Public', 'Private', 'Mixed'].map((m) => (
              <RadioButton.Item
                key={m}
                label={m}
                value={m}
                color={TEAL}
                labelStyle={{ color: COLORS.offWhite }}
              />
            ))}
          </View>
        </RadioButton.Group>

        <View style={{ height: 12 }} />
        {!editMode ? (
          <Button
            mode="contained"
            onPress={handleGenerate}
            contentStyle={{ paddingVertical: 8 }}
            style={styles.generateButton}
            labelStyle={{ fontWeight: '700' }}
          >
            Generate Itinerary
          </Button>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              mode="outlined"
              onPress={resetToInitial}
              contentStyle={{ paddingVertical: 8 }}
              style={[
                styles.generateButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: TEAL,
                },
              ]}
              labelStyle={{ color: TEAL, fontWeight: '700' }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              contentStyle={{ paddingVertical: 8 }}
              style={[styles.generateButton, { flex: 1 }]}
              labelStyle={{ fontWeight: '700' }}
            >
              Save & Regenerate
            </Button>
          </View>
        )}
      </BlurView>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#1a1a1a',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    fontWeight: '700',
  },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 18,
    backgroundColor: 'rgba(10,12,12,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  topRight: { position: 'absolute', top: 12, right: 12 },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  editButtonText: { color: COLORS.teal, fontWeight: '700' },
  overTitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  overValue: { fontSize: 14, fontWeight: '700', color: COLORS.offWhite },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    marginTop: 8,
    backgroundColor: '#141414',
    borderRadius: 8,
    color: COLORS.offWhite,
  },
  inputHalf: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 4,
    backgroundColor: '#141414',
    borderRadius: 8,
    color: COLORS.offWhite,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  radioRow: { marginTop: 6 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: {
    margin: 6,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    height: 36,
    justifyContent: 'center',
  },
  generateButton: {
    backgroundColor: COLORS.teal,
    marginTop: 14,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
});
