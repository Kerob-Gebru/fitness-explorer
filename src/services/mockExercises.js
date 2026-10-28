// DEMO DATA ONLY: hand-written sample exercises, not from ExerciseDB.
// gifUrl is null on purpose, so the app shows its "no demonstration" fallback.
function make(id, name, bodyPart, target, equipment, secondaryMuscles, instructions) {
  return {
    id: `demo-${String(id).padStart(3, '0')}`,
    name,
    bodyPart,
    target,
    equipment,
    secondaryMuscles,
    instructions,
    gifUrl: null,
    source: 'mock',
  }
}

export const mockExercises = [
  make(1, 'push-up', 'chest', 'pectorals', 'body weight', ['triceps', 'shoulders', 'core'], [
    'Start in a high plank with your hands slightly wider than your shoulders.',
    'Keep your body in one straight line from head to heels.',
    'Lower your chest toward the floor, elbows about 45 degrees from your body.',
    'Press the floor away until your arms are straight again.',
  ]),
  make(2, 'barbell bench press', 'chest', 'pectorals', 'barbell', ['triceps', 'front delts'], [
    'Lie on a flat bench with your eyes under the bar and your feet flat on the floor.',
    'Grip the bar slightly wider than shoulder width and unrack it over your chest.',
    'Lower the bar slowly to the middle of your chest.',
    'Press the bar back up until your arms are fully extended.',
  ]),
  make(3, 'dumbbell fly', 'chest', 'pectorals', 'dumbbell', ['front delts'], [
    'Lie on a flat bench holding a dumbbell in each hand above your chest, palms facing in.',
    'With a slight bend in your elbows, open your arms out to the sides in a wide arc.',
    'Stop when you feel a stretch across your chest.',
    'Bring the dumbbells back together above your chest.',
  ]),
  make(4, 'incline dumbbell press', 'chest', 'pectorals', 'dumbbell', ['triceps', 'front delts'], [
    'Set a bench to a low incline and sit with a dumbbell on each thigh.',
    'Kick the dumbbells up to shoulder height and lie back.',
    'Press both dumbbells up until your arms are straight.',
    'Lower them under control until your elbows are just below the bench.',
  ]),
  make(5, 'pull-up', 'back', 'lats', 'body weight', ['biceps', 'forearms'], [
    'Hang from a bar with an overhand grip, hands a little wider than your shoulders.',
    'Pull your shoulder blades down, then pull your chest toward the bar.',
    'Get your chin above the bar without swinging.',
    'Lower yourself slowly until your arms are straight.',
  ]),
  make(6, 'bent-over barbell row', 'back', 'lats', 'barbell', ['biceps', 'lower back'], [
    'Stand with your feet hip-width apart, holding a barbell with an overhand grip.',
    'Hinge at the hips until your torso is nearly parallel to the floor, back flat.',
    'Pull the bar toward your lower ribs, squeezing your shoulder blades together.',
    'Lower the bar back down with control.',
  ]),
  make(7, 'seated cable row', 'back', 'lats', 'cable', ['biceps', 'rear delts'], [
    'Sit at the cable station with your feet on the platforms and knees slightly bent.',
    'Grab the handle and sit tall with your chest up.',
    'Pull the handle to your stomach, keeping your elbows close to your sides.',
    'Slowly extend your arms and let your shoulder blades spread.',
  ]),
  make(8, 'lat pulldown', 'back', 'lats', 'machine', ['biceps', 'rear delts'], [
    'Sit at the machine and secure your thighs under the pad.',
    'Grip the bar wider than shoulder width.',
    'Pull the bar down to your upper chest while leaning back slightly.',
    'Let the bar rise slowly until your arms are straight.',
  ]),
  make(9, 'overhead barbell press', 'shoulders', 'delts', 'barbell', ['triceps', 'upper chest'], [
    'Stand with the bar resting on your upper chest and your grip just outside your shoulders.',
    'Tighten your core and glutes.',
    'Press the bar straight up, moving your head slightly back and then through.',
    'Lower the bar back to your upper chest.',
  ]),
  make(10, 'dumbbell lateral raise', 'shoulders', 'delts', 'dumbbell', ['traps'], [
    'Stand holding a light dumbbell in each hand at your sides.',
    'With a slight bend in your elbows, raise your arms out to the sides.',
    'Stop when your hands reach shoulder height.',
    'Lower the weights slowly. Avoid swinging your body.',
  ]),
  make(11, 'band face pull', 'shoulders', 'delts', 'band', ['traps', 'rear delts'], [
    'Attach a resistance band at about face height and hold an end in each hand.',
    'Step back until the band is tight and your arms are straight.',
    'Pull the band toward your face, spreading your hands apart.',
    'Return slowly to the start position.',
  ]),
  make(12, 'dumbbell bicep curl', 'arms', 'biceps', 'dumbbell', ['forearms'], [
    'Stand tall with a dumbbell in each hand, palms facing forward.',
    'Keeping your elbows by your sides, curl the weights toward your shoulders.',
    'Squeeze at the top for a moment.',
    'Lower the weights slowly until your arms are straight.',
  ]),
  make(13, 'triceps dip', 'arms', 'triceps', 'body weight', ['chest', 'front delts'], [
    'Sit on the edge of a bench and place your hands next to your hips.',
    'Slide your hips off the bench with your legs out in front of you.',
    'Bend your elbows to lower yourself until they reach about 90 degrees.',
    'Press back up until your arms are straight.',
  ]),
  make(14, 'cable triceps pushdown', 'arms', 'triceps', 'cable', ['forearms'], [
    'Stand facing a high cable with a straight bar or rope attached.',
    'Keep your elbows pinned to your sides.',
    'Push the handle down until your arms are fully straight.',
    'Let it rise slowly until your forearms are just past parallel with the floor.',
  ]),
  make(15, 'barbell back squat', 'legs', 'quads', 'barbell', ['glutes', 'hamstrings', 'core'], [
    'Set the bar on your upper back and stand with your feet shoulder-width apart.',
    'Brace your core and push your hips back and down, keeping your chest up.',
    'Squat until your thighs are at least parallel to the floor.',
    'Drive through your whole foot to stand back up.',
  ]),
  make(16, 'bodyweight lunge', 'legs', 'quads', 'body weight', ['glutes', 'hamstrings'], [
    'Stand tall with your feet hip-width apart.',
    'Step forward with one leg and lower until both knees are bent about 90 degrees.',
    'Keep your front knee above your ankle and your torso upright.',
    'Push through your front foot to return to standing, then switch legs.',
  ]),
  make(17, 'romanian deadlift', 'legs', 'hamstrings', 'barbell', ['glutes', 'lower back'], [
    'Stand holding a barbell in front of your thighs, feet hip-width apart.',
    'Push your hips back with a soft bend in your knees, sliding the bar down your legs.',
    'Stop when you feel a strong stretch in your hamstrings, keeping your back flat.',
    'Drive your hips forward to stand tall again.',
  ]),
  make(18, 'glute bridge', 'legs', 'glutes', 'body weight', ['hamstrings', 'core'], [
    'Lie on your back with your knees bent and feet flat on the floor.',
    'Press through your heels and lift your hips until your body forms a straight line.',
    'Squeeze your glutes at the top for a second.',
    'Lower your hips slowly to the floor.',
  ]),
  make(19, 'standing calf raise', 'legs', 'calves', 'body weight', ['ankles'], [
    'Stand with your feet hip-width apart, ideally with the balls of your feet on a step.',
    'Rise up onto your toes as high as you can.',
    'Pause briefly at the top.',
    'Lower your heels slowly below the step for a full stretch.',
  ]),
  make(20, 'kettlebell swing', 'legs', 'glutes', 'kettlebell', ['hamstrings', 'core', 'shoulders'], [
    'Stand with your feet wider than your shoulders, the kettlebell on the floor in front of you.',
    'Hinge at the hips, grab the handle, and hike the bell back between your legs.',
    'Snap your hips forward to swing the bell up to chest height.',
    'Let it fall back and hinge again, keeping your back flat.',
  ]),
  make(21, 'plank', 'core', 'abs', 'body weight', ['shoulders', 'glutes'], [
    'Rest on your forearms and toes, elbows directly under your shoulders.',
    'Squeeze your glutes and tighten your stomach so your body is a straight line.',
    'Keep your neck relaxed and look at the floor.',
    'Hold for the planned time, breathing steadily.',
  ]),
  make(22, 'bicycle crunch', 'core', 'abs', 'body weight', ['obliques'], [
    'Lie on your back with your hands behind your head and legs lifted.',
    'Bring one knee toward your chest while rotating the opposite elbow toward it.',
    'Switch sides in a smooth pedaling motion.',
    'Keep your lower back pressed into the floor.',
  ]),
  make(23, 'hanging leg raise', 'core', 'abs', 'body weight', ['hip flexors', 'forearms'], [
    'Hang from a pull-up bar with your arms straight.',
    'Keeping your legs together, raise them in front of you as high as you can.',
    'Pause at the top without swinging.',
    'Lower your legs slowly back to the start.',
  ]),
  make(24, 'jumping jacks', 'cardio', 'cardiovascular system', 'body weight', ['calves', 'shoulders'], [
    'Stand with your feet together and your arms at your sides.',
    'Jump your feet apart while raising your arms overhead.',
    'Jump back to the start position.',
    'Repeat at a steady pace, landing softly on the balls of your feet.',
  ]),
]
