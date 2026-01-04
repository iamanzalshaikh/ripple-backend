export const BADGES = [
    {
      code: 'first_ride',
      name: 'First Ride',
      description: 'Completed your first ride',
      icon: '🏁',
      rule: { type: 'event' }
    },
    {
      code: 'speedster',
      name: 'Speedster',
      description: 'Reached 100+ km/h',
      icon: '⚡',
      rule: { type: 'speed', min: 100 }
    },
    {
      code: 'long_rider',
      name: 'Long Rider',
      description: 'Ride longer than 60 minutes',
      icon: '🛣️',
      rule: { type: 'duration', min: 3600 }
    },
    {
      code: 'night_owl',
      name: 'Night Owl',
      description: 'Ride between 8PM–6AM',
      icon: '🌙',
      rule: { type: 'night' }
    },
    {
      code: 'early_bird',
      name: 'Early Bird',
      description: 'Ride between 5AM–7AM',
      icon: '🌅',
      rule: { type: 'event' }
    },
    {
      code: 'century_rider',
      name: 'Century Rider',
      description: 'Completed 100 km of riding',
      icon: '💯',
      rule: { type: 'distance', min: 100 }
    },
    {
      code: '500km_club',
      name: '500 KM Club',
      description: 'Completed 500 km of riding',
      icon: '🏍️',
      rule: { type: 'distance', min: 500 }
    },
    {
      code: 'thousand_km_club',
      name: '1000 KM Club',
      description: 'Completed 1000 km of riding',
      icon: '🔥',
      rule: { type: 'distance', min: 1000 }
    }
  ];
  
