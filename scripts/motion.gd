class_name Motion
extends RefCounted
## Живость фигурок: работяги двигаются как фишки настольной игры.
## Только сдвиг, качание и сжатие готовой картинки; игровая точка (position) не трогается.
## Числа — data/look.json, раздел motion.

var cfg: Dictionary


func _init(c: Dictionary) -> void:
	cfg = c


## Запомнить исходный вид картинки: от него считаются все движения.
func attach(s: Sprite2D) -> void:
	s.set_meta("base_offset", s.offset)
	s.set_meta("base_scale", s.scale)
	s.set_meta("phase", 0.0)
	s.set_meta("kick", Vector2.ZERO)
	s.set_meta("pulse", 0.0)


## Кадры позы (вязаный воин): pics — картинки кадров, pose — порядок из look.json.
## Бег меняет шаги по пройденному пути, удар — замах и укол; без кадров движется одна картинка.
func frames(s: Sprite2D, pics: Array, pose: Dictionary) -> void:
	s.set_meta("frames", pics)
	s.set_meta("pose", pose)
	s.set_meta("dist", 0.0)
	s.set_meta("blow", -1.0)


func _pose(s: Sprite2D, moved: float, gait: String) -> void:
	if not s.has_meta("frames"):
		return
	var p: Dictionary = s.get_meta("pose")
	var blow: float = s.get_meta("blow")
	var i: int = p.stand
	if blow >= 0.0:
		i = p.windup if blow < p.blow[0] else (p.thrust if blow < p.blow[1] else p.stand)
	elif moved > 0.01:
		var d: float = s.get_meta("dist") + moved
		s.set_meta("dist", d)
		# С грузом свой шаг (носильщик с полным мешком), иначе обычный.
		var run: Array = p.get("runs", {}).get(gait, p.run)
		i = run[int(d / p.stride) % run.size()]
	s.texture = s.get_meta("frames")[i]


## Шаг вприпрыжку: прыжок, приземление со сплющиванием, покачивание. moved — путь за кадр.
func walk(s: Sprite2D, gait: String, moved: float, dt: float) -> void:
	_pose(s, 0.0 if gait == "fidget" else moved, gait)
	var g: Dictionary = cfg.gait[gait]
	var ph: float = s.get_meta("phase")
	ph = ph + dt * g.rate if moved > 0.01 else move_toward(ph, roundf(ph), dt * 4.0)
	s.set_meta("phase", ph)
	var up := absf(sin(ph * PI))
	var sq: float = g.squash * pow(1.0 - up, 8) + s.get_meta("pulse")
	var base: Vector2 = s.get_meta("base_scale")
	s.scale = base * Vector2(1.0 + sq, 1.0 - sq)
	s.rotation = deg_to_rad(g.sway) * cos(ph * PI) * signf(up)
	var shift: Vector2 = Vector2(0, -g.hop * up) + s.get_meta("kick")
	s.offset = s.get_meta("base_offset") + shift / base.x


## Удар: замах назад, выпад к цели; цель отлетает на шаг и сплющивается.
func strike(attacker: Sprite2D, target: Sprite2D, dir: Vector2) -> void:
	var k: Dictionary = cfg.strike
	if attacker != null and attacker.has_meta("kick"):
		# Нарисован лицом влево: бьёт вправо — разворачивается к цели.
		if absf(dir.x) > 0.01:
			attacker.flip_h = dir.x > 0
		if attacker.has_meta("frames"):
			var b := attacker.create_tween()
			b.tween_method(func(v): attacker.set_meta("blow", v), 0.0, 1.0, k.time)
			b.tween_callback(func(): attacker.set_meta("blow", -1.0))
		var t := attacker.create_tween()
		t.tween_method(_kick.bind(attacker), Vector2.ZERO, -dir * k.windup, k.time * 0.35)
		t.tween_method(_kick.bind(attacker), -dir * k.windup, dir * k.lunge, k.time * 0.2)
		t.tween_method(_kick.bind(attacker), dir * k.lunge, Vector2.ZERO, k.time * 0.45)
	if target != null and target.has_meta("kick"):
		var t := target.create_tween().set_parallel()
		t.tween_method(_kick.bind(target), dir * k.knock, Vector2.ZERO, k.time)
		t.tween_method(_pulse.bind(target), k.squash, 0.0, k.time)


func _kick(v: Vector2, s: Sprite2D) -> void:
	s.set_meta("kick", v)


func _pulse(v: float, s: Sprite2D) -> void:
	s.set_meta("pulse", v)


## Столкновение: оба отскакивают друг от друга.
func clash(a: Sprite2D, b: Sprite2D, dir: Vector2) -> void:
	var k: float = cfg.clash.bounce
	for pair in [[a, -dir], [b, dir]]:
		var s: Sprite2D = pair[0]
		if s != null and s.has_meta("kick"):
			var t := s.create_tween().set_parallel()
			t.tween_method(_kick.bind(s), pair[1] * k, Vector2.ZERO, cfg.clash.time)
			t.tween_method(_pulse.bind(s), -cfg.strike.squash, 0.0, cfg.clash.time)


## Победитель дважды подпрыгивает; воин выскакивает из коробка — тоже прыжок, из точки from.
func hop(s: Sprite2D, times: int, from := Vector2.ZERO) -> void:
	if s == null or not s.has_meta("kick"):
		return
	var h: float = cfg.cheer.hop
	var t := s.create_tween()
	t.tween_method(_kick.bind(s), from, from.lerp(Vector2.ZERO, 0.5) + Vector2(0, -h), cfg.cheer.time / 2)
	t.tween_method(_kick.bind(s), from.lerp(Vector2.ZERO, 0.5) + Vector2(0, -h), Vector2.ZERO, cfg.cheer.time / 2)
	for i in times - 1:
		t.tween_method(_kick.bind(s), Vector2.ZERO, Vector2(0, -h), cfg.cheer.time / 2)
		t.tween_method(_kick.bind(s), Vector2(0, -h), Vector2.ZERO, cfg.cheer.time / 2)
