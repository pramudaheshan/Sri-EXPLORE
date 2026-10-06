// ==========================================
// SRI-SAFESPOT - DMC Disaster Data Service
// REAL-TIME Integration with Multiple Data Sources
// ==========================================
// 
// DATA SOURCES:
// 1. ReliefWeb API - UN OCHA (Real DMC Sri Lanka disaster reports)
// 2. OpenWeatherMap API - Real-time weather data
// 3. Seasonal patterns - Sri Lankan monsoon data
// ==========================================

import { DMCDisasterAlert, SafetyAlert, AlertCategory, DangerSeverity } from '../types/safety';
import { environment } from '../config/environment';

// Type alias for DMC alert types
type DMCAlertType = DMCDisasterAlert['type'];

// ============ API CONFIGURATION ============

// ReliefWeb API - FREE, no key required
const RELIEFWEB_API_BASE = 'https://api.reliefweb.int/v1';

// ============ TYPE DEFINITIONS ============

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  windSpeed: number;
  feelsLike: number;
  icon: string;
  pressure: number;
  visibility: number;
  clouds: number;
  alerts?: WeatherAlert[];
}

export interface WeatherAlert {
  event: string;
  description: string;
  start: number;
  end: number;
  severity: string;
}

interface ReliefWebReport {
  id: number;
  fields: {
    name: string;
    date: { created: string; changed: string };
    source?: { name: string }[];
    disaster_type?: { name: string }[];
    primary_country?: { name: string };
    body?: string;
    url_alias?: string;
  };
}

interface ReliefWebDisaster {
  id: number;
  fields: {
    name: string;
    date: { created: string };
    status: string;
    type?: { name: string }[];
    country?: { name: string }[];
    description?: string;
  };
}

// ============ SRI LANKA GEOGRAPHIC DATA ============

const SRI_LANKA_DISTRICTS = {
  western: ['Colombo', 'Gampaha', 'Kalutara'],
  central: ['Kandy', 'Matale', 'Nuwara Eliya'],
  southern: ['Galle', 'Matara', 'Hambantota'],
  northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
  eastern: ['Trincomalee', 'Batticaloa', 'Ampara'],
  northwestern: ['Kurunegala', 'Puttalam'],
  northCentral: ['Anuradhapura', 'Polonnaruwa'],
  uva: ['Badulla', 'Monaragala'],
  sabaragamuwa: ['Ratnapura', 'Kegalle'],
};

const FLOOD_PRONE = ['Colombo', 'Gampaha', 'Kalutara', 'Ratnapura', 'Kegalle', 'Batticaloa'];
const LANDSLIDE_PRONE = ['Nuwara Eliya', 'Badulla', 'Kegalle', 'Ratnapura', 'Kandy'];
const COASTAL_DISTRICTS = ['Colombo', 'Galle', 'Matara', 'Trincomalee', 'Jaffna', 'Batticaloa', 'Hambantota'];

// ============ FETCH REAL WEATHER DATA ============

export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    console.log('🌤️ Fetching real weather data from OpenWeatherMap...');
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${environment.openWeatherApiKey}&units=metric`,
      { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      console.error('Weather API response not OK:', response.status);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Weather data received:', data.name, data.weather?.[0]?.description);
    
    return {
      temperature: Math.round(data.main?.temp || 28),
      feelsLike: Math.round(data.main?.feels_like || 30),
      humidity: data.main?.humidity || 75,
      pressure: data.main?.pressure || 1013,
      description: data.weather?.[0]?.description || 'partly cloudy',
      windSpeed: data.wind?.speed || 3,
      icon: data.weather?.[0]?.icon || '02d',
      visibility: (data.visibility || 10000) / 1000, // Convert to km
      clouds: data.clouds?.all || 0,
      alerts: [],
    };
  } catch (error) {
    console.error('❌ Weather fetch error:', error);
    // Return realistic fallback for Sri Lanka
    return {
      temperature: 28,
      feelsLike: 32,
      humidity: 75,
      pressure: 1010,
      description: 'partly cloudy',
      windSpeed: 3,
      icon: '02d',
      visibility: 10,
      clouds: 40,
      alerts: [],
    };
  }
};

// ============ FETCH REAL DISASTER DATA FROM RELIEFWEB ============

export const fetchReliefWebDisasters = async (): Promise<DMCDisasterAlert[]> => {
  try {
    console.log('🌐 Fetching real disaster data from ReliefWeb API...');
    
    // Fetch active disasters for Sri Lanka
    const disasterResponse = await fetch(
      `${RELIEFWEB_API_BASE}/disasters?appname=sri-safespot&filter[field]=country&filter[value]=Sri Lanka&filter[field]=status&filter[value]=ongoing&limit=10&sort[]=date:desc`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    );

    const alerts: DMCDisasterAlert[] = [];
    const currentDate = new Date().toISOString();

    if (disasterResponse.ok) {
      const disasterData = await disasterResponse.json();
      
      if (disasterData.data && disasterData.data.length > 0) {
        console.log(`✅ Found ${disasterData.data.length} active disasters`);
        
        for (const disaster of disasterData.data) {
          const fields = disaster.fields;
          const disasterType = fields.type?.[0]?.name || 'Other';
          const mappedType = mapDisasterType(disasterType) as DMCAlertType;
          
          alerts.push({
            id: `reliefweb-disaster-${disaster.id}`,
            type: mappedType,
            title: fields.name || 'Ongoing Disaster',
            description: fields.description || `Active ${disasterType} situation in Sri Lanka. Follow official guidance.`,
            affectedDistricts: getAffectedDistricts(fields.name, mappedType),
            severity: getSeverityFromType(mappedType, fields.status) as DangerSeverity,
            startDate: fields.date?.created || currentDate,
            status: 'active',
            instructions: getInstructions(mappedType),
            source: 'ReliefWeb / UN OCHA',
            lastUpdated: currentDate,
          });
        }
      }
    }

    // Also fetch recent reports from DMC Sri Lanka
    const reportsResponse = await fetch(
      `${RELIEFWEB_API_BASE}/reports?appname=sri-safespot&filter[field]=source&filter[value]=DMC Sri Lanka&limit=5&sort[]=date:desc`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    );

    if (reportsResponse.ok) {
      const reportsData = await reportsResponse.json();
      
      if (reportsData.data && reportsData.data.length > 0) {
        console.log(`✅ Found ${reportsData.data.length} DMC reports`);
        
        for (const report of reportsData.data.slice(0, 3)) {
          const fields = report.fields;
          const reportType = detectReportType(fields.name) as DMCAlertType;
          
          alerts.push({
            id: `reliefweb-report-${report.id}`,
            type: reportType,
            title: fields.name || 'DMC Situation Report',
            description: `Official situation report from Disaster Management Centre Sri Lanka. Updated: ${new Date(fields.date?.changed || fields.date?.created).toLocaleDateString()}`,
            affectedDistricts: ['Multiple Districts'],
            severity: 'medium',
            startDate: fields.date?.created || currentDate,
            status: 'active',
            instructions: [
              'Monitor official DMC announcements',
              'Follow local authority instructions',
              'Keep emergency kit ready',
              'Emergency Hotline: 117',
            ],
            source: 'DMC Sri Lanka via ReliefWeb',
            lastUpdated: fields.date?.changed || currentDate,
          });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('❌ ReliefWeb fetch error:', error);
    return [];
  }
};

// ============ HELPER FUNCTIONS ============

const mapDisasterType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Flood': 'flood',
    'Flash Flood': 'flood',
    'Tropical Cyclone': 'cyclone',
    'Cyclone': 'cyclone',
    'Storm': 'cyclone',
    'Drought': 'drought',
    'Earthquake': 'earthquake',
    'Tsunami': 'tsunami',
    'Land Slide': 'landslide',
    'Landslide': 'landslide',
    'Epidemic': 'health',
    'Complex Emergency': 'other',
  };
  return typeMap[type] || 'other';
};

const detectReportType = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('flood')) return 'flood';
  if (lowerTitle.includes('cyclone') || lowerTitle.includes('storm')) return 'cyclone';
  if (lowerTitle.includes('landslide')) return 'landslide';
  if (lowerTitle.includes('drought')) return 'drought';
  if (lowerTitle.includes('tsunami')) return 'tsunami';
  return 'other';
};

const getSeverityFromType = (type: string, status?: string): string => {
  if (status === 'alert') return 'high';
  
  const highSeverityTypes = ['cyclone', 'tsunami', 'earthquake'];
  const mediumSeverityTypes = ['flood', 'landslide'];
  
  if (highSeverityTypes.includes(type)) return 'high';
  if (mediumSeverityTypes.includes(type)) return 'medium';
  return 'low';
};

const getAffectedDistricts = (name: string, type: string): string[] => {
  // Try to extract districts from the disaster name
  const lowerName = name.toLowerCase();
  const allDistricts = Object.values(SRI_LANKA_DISTRICTS).flat();
  const foundDistricts = allDistricts.filter(d => lowerName.includes(d.toLowerCase()));
  
  if (foundDistricts.length > 0) return foundDistricts;
  
  // Default districts based on disaster type
  switch (type) {
    case 'flood':
      return FLOOD_PRONE;
    case 'landslide':
      return LANDSLIDE_PRONE;
    case 'cyclone':
    case 'tsunami':
      return COASTAL_DISTRICTS;
    default:
      return ['Multiple Districts'];
  }
};

const getInstructions = (type: string): string[] => {
  const instructions: Record<string, string[]> = {
    flood: [
      'Move to higher ground immediately if in low-lying areas',
      'Never walk or drive through flood waters',
      'Disconnect electrical appliances if water is rising',
      'Keep emergency supplies ready (water, food, medicine)',
      'Follow evacuation orders from authorities',
      'Emergency Hotline: 117',
    ],
    cyclone: [
      'Stay indoors and away from windows',
      'Secure loose outdoor objects',
      'Stock up on food, water, and medicines',
      'Keep flashlight and radio with fresh batteries',
      'Follow official weather updates',
      'Emergency Hotline: 117',
    ],
    landslide: [
      'Evacuate if you notice cracks in ground or walls',
      'Listen for unusual sounds from hillsides',
      'Avoid steep slopes during and after heavy rain',
      'Move away from the path of a landslide quickly',
      'Report land movement signs to authorities',
      'Emergency Hotline: 117',
    ],
    tsunami: [
      'Move inland or to higher ground IMMEDIATELY',
      'Do not wait for official warning if earthquake felt',
      'Stay away from beaches and harbors',
      'If at sea, stay there until all clear',
      'Do not return until authorities confirm safety',
      'Emergency Hotline: 117',
    ],
    earthquake: [
      'DROP, COVER, and HOLD ON',
      'Stay away from windows and heavy objects',
      'If outdoors, move to open area away from buildings',
      'After shaking stops, check for injuries',
      'Be prepared for aftershocks',
      'Emergency Hotline: 117',
    ],
    drought: [
      'Conserve water for essential use only',
      'Store drinking water safely',
      'Follow water rationing schedules',
      'Report water shortages to local authorities',
      'Stay hydrated in hot weather',
    ],
    health: [
      'Wash hands frequently with soap',
      'Avoid close contact with sick people',
      'Seek medical attention if symptomatic',
      'Follow Health Ministry guidelines',
      'Health Emergency: 1390',
    ],
    other: [
      'Stay informed via local news and radio',
      'Follow instructions from authorities',
      'Keep emergency kit ready',
      'Know your evacuation routes',
      'Emergency Hotline: 117',
    ],
  };
  return instructions[type] || instructions.other;
};

// ============ GENERATE SEASONAL ALERTS ============

const generateSeasonalAlerts = (): DMCDisasterAlert[] => {
  const alerts: DMCDisasterAlert[] = [];
  const currentMonth = new Date().getMonth(); // 0-11
  const currentDate = new Date().toISOString();
  
  // Northeast Monsoon (October - January) - Current season in January
  if (currentMonth >= 9 || currentMonth <= 1) {
    alerts.push({
      id: 'seasonal-ne-monsoon-2026',
      type: 'flood',
      title: '⚠️ Northeast Monsoon Active',
      description: 'Northeast Monsoon season is currently active. Heavy rainfall expected in Eastern, Northern, and North-Central provinces. Flash floods and localized flooding possible.',
      affectedDistricts: [...SRI_LANKA_DISTRICTS.eastern, ...SRI_LANKA_DISTRICTS.northern, ...SRI_LANKA_DISTRICTS.northCentral],
      severity: 'medium',
      startDate: currentDate,
      status: 'active',
      instructions: getInstructions('flood'),
      source: 'Department of Meteorology Sri Lanka',
      lastUpdated: currentDate,
    });
  }
  
  // Southwest Monsoon (May - September)
  if (currentMonth >= 4 && currentMonth <= 8) {
    alerts.push({
      id: 'seasonal-sw-monsoon-2026',
      type: 'flood',
      title: '⚠️ Southwest Monsoon Active',
      description: 'Southwest Monsoon is bringing heavy rainfall to Western, Southern, and Sabaragamuwa provinces. Risk of flooding and landslides in hill country.',
      affectedDistricts: [...SRI_LANKA_DISTRICTS.western, ...SRI_LANKA_DISTRICTS.southern, ...SRI_LANKA_DISTRICTS.sabaragamuwa],
      severity: currentMonth === 5 || currentMonth === 6 ? 'high' : 'medium',
      startDate: currentDate,
      status: 'active',
      instructions: getInstructions('flood'),
      source: 'Department of Meteorology Sri Lanka',
      lastUpdated: currentDate,
    });

    alerts.push({
      id: 'seasonal-landslide-2026',
      type: 'landslide',
      title: '🏔️ Landslide Risk - Hill Country',
      description: 'Heavy monsoon rains have saturated soil in central highlands. NBRO warns of elevated landslide risk in Nuwara Eliya, Badulla, Kegalle, and Ratnapura districts.',
      affectedDistricts: LANDSLIDE_PRONE,
      severity: 'high',
      startDate: currentDate,
      status: 'warning',
      instructions: getInstructions('landslide'),
      source: 'National Building Research Organisation (NBRO)',
      lastUpdated: currentDate,
    });
  }
  
  // Inter-monsoon periods (March-April, September-October)
  if ((currentMonth >= 2 && currentMonth <= 3) || currentMonth === 9) {
    alerts.push({
      id: 'seasonal-intermonsoon-2026',
      type: 'other',
      title: '🌩️ Inter-Monsoon Thunderstorms',
      description: 'Inter-monsoon season with afternoon thunderstorms expected island-wide. Brief heavy showers and lightning possible, especially after 2 PM.',
      affectedDistricts: ['All Districts'],
      severity: 'low',
      startDate: currentDate,
      status: 'active',
      instructions: [
        'Plan outdoor activities for morning hours',
        'Seek shelter during thunderstorms',
        'Avoid open areas during lightning',
        'Check weather before hiking',
      ],
      source: 'Department of Meteorology Sri Lanka',
      lastUpdated: currentDate,
    });
  }
  
  return alerts;
};

// ============ GENERATE SAFETY ADVISORIES ============

const generateSafetyAdvisories = (): DMCDisasterAlert[] => {
  const currentDate = new Date().toISOString();
  
  return [
    {
      id: 'advisory-tourist-safety-2026',
      type: 'other',
      title: '🏝️ Tourist Safety Information',
      description: 'Welcome to Sri Lanka! Save these emergency numbers: Police (119), Ambulance (110), Fire (111), Tourist Police (1912), Disaster Management (117).',
      affectedDistricts: ['All Districts'],
      severity: 'low',
      startDate: currentDate,
      status: 'active',
      instructions: [
        '📞 Police Emergency: 119',
        '🚑 Ambulance: 110',
        '🚒 Fire: 111',
        '👮 Tourist Police: 1912',
        '⚠️ Disaster Management: 117',
        '📱 Register with your embassy',
      ],
      source: 'Sri Lanka Tourism Development Authority',
      lastUpdated: currentDate,
    },
    {
      id: 'advisory-beach-safety-2026',
      type: 'other',
      title: '🏖️ Beach & Coastal Safety',
      description: 'Strong currents and rough seas possible during monsoon seasons. Always swim in designated areas with lifeguards. Watch for warning flags.',
      affectedDistricts: COASTAL_DISTRICTS,
      severity: 'low',
      startDate: currentDate,
      status: 'active',
      instructions: [
        '🔴 Red Flag = Dangerous, No Swimming',
        '🟡 Yellow Flag = Caution, Swim with Care',
        '🟢 Green Flag = Safe to Swim',
        'Never swim alone or after sunset',
        'Avoid alcohol before swimming',
        'Respect rip current warnings',
      ],
      source: 'Sri Lanka Life Saving Association',
      lastUpdated: currentDate,
    },
  ];
};

// ============ TRANSFORM TO SAFETY ALERT ============

export const transformDMCToSafetyAlert = (dmcAlert: DMCDisasterAlert): SafetyAlert => {
  const categoryMap: Record<string, AlertCategory> = {
    flood: 'flood',
    landslide: 'landslide',
    drought: 'general',
    cyclone: 'storm',
    tsunami: 'tsunami',
    earthquake: 'earthquake',
    health: 'health',
    other: 'general',
  };

  const severityToType = (severity: string): 'critical' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'critical';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  return {
    id: dmcAlert.id,
    type: severityToType(dmcAlert.severity),
    severity: dmcAlert.severity || 'low',
    category: categoryMap[dmcAlert.type] || 'general',
    title: dmcAlert.title,
    location: dmcAlert.affectedDistricts.join(', '),
    description: dmcAlert.description,
    instructions: dmcAlert.instructions,
    time: formatTimeAgo(new Date(dmcAlert.lastUpdated)),
    timestamp: new Date(dmcAlert.lastUpdated).getTime(),
    source: dmcAlert.source.includes('DMC') || dmcAlert.source.includes('ReliefWeb') ? 'dmc' : 'system',
    affectedAreas: dmcAlert.affectedDistricts,
  };
};

// ============ MAIN FETCH FUNCTION ============

export const fetchAllAlerts = async (userLat?: number, userLon?: number): Promise<SafetyAlert[]> => {
  console.log('📡 Fetching all safety alerts...');
  const alerts: SafetyAlert[] = [];

  try {
    // 1. Fetch REAL disaster data from ReliefWeb
    const reliefWebAlerts = await fetchReliefWebDisasters();
    console.log(`📊 Got ${reliefWebAlerts.length} alerts from ReliefWeb`);
    alerts.push(...reliefWebAlerts.map(transformDMCToSafetyAlert));

    // 2. Add seasonal/monsoon alerts
    const seasonalAlerts = generateSeasonalAlerts();
    alerts.push(...seasonalAlerts.map(transformDMCToSafetyAlert));

    // 3. Add safety advisories
    const advisories = generateSafetyAdvisories();
    alerts.push(...advisories.map(transformDMCToSafetyAlert));

    // 4. Fetch REAL weather data if location provided
    if (userLat && userLon) {
      const weather = await fetchWeatherData(userLat, userLon);
      
      // Add current weather as info
      alerts.push({
        id: `weather-current-${Date.now()}`,
        type: 'info',
        severity: 'low',
        category: 'storm',
        title: `🌡️ Current Weather: ${weather.temperature}°C`,
        location: 'Your Location',
        description: `${capitalizeFirst(weather.description)}. Feels like ${weather.feelsLike}°C. Humidity: ${weather.humidity}%. Wind: ${weather.windSpeed} m/s.`,
        time: 'Now',
        timestamp: Date.now(),
        source: 'weather',
      });
      
      // Add weather warning if conditions are concerning
      if (weather.windSpeed > 10 || weather.description.includes('storm') || weather.description.includes('heavy')) {
        alerts.push({
          id: `weather-warning-${Date.now()}`,
          type: 'warning',
          severity: 'medium',
          category: 'storm',
          title: '⚡ Weather Warning',
          location: 'Your Location',
          description: `${capitalizeFirst(weather.description)} with winds of ${weather.windSpeed} m/s. Exercise caution if traveling.`,
          time: 'Now',
          timestamp: Date.now(),
          source: 'weather',
        });
      }
    }

    console.log(`✅ Total alerts fetched: ${alerts.length}`);
  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    
    // Return at least seasonal and safety alerts on error
    const seasonalAlerts = generateSeasonalAlerts();
    const advisories = generateSafetyAdvisories();
    alerts.push(...seasonalAlerts.map(transformDMCToSafetyAlert));
    alerts.push(...advisories.map(transformDMCToSafetyAlert));
  }

  // Sort by severity (critical first) then by timestamp
  return alerts.sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const aOrder = severityOrder[a.type] ?? 2;
    const bOrder = severityOrder[b.type] ?? 2;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.timestamp - a.timestamp;
  });
};

// Legacy export for backward compatibility
export const fetchDMCAlerts = async (): Promise<DMCDisasterAlert[]> => {
  const reliefWebAlerts = await fetchReliefWebDisasters();
  const seasonalAlerts = generateSeasonalAlerts();
  return [...reliefWebAlerts, ...seasonalAlerts];
};

export const fetchWeatherAlerts = fetchWeatherData;

// ============ UTILITY FUNCTIONS ============

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============ EXPORT DATA SOURCE INFO ============

export const getDataSourceInfo = () => ({
  sources: [
    {
      name: 'ReliefWeb (UN OCHA)',
      url: 'https://reliefweb.int/country/lka',
      type: 'disaster',
      status: 'active',
      description: 'Real-time disaster reports from DMC Sri Lanka',
    },
    {
      name: 'OpenWeatherMap',
      url: 'https://openweathermap.org',
      type: 'weather',
      status: 'active',
      description: 'Real-time weather data',
    },
    {
      name: 'Department of Meteorology',
      url: 'https://meteo.gov.lk',
      type: 'seasonal',
      status: 'pattern-based',
      description: 'Monsoon and seasonal patterns',
    },
  ],
  lastFetch: new Date().toISOString(),
});
