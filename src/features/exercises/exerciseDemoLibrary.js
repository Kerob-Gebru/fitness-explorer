const exerciseDemos = [
  {
    id: 'push-up',
    name: 'Push-up',
    aliases: ['push up', 'pushups', 'push ups'],
    exerciseIds: ['demo-001'],
    url: '/exercise-demos/pushups.gif',
    attribution: {
      title: 'Pushups.gif',
      creator: 'Wensceslao',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pushups.gif',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      changes: 'Used unmodified.',
    },
  },
  {
    id: 'jumping-jack',
    name: 'Jumping jack',
    aliases: ['jumping jacks'],
    exerciseIds: [],
    url: '/exercise-demos/jumpingjacks.gif',
    attribution: {
      title: 'Jumpingjacks.gif',
      creator: 'Wensceslao',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jumpingjacks.gif',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      changes: 'Used unmodified.',
    },
  },
  {
    id: 'bodyweight-lunge',
    name: 'Bodyweight lunge',
    aliases: ['body weight lunge', 'forward lunge', 'lunge'],
    exerciseIds: ['demo-016'],
    url: '/exercise-demos/bodyweight-lunge.gif',
    attribution: {
      title: 'Lunge-CDC strength training for older adults.gif',
      creator: 'Centers for Disease Control and Prevention',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lunge-CDC_strength_training_for_older_adults.gif',
      license: 'Public domain',
      licenseUrl: null,
      changes: 'Used unmodified.',
    },
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    aliases: ['pull up', 'pullup', 'pull ups'],
    exerciseIds: ['demo-005'],
    url: '/exercise-demos/pull-up.gif',
    attribution: {
      title: 'Pullup.gif',
      creator: 'Extremistpullup',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pullup.gif',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      changes: 'Used unmodified.',
    },
  },
]

function normalizeExerciseName(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    : ''
}

export function getVerifiedExerciseDemo(exercise) {
  if (!exercise || typeof exercise !== 'object') return null

  const exerciseId = typeof exercise.id === 'string' ? exercise.id : ''
  const exerciseName = normalizeExerciseName(exercise.name)
  return exerciseDemos.find((demo) =>
    demo.exerciseIds.includes(exerciseId) ||
    [demo.name, ...demo.aliases].some((name) => normalizeExerciseName(name) === exerciseName),
  ) ?? null
}
