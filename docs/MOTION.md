# Motion

## Lottie

Use the `Lottie` component for JSON-based motion clips. Files live under `public/lottie/`.

Example:

```astro
import Lottie from '../components/interactive/Lottie.astro';

<Lottie src="/lottie/example.json" class="w-32 h-32" ariaLabel="Pulsing circle" />
```

## Rive

Use the `Rive` component for `.riv` assets stored in `public/rive/`. By default it plays only when visible and respects reduced motion.

Example:

```astro
import Rive from '../components/interactive/Rive.astro';

<Rive
	src="/rive/example.riv"
	stateMachine="Main"
	inputs={{ isActive: true, progress: 0.75, burst: 'fire' }}
	class="w-40 h-40"
	ariaLabel="Rive demo"
/>
```

Notes:
- Use `mode="always"` if you want continuous playback.
- `inputs` accepts booleans or numbers, and strings like `"fire"` to trigger a state machine input.
