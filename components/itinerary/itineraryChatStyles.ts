// StyleSheet for ItineraryChat
import { StyleSheet, Platform } from 'react-native';

const DARK_BG = '#181C1F';
const BUBBLE_USER = '#20B2AA';
const BUBBLE_BOT = '#23282C';
const INPUT_BG = '#23282C';
const BORDER = '#22282C';
const CHIP_BG = '#263238';

export const itineraryChatStyles = StyleSheet.create({
  introContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  introTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  introSubtitle: {
    color: '#b8c4c2',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  introButton: {
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 8,
    alignSelf: 'center',
    elevation: 2,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  userBubble: {
    backgroundColor: BUBBLE_USER,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  botBubble: {
    backgroundColor: BUBBLE_BOT,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  inputBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#181C1F',
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  inputBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  chip: {
    margin: 4,
    backgroundColor: CHIP_BG,
    borderRadius: 16,
    borderWidth: 0,
  },
  nextButton: {
    marginLeft: 8,
    marginTop: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
    minWidth: 90,
    elevation: 2,
  },
  buttonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionButton: {
    margin: 4,
    borderRadius: 8,
    minWidth: 90,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 44,
  },
  sendButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    elevation: 2,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 10,
    paddingHorizontal: 18,
    backgroundColor: DARK_BG,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#b8c4c2',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
    marginTop: 2,
  },
  backButton: {
    marginRight: 8,
  },
  resetButton: {
    marginLeft: 'auto',
  },
});
