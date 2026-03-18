export type ActivityType = "ride" | "run" | "walk" | "swim" | "hike";
export type TeamRole = "owner" | "admin" | "member";
export type CompetitionMetric =
  | "distance_km"
  | "elevation_m"
  | "avg_speed"
  | "duration_hours"
  | "activities_count";

export type DashboardWidget =
  | "distance"
  | "duration"
  | "elevation"
  | "calories"
  | "activities"
  | "avgWatts"
  | "avgSpeed"
  | "avgHeartRate";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  ftpWatts?: number | null;
  weightKg?: number | null;
  stravaId?: string | null;
  dashboardWidgets: DashboardWidget[];
}

export interface Activity {
  id: string;
  userId: string;
  title: string;
  type: ActivityType;
  distanceKm: number;
  durationSeconds: number;
  elevationM?: number | null;
  avgWatts?: number | null;
  avgHeartRate?: number | null;
  avgSpeedKmh?: number | null;
  calories?: number | null;
  polyline?: string | null;
  startedAt: string;
  isManual: boolean;
  stravaId?: string | null;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  ownerId: string;
  members?: TeamMemberWithUser[];
  owner?: UserProfile;
}

export interface TeamMemberWithUser {
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user: UserProfile;
}

export interface PlannedActivity {
  id: string;
  userId: string;
  teamId?: string | null;
  title: string;
  description?: string | null;
  type: ActivityType;
  targetDistanceKm?: number | null;
  targetDurationMin?: number | null;
  targetWatts?: number | null;
  scheduledFor: string;
  isTeamShared: boolean;
  completed: boolean;
  user?: UserProfile;
  team?: Team;
}

export interface Competition {
  id: string;
  teamId: string;
  title: string;
  description?: string | null;
  metric: CompetitionMetric;
  startDate: string;
  endDate: string;
  entries?: CompetitionEntryWithUser[];
}

export interface CompetitionEntryWithUser {
  userId: string;
  value: number;
  user: UserProfile;
}

export interface DashboardStats {
  totalKm: number;
  totalHours: number;
  totalCalories: number;
  totalActivities: number;
  totalElevation: number;
  avgWatts: number;
  avgSpeed: number;
  avgHeartRate: number;
  weeklyKm: { week: string; km: number }[];
  recentActivities: Activity[];
  monthlyActivities: Activity[];
  activeCompetitions: {
    id: string;
    title: string;
    metric: string;
    endDate: string;
    entries: { userId: string; value: number; user: { id: string; name: string } }[];
  }[];
  yoy: {
    km: number | null;
    hours: number | null;
    activities: number | null;
    elevation: number | null;
    calories: number | null;
    prevKm: number;
    prevHours: number;
    prevActivitiesCount: number;
    prevElevation: number;
    prevCalories: number;
    hasPrevData: boolean;
  } | null;
}