export interface Star {
  get_star_ts: number;
  star_index: number;
}

export interface DayProgress {
  [part: string]: Star;
}

export interface CompletionDayLevel {
  [day: string]: DayProgress;
}

export interface Member {
  id: number;
  name: string | null;
  stars: number;
  local_score: number;
  last_star_ts: number;
  completion_day_level: CompletionDayLevel;
}

export interface AoCData {
  owner_id: number;
  event: string;
  members: { [id: string]: Member };
}

export interface LogEntry {
  timestamp: number;
  memberId: number;
  memberName: string;
  day: number;
  part: number;
  timeSinceRelease: string;
}

export const parseData = (json: any): AoCData => {
  // Basic validation could go here
  return json as AoCData;
};

export const calculateLocalScore = (data: AoCData): Member[] => {
  const members = Object.values(data.members);
  const memberCount = members.length;
  
  // Map to store points per member
  const memberPoints: { [id: number]: number } = {};
  members.forEach(m => memberPoints[m.id] = 0);

  // Collect all stars: { day, part, ts, memberId }
  const allStars: { day: number; part: number; ts: number; memberId: number }[] = [];

  members.forEach(member => {
    Object.entries(member.completion_day_level).forEach(([dayStr, dayProgress]) => {
      const day = parseInt(dayStr);
      Object.entries(dayProgress).forEach(([partStr, star]) => {
        const part = parseInt(partStr);
        allStars.push({
          day,
          part,
          ts: star.get_star_ts,
          memberId: member.id
        });
      });
    });
  });

  // Group by star (day, part)
  const starsByChallenge: { [key: string]: typeof allStars } = {};
  allStars.forEach(s => {
    const key = `${s.day}-${s.part}`;
    if (!starsByChallenge[key]) starsByChallenge[key] = [];
    starsByChallenge[key].push(s);
  });

  // Assign points
  Object.values(starsByChallenge).forEach(stars => {
    // Sort by timestamp asc
    stars.sort((a, b) => a.ts - b.ts);
    
    stars.forEach((s, index) => {
      const points = memberCount - index;
      memberPoints[s.memberId] += points;
    });
  });

  // Return members with updated local_score (we don't mutate original if we want to be pure, but here we can just return a copy with updated score)
  // Actually, let's just return the members sorted by this new local score
  return members.map(m => ({
    ...m,
    local_score: memberPoints[m.id]
  })).sort((a, b) => b.local_score - a.local_score);
};

export const calculateStarScore = (data: AoCData): Member[] => {
  const members = Object.values(data.members);
  return members.sort((a, b) => {
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    return a.last_star_ts - b.last_star_ts;
  });
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const getLogData = (data: AoCData): LogEntry[] => {
  const logs: LogEntry[] = [];
  const eventYear = parseInt(data.event);

  Object.values(data.members).forEach(member => {
    Object.entries(member.completion_day_level).forEach(([dayStr, dayProgress]) => {
      const day = parseInt(dayStr);
      Object.entries(dayProgress).forEach(([partStr, star]) => {
        const part = parseInt(partStr);
        
        // Calculate release time: Midnight EST (UTC-5)
        // Date(year, monthIndex, day, hours, ...) in local time? No, use UTC.
        // EST is UTC-5. So 00:00 EST is 05:00 UTC.
        const releaseDate = new Date(Date.UTC(eventYear, 11, day, 5, 0, 0)); // Month is 0-indexed (11 = Dec)
        const starDate = new Date(star.get_star_ts * 1000);
        
        const diff = starDate.getTime() - releaseDate.getTime();
        
        logs.push({
          timestamp: star.get_star_ts,
          memberId: member.id,
          memberName: member.name || `(anonymous user #${member.id})`,
          day,
          part,
          timeSinceRelease: formatDuration(diff)
        });
      });
    });
  });

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};
